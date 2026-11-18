// Ralph loop: works through the open issues of the milestone in `.claude/ralph.config.json`,
// one fresh `claude -p` run per issue, then opens a PR and reviews it. Run it by hand from the
// repo root with `pnpm ralph`.
//
// For each issue:
//   1. `claude -p` on `model` implements it and leaves the changes uncommitted (.claude/ralph.md).
//   2. `claude -p` on `codeReviewModel` reviews the uncommitted changes with
//      `/code-review --fix` and commits them.
//   3. The script pushes the branch and closes the issue, so an issue is closed only after its
//      review.
// When no open issues are left: `claude -p` on `prModel` opens the PR, then `claude -p` on
// `finalCodeReviewModel` reviews it (architecture, security, PRD) and posts PR comments.
//
// Everything runs from this one process in a plain loop, not from a Stop hook: a hook would run
// the rest of the chain inside the previous `claude` session, under the hook timeout, with its
// output captured and every earlier session left waiting.
//
// The loop stops on the first problem and leaves the changes in the working tree to look at.
// Commands are run with execFileSync (no shell) so prompts and the milestone title are passed
// as single arguments and never need shell quoting.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = fileURLToPath(new URL('..', import.meta.url));
const config = JSON.parse(
  readFileSync(path.join(projectDir, '.claude', 'ralph.config.json'), 'utf8'),
);

// Written by a run that gave up (tests still failing after 5 attempts, see .claude/ralph.md);
// gitignored. The agent also explains the failure in a comment on the issue.
const failedMarker = path.join(projectDir, '.claude', 'ralph.failed');

const run = (cmd, args, options = {}) =>
  execFileSync(cmd, args, { cwd: projectDir, encoding: 'utf8', ...options });

const isTreeClean = () => run('git', ['status', '--porcelain']).trim() === '';

const runClaude = (prompt, model) => {
  const args = ['-p', prompt];
  if (model) args.push('--model', model);
  if (config.maxTurns) args.push('--max-turns', String(config.maxTurns));
  run('claude', args, { stdio: 'inherit' });
};

const stop = (message) => {
  console.log(`⛔ ${message} Ralph stops.`);
  process.exit(1);
};

// Stops the loop if the last run gave up.
const checkFailed = (message) => {
  if (!existsSync(failedMarker)) return;
  rmSync(failedMarker);
  stop(`${message} (see the comment on the issue).`);
};

const openIssues = () =>
  JSON.parse(
    run('gh', [
      'issue',
      'list',
      '--milestone',
      config.milestone,
      '--state',
      'open',
      '--json',
      'number,title',
    ]),
  );

// A marker left from an earlier, interrupted run would stop the first issue for no reason.
rmSync(failedMarker, { force: true });

let iteration = 0;
for (let issues = openIssues(); issues.length > 0; issues = openIssues()) {
  if (iteration >= config.maxIterations) {
    stop(`Iteration limit reached (${config.maxIterations}).`);
  }
  // The review covers all uncommitted changes, so the issue must start from a clean tree, or
  // unrelated changes would be reviewed and committed with it.
  if (!isTreeClean()) {
    stop('The working tree has uncommitted changes. Commit or stash them first.');
  }

  iteration++;
  const issue = issues[0];
  console.log(
    `🔄 Iteration ${iteration}/${config.maxIterations} — Issue #${issue.number}: ${issue.title}`,
  );
  let prompt = config.prompt.replaceAll('{milestone}', config.milestone);
  prompt = prompt.replaceAll('{branch}', config.branch);
  runClaude(prompt, config.model);

  checkFailed(`Issue #${issue.number} failed`);
  if (isTreeClean()) {
    stop(`Issue #${issue.number} run left no changes.`);
  }
  reviewAndCloseIssue(issue.number);
}

finishMilestone();

