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
// Commands are run without a shell (execFileSync, spawn) so prompts and the milestone title are
// passed as single arguments and never need shell quoting.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
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

const stop = (message) => {
  console.log(`⛔ ${message} Ralph stops.`);
  printTotal();
  process.exit(1);
};

// Token usage, from the `result` event of each run. `modelUsage` has one entry per model the
// run used, subagents included (e.g. the reviewers `/code-review` starts), so it's summed.
const emptyUsage = () => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 });

const addUsage = (to, from) => {
  for (const key of Object.keys(to)) to[key] += from[key];
  return to;
};

const usageOf = (result) => {
  const usage = emptyUsage();
  const models = Object.values(result.modelUsage ?? {});
  if (models.length > 0) {
    for (const model of models) {
      usage.input += model.inputTokens ?? 0;
      usage.output += model.outputTokens ?? 0;
      usage.cacheRead += model.cacheReadInputTokens ?? 0;
      usage.cacheWrite += model.cacheCreationInputTokens ?? 0;
    }
  } else {
    usage.input = result.usage?.input_tokens ?? 0;
    usage.output = result.usage?.output_tokens ?? 0;
    usage.cacheRead = result.usage?.cache_read_input_tokens ?? 0;
    usage.cacheWrite = result.usage?.cache_creation_input_tokens ?? 0;
  }
  usage.cost = result.total_cost_usd ?? 0;
  return usage;
};

const formatTokens = (count) => {
  if (count >= 1e6) return `${(count / 1e6).toFixed(2)}M`;
  if (count >= 1e3) return `${(count / 1e3).toFixed(1)}k`;
  return String(count);
};

// Input counts every token sent to the model; most of it is usually read from the prompt
// cache, which is much cheaper, so the cache part is shown separately.
const formatUsage = (usage) => {
  const input = usage.input + usage.cacheRead + usage.cacheWrite;
  return [
    `${formatTokens(input)} in (${formatTokens(usage.cacheRead)} cache read,`,
    `${formatTokens(usage.cacheWrite)} cache write)`,
    `· ${formatTokens(usage.output)} out · $${usage.cost.toFixed(2)}`,
  ].join(' ');
};

// Everything this `pnpm ralph` run spent, printed when it ends or stops.
const totalUsage = emptyUsage();

function printTotal() {
  if (totalUsage.cost > 0 || totalUsage.output > 0) {
    console.log(`📊 Total: ${formatUsage(totalUsage)}`);
  }
}

