---
name: issues
description: 'Create a GitHub milestone and issues from a plan in docs/plans/: one milestone for the whole plan, one issue per phase with its tasks as a checklist. Takes the plan file path or feature name; uses the gh CLI.'
argument-hint: '<plan path or feature name>'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, AskUserQuestion, Bash(gh *)
---

# Create GitHub backlog from a plan

A plan (written with `/plan-phases`) splits a feature into phases of tasks. This skill turns it into a GitHub backlog: the whole plan becomes one milestone, and each phase becomes one issue in it, with the phase's tasks as a checklist in the body. A phase is the unit someone picks up and ships, so it's the unit tracked on GitHub; its tasks are steps inside that issue, not issues of their own.

Input: `$ARGUMENTS` is a plan file path (`docs/plans/meeting-file-upload.md`) or a feature name (`Meeting File Upload`). If it's empty, list the files in `docs/plans/` and ask which one to use.

## Workflow

1. **Find the plan.** A path is used as is. A feature name is converted to kebab-case (lowercase, words joined by `-`, no other punctuation) and looked up as `docs/plans/<kebab-name>.md`. If there's no such file, show what's in `docs/plans/` and ask.
2. **Read the plan,** all of it: the feature name from its `# Plan: <Feature Name>` heading, the PRD link at the top, and for each phase its number, name, goal, "Affects" line, tasks (with their checkbox state) and "When done" criterion.
3. **Check `gh`.** Run `gh auth status` and `gh repo view --json nameWithOwner,defaultBranchRef`. If `gh` isn't logged in or the repo has no GitHub remote, stop and tell the user what to fix (`! gh auth login` runs it in this session).
4. **Look at what already exists,** so running the skill twice doesn't duplicate the backlog:
   - milestones: `gh api 'repos/{owner}/{repo}/milestones?state=all&per_page=100'`
   - issues: `gh issue list --state all --limit 500 --json number,title,milestone`
   - labels: `gh label list --limit 200 --json name`

   A milestone with the feature name as its title is reused (reopen it if it's closed and there are phases left to create). An issue with the same title in that milestone is skipped.

5. **Confirm before creating anything.** Creating milestones, labels and issues is visible to everyone on the repo and tedious to undo. Show the user a summary: the repo, the milestone (new or reused), each phase issue with its number of tasks, which issues already exist and will be skipped, the labels that will be created, and whether the plan and PRD files are on the default branch yet (the issue links point there and 404 until they're pushed). Then ask with `AskUserQuestion` whether to go ahead.
6. **Create the labels** that are missing. Use one label per area named in the phases' "Affects" lines (`backend`, `frontend`, `database`, `contracts`, …): `gh label create "<name>"`.
7. **Create one milestone for the plan,** titled with the feature name, with a short description linking the plan and the PRD:

   ```bash
   gh api 'repos/{owner}/{repo}/milestones' -f title='<Feature Name>' -f description='Plan: <plan link> · PRD: <PRD link>'
   ```

8. **Create an issue per phase,** in phase order, in the milestone and with that phase's area labels. Pass the body on stdin with a quoted heredoc, so quotes, backticks and `$` in the text survive the shell unchanged:

   ```bash
   gh issue create --title 'Phase N: <phase name>' --label 'backend' --label 'database' --milestone '<Feature Name>' --body-file - <<'EOF'
   <body>
   EOF
   ```

   Skip a phase whose tasks are all checked off (`- [x]`) in the plan: it's done and doesn't belong in the backlog.

9. **Report back** with the milestone and the issue number created for each phase, what was skipped as already existing or done, and any command that failed with its error.

## Issue format

- **Title:** `Phase N: <phase name>`, exactly as in the plan. The milestone already names the feature, so the title doesn't repeat it.
- **Body:** everything someone needs to pick up the phase without opening the plan:

  ```markdown
  **Goal:** <the phase goal>

  **Affects:** <the phase's "Affects" line>

  ## Tasks

  - [ ] <task text, exactly as written in the plan>
  - [x] <a task already checked off in the plan stays checked>

  ## Done when

  <the phase's "When done" criterion>

  Plan: [docs/plans/<kebab-name>.md](<link>) · PRD: [docs/prds/<kebab-name>.md](<link>)
  ```

  The tasks are a GitHub task list, so progress shows on the issue and in the milestone. Link the files as `https://github.com/<owner>/<repo>/blob/<default branch>/<path>` (both from `gh repo view --json nameWithOwner,defaultBranchRef`), so the links work from GitHub.

Don't add requirements, estimates or assignees that aren't in the plan; the issue mirrors the plan, and the plan stays the source of truth.
