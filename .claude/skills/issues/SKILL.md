---
name: issues
description: 'Create GitHub milestones and issues from a plan in docs/plans/: one milestone per phase, one issue per task. Takes the plan file path or feature name; uses the gh CLI.'
argument-hint: '<plan path or feature name>'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, AskUserQuestion, Bash(gh *)
---

# Create GitHub backlog from a plan

A plan (written with `/plan-phases`) splits a feature into phases of tasks. This skill turns it into a GitHub backlog: each phase becomes a milestone, each task an issue in that milestone, so the work can be assigned and tracked on GitHub.

Input: `$ARGUMENTS` is a plan file path (`docs/plans/meeting-file-upload.md`) or a feature name (`Meeting File Upload`). If it's empty, list the files in `docs/plans/` and ask which one to use.

## Workflow

1. **Find the plan.** A path is used as is. A feature name is converted to kebab-case (lowercase, words joined by `-`, no other punctuation) and looked up as `docs/plans/<kebab-name>.md`. If there's no such file, show what's in `docs/plans/` and ask.
2. **Read the plan,** all of it: for each phase its number, name, goal, "Affects" line, tasks and "When done" criterion, plus the PRD link at the top.
3. **Check `gh`.** Run `gh auth status` and `gh repo view --json nameWithOwner`. If `gh` isn't logged in or the repo has no GitHub remote, stop and tell the user what to fix (`! gh auth login` runs it in this session).
4. **Look at what already exists,** so running the skill twice doesn't duplicate the backlog:
   - milestones: `gh api 'repos/{owner}/{repo}/milestones?state=all&per_page=100'`
   - issues: `gh issue list --state all --limit 500 --json number,title,milestone`
   - labels: `gh label list --limit 200 --json name`

   A milestone with the same title is reused. An issue with the same title in the same milestone is skipped.
5. **Confirm before creating anything.** Creating milestones, labels and issues is visible to everyone on the repo and tedious to undo. Show the user a summary: the repo, each milestone with its issue count, which ones already exist and will be reused or skipped, and the labels that will be created. Then ask with `AskUserQuestion` whether to go ahead.
6. **Create the labels** that are missing. Use one label per area named in the phases' "Affects" lines (`backend`, `frontend`, `database`, `contracts`, …): `gh label create "<name>"`.
7. **Create a milestone per phase,** in phase order, titled `Phase N: <phase name>` with the phase goal and its "When done" criterion as the description:

   ```bash
   gh api 'repos/{owner}/{repo}/milestones' -f title='Phase N: <name>' -f description='<goal> When done: <criterion>'
   ```

8. **Create an issue per task,** in plan order, in the phase's milestone and with the phase's area labels. Pass the body on stdin with a quoted heredoc, so quotes, backticks and `$` in the text survive the shell unchanged:

   ```bash
   gh issue create --title '<title>' --label 'backend' --label 'database' --milestone 'Phase N: <name>' --body-file - <<'EOF'
   <body>
   EOF
   ```

   Skip tasks already checked off (`- [x]`) in the plan: they're done and don't belong in the backlog.

9. **Report back** with the milestones and the issue numbers created per milestone, what was skipped as already existing, and any command that failed with its error.

## Issue format

- **Title:** a short summary of the task in the plan's own words, under about 80 characters, phrased as an action (`Add chunked upload endpoints under /meeting/files`). Plan tasks are often full sentences with details, and GitHub rejects titles over 256 characters, so the details go in the body rather than the title.
- **Body:** a description of the task that someone can pick up without opening the plan:

  ```markdown
  <the full task text, without the checkbox, exactly as written in the plan>

  **Phase N: <phase name>** — <phase goal>

  **Phase is done when:** <the phase's "When done" criterion>

  Plan: [docs/plans/<kebab-name>.md](<link>) · PRD: [docs/prds/<kebab-name>.md](<link>)
  ```

  Link the files as `https://github.com/<owner>/<repo>/blob/<default branch>/<path>` (both from `gh repo view --json nameWithOwner,defaultBranchRef`), so the links work from GitHub.

Don't add requirements, estimates or assignees that aren't in the plan; the issue mirrors the plan, and the plan stays the source of truth.