// Runs `claude -p` and prints its progress as it goes. With plain text output `-p` prints only
// the final answer when the run ends, so it runs with `stream-json` (one JSON event per line)
// and prints Claude's text and a short line per tool call. Events of subagents (e.g. the
// reviewers `/code-review` starts) are skipped to keep the output readable. Stops the loop if
// the run doesn't end with success (e.g. it hit `maxTurns`). Resolves with the run's token usage.
const runClaude = (prompt, model) =>
  new Promise((resolve) => {
    const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose'];
    if (model) args.push('--model', model);
    if (config.maxTurns) args.push('--max-turns', String(config.maxTurns));
    // Nobody is there to answer a permission prompt in `-p`, so anything the mode would ask
    // about is denied. `auto` lets the runs use gh, git and the tests on their own.
    if (config.permissionMode) args.push('--permission-mode', config.permissionMode);

    const startedAt = Date.now();
    const child = spawn('claude', args, { cwd: projectDir, stdio: ['ignore', 'pipe', 'inherit'] });
    let result = null;

    createInterface({ input: child.stdout }).on('line', (line) => {
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        console.log(line);
        return;
      }
      if (event.type === 'result') result = event;
      if (event.type !== 'assistant' || event.parent_tool_use_id) return;
      for (const block of event.message?.content ?? []) {
        if (block.type === 'text' && block.text.trim()) {
          console.log(indent(`💬 ${block.text.trim()}`));
        } else if (block.type === 'tool_use') {
          console.log(`  🔧 ${describeTool(block.name, block.input ?? {})}`);
        }
      }
    });

    child.on('error', (error) => stop(`Couldn't start claude: ${error.message}.`));
    child.on('close', (code) => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      const time = `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      const turns = result ? `, ${result.num_turns} turns` : '';
      const usage = result ? usageOf(result) : emptyUsage();
      addUsage(totalUsage, usage);

      // Tool calls blocked by the permission mode: the run can look fine and still have
      // skipped an edit or a command.
      for (const denial of result?.permission_denials ?? []) {
        const tool = denial.tool_name ?? 'tool';
        console.log(`  🚫 Permission denied: ${describeTool(tool, denial.tool_input ?? {})}`);
      }

      if (!result || result.is_error || result.subtype !== 'success' || code !== 0) {
        const reason = result?.subtype ?? `exit code ${code}`;
        stop(`The claude run failed (${reason}) after ${time}${turns}.`);
      }
      console.log(`  ✔ Done in ${time}${turns} · ${formatUsage(usage)}`);
      resolve(usage);
    });
  });

const indent = (text) => text.replace(/^/gm, '  ');

const relative = (file) => (file ? path.relative(projectDir, file) || file : '');

const truncate = (text, max = 120) => {
  const line = String(text).split('\n')[0];
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

// One line per tool call: the tool and its main argument.
function describeTool(name, input) {
  switch (name) {
    case 'Bash':
    case 'PowerShell':
      return `${name}: ${truncate(input.command ?? '')}`;
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return `${name}: ${relative(input.file_path ?? input.notebook_path)}`;
    case 'Grep':
    case 'Glob':
      return `${name}: ${truncate(input.pattern ?? '')}`;
    case 'Skill':
      return `Skill: ${input.skill ?? ''}${input.args ? ` ${truncate(input.args)}` : ''}`;
    case 'Agent':
    case 'Task':
      return `${name}: ${truncate(input.description ?? '')}`;
    default:
      return name;
  }
}

// Stops the loop if the last run gave up.
const checkFailed = (message) => {
  if (!existsSync(failedMarker)) return;
  rmSync(failedMarker);
  stop(`${message} (see the comment on the issue).`);
};

// `gh issue list` returns the newest issues first; the plan's phases are created in order, so
// sorting by number gives phase 1 first.
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
      '--limit',
      '500',
    ]),
  )
    // GitHub's issue list lags behind for a few seconds: right after `gh issue close` it can
    // still return the issue as open, and the loop would take it again.
    .filter((issue) => !closedIssues.has(issue.number))
    .sort((a, b) => a.number - b.number);

const closedIssues = new Set();

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
  // The issue is named in the prompt: the agent must not pick one itself, or the script would
  // review, commit and close the changes under another issue's number.
  const prompt = config.prompt
    .replaceAll('{issue}', String(issue.number))
    .replaceAll('{title}', issue.title)
    .replaceAll('{milestone}', config.milestone)
    .replaceAll('{branch}', config.branch);
  const issueUsage = await runClaude(prompt, config.model);

  checkFailed(`Issue #${issue.number} failed`);
  if (isTreeClean()) {
    stop(`Issue #${issue.number} run left no changes.`);
  }
  addUsage(issueUsage, await reviewAndCloseIssue(issue.number));
  console.log(`📊 Issue #${issue.number}: ${formatUsage(issueUsage)}`);
}

await finishMilestone();
printTotal();

// Review the issue's uncommitted changes, commit them, push the branch and close the issue.
// Returns the review run's token usage.
async function reviewAndCloseIssue(issue) {
  // Stage everything so new files are part of the uncommitted diff the review sees.
  run('git', ['add', '-A']);

  // Without a target `/code-review` reviews the branch's commits ahead of its upstream plus the
  // uncommitted changes. The branch is pushed after every issue (below), so nothing is ahead
  // and only this issue's changes are reviewed. Before the first push there is no upstream and
  // the review compares against `main`, which the branch was just created from.
  console.log(`🔍 Code review of issue #${issue}`);
  const usage = await runClaude(
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
  closedIssues.add(issue);
  console.log(`✅ Issue #${issue} closed.`);
  return usage;
}

// Open the PR for the feature branch and review it.
async function finishMilestone() {
  const existing = JSON.parse(
    run('gh', ['pr', 'list', '--head', config.branch, '--state', 'all', '--json', 'url']),
  );
  if (existing.length > 0) {
    console.log(`✅ Milestone complete. PR already exists: ${existing[0].url}`);
    return;
  }

  console.log('✅ Milestone complete. Creating PR.');
  await runClaude(
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
  await reviewPullRequest(pr);
}

// Final review of the whole feature, posted as comments on the PR.
async function reviewPullRequest(pr) {
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
  await runClaude(
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