// Review the issue's uncommitted changes, commit them, push the branch and close the issue.
function reviewAndCloseIssue(issue) {
  // Stage everything so new files are part of the uncommitted diff the review sees.
  run('git', ['add', '-A']);

  // Without a target `/code-review` reviews the branch's commits ahead of its upstream plus the
  // uncommitted changes. The branch is pushed after every issue (below), so nothing is ahead
  // and only this issue's changes are reviewed. Before the first push there is no upstream and
  // the review compares against `main`, which the branch was just created from.
  console.log(`🔍 Code review of issue #${issue}`);
  runClaude(
    [
      `Issue #${issue} is implemented on branch "${config.branch}" and its changes are staged,`,
      'not committed. Run the code-review skill with the arguments "medium --fix" (no target),',
      'so it reviews the uncommitted changes and applies the fixes.',
      'If the review changed files, run the tests again and fix what fails (at most 5 attempts).',
      `If they still fail, explain the error in a comment on issue #${issue},`,
      'create the file .claude/ralph.failed and stop without committing.',
      `Otherwise commit all changes with the git-commit skill, referencing issue #${issue}.`,
      "Don't push, create branches, close issues or open a pull request.",
    ].join(' '),
    config.codeReviewModel ?? config.model,
  );

  checkFailed(`Tests fail after the code review of issue #${issue}`);
  if (!isTreeClean()) {
    stop(`The review run of issue #${issue} left uncommitted changes.`);
  }

  run('git', ['push', '-u', 'origin', config.branch], { stdio: 'inherit' });
  const sha = run('git', ['rev-parse', '--short', 'HEAD']).trim();
  run('gh', ['issue', 'close', String(issue), '--comment', `Implemented and reviewed in ${sha}.`]);
  console.log(`✅ Issue #${issue} closed.`);
}

// Open the PR for the feature branch and review it.
function finishMilestone() {
  const existing = JSON.parse(
    run('gh', ['pr', 'list', '--head', config.branch, '--state', 'all', '--json', 'url']),
  );
  if (existing.length > 0) {
    console.log(`✅ Milestone complete. PR already exists: ${existing[0].url}`);
    return;
  }

  console.log('✅ Milestone complete. Creating PR.');
  runClaude(
    [
      `All issues in milestone "${config.milestone}" are closed.`,
      `Use the git-commit skill to commit any uncommitted changes on branch "${config.branch}",`,
      `push the branch, then open a pull request into main with \`gh pr create\`:`,
      `title "feat: ${config.milestone}", and a body summarizing the changes`,
      `and listing the closed issues of the milestone.`,
    ].join(' '),
    // Committing and opening a PR is routine work; a cheaper model is enough.
    config.prModel ?? config.model,
  );

  // Look the PR up instead of parsing the run's output: the agent's reply has no fixed format.
  const [pr] = JSON.parse(
    run('gh', ['pr', 'list', '--head', config.branch, '--state', 'open', '--json', 'number,url']),
  );
  if (!pr) stop(`No open PR for branch "${config.branch}".`);
  console.log(`🔗 PR: ${pr.url}`);
  reviewPullRequest(pr);
}

// Final review of the whole feature, posted as comments on the PR.
function reviewPullRequest(pr) {
  const files = run('gh', ['pr', 'diff', pr.url, '--name-only']).split('\n').filter(Boolean);
  // Decided here, not by the agent, so the FSD check isn't skipped or run for API-only PRs.
  const touchesWeb = files.some((file) => file.startsWith('apps/web/'));

  // PRDs are named after the feature in kebab case (see CLAUDE.md → docs/prds).
  const feature = config.milestone.trim().toLowerCase().replace(/\s+/g, '-');
  const prdPath = `docs/prds/${feature}.md`;
  const prd = existsSync(path.join(projectDir, prdPath))
    ? `the PRD in ${prdPath}`
    : `the PRD for "${config.milestone}" in docs/prds/ (find the matching file)`;

  const checks = [
    touchesWeb
      ? '1. Architecture. The PR changes the frontend (apps/web): load the feature-sliced-design skill and check the apps/web changes against FSD (layers, slices, public APIs, import boundaries); for apps/api check the NestJS module structure and the conventions in the CLAUDE.md files.'
      : '1. Architecture: check the changes against the project structure and the conventions in the CLAUDE.md files.',
    '2. Security: authorization and access checks, input validation, injection, secrets, data leaks in responses and logs, file handling.',
    `3. Compliance with ${prd}: every requirement is implemented, nothing outside its scope was added.`,
  ];

  console.log(`🔍 Final review of ${pr.url}${touchesWeb ? ' (with FSD)' : ''}`);
  runClaude(
    [
      `Review pull request ${pr.url} (branch "${config.branch}", milestone "${config.milestone}").`,
      'Read the diff with `gh pr diff` and the changed files in full where context is needed.',
      'Check:',
      ...checks,
      'Post every finding as an inline comment on the line it is about, with',
      '`gh api repos/{owner}/{repo}/pulls/<number>/comments`, saying the problem, why it matters',
      'and how to fix it. Then post one summary with `gh pr review --comment`: the result for each',
      'of the three checks and the most important findings; if nothing was found, say so.',
      "Don't change code, commit, approve, request changes or merge: only comment.",
    ].join('\n'),
    config.finalCodeReviewModel ?? config.model,
  );
}
