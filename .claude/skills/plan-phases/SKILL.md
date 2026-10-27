---
name: plan-phases
description: 'Break a PRD from docs/prds/ into independent implementation phases and save the plan to docs/plans/<feature-name>.md. Takes the PRD file path or feature name; asks questions first when the PRD is incomplete.'
argument-hint: '<PRD path or feature name>'
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
---

# Create implementation plan

A plan turns a PRD (written with `/prd`) into an ordered list of phases that someone can build one at a time. Each phase ships something that works, so the team can stop after any phase and still have a usable product. The PRD says **what** and **why**; the plan says **in which order** and **what each step consists of**, at the level of tasks, not code.

Input: `$ARGUMENTS` is a PRD file path (`docs/prds/meeting-file-upload.md`) or a feature name (`Meeting File Upload`). If it's empty, list the files in `docs/prds/` and ask which one to plan.

## Workflow

1. **Find the PRD.** A path is used as is. A feature name is converted to kebab-case (lowercase, words joined by `-`, no other punctuation) and looked up as `docs/prds/<kebab-name>.md`. If there's no such file, show what's in `docs/prds/` and ask; don't plan from memory or from the conversation.
2. **Work out the plan path:** `docs/plans/<kebab-name>.md` at the repository root, with the same English kebab-case name as the PRD file, so the two are easy to pair up. A feature name in another language is translated to English first. Writing the file creates `docs/plans/` if it's missing.
3. **Check for an existing plan.** If the file already exists, read it and ask whether to overwrite it or update it. Its checkboxes may already record finished work.
4. **Read the PRD carefully,** all of it. The Definition of Done is the checklist the plan must cover in full; use cases, scope, exclusions and technical restrictions shape the tasks and their order.
5. **Check the PRD is complete enough to plan.** Ask the user with `AskUserQuestion` before writing anything if the PRD has open questions, contradictions (e.g. a use case that conflicts with "Not included in scope"), Definition of Done items that can't be checked, or gaps that would force you to guess a requirement. A guess in a plan gets built as if it were agreed. Don't stop over things that are purely implementation choices: those are yours to make in the plan.
6. **Get just enough project context.** Read the root and the relevant app `CLAUDE.md` files so tasks match the real stack and layout (which apps and packages exist, what's already built, what's missing). Skim existing plans in `docs/plans/` for consistency. Don't design the code: this is a plan, not a spec.
7. **Split the work into phases** following the rules below, and write the file using the template. The date is today's date as `YYYY-MM-DD`.
8. **Check coverage before finishing.** Go through the PRD's Definition of Done item by item and make sure each one is covered by at least one phase's tasks and its "When done" criterion. Go through the plan's tasks and make sure each one traces back to the PRD. Fix the plan if either check fails.
9. **Report back** with the plan path, the list of phases (one line each), and any assumptions you made or questions still open.

## Rules for splitting into phases

- **Every phase delivers a working result.** After a phase, something new can be used or verified end to end (through the UI, or through the api with a request or an e2e test). A phase that leaves half-wired code isn't a phase.
- **Phases are independent: work can stop after any of them.** A later phase may build on an earlier one, but no earlier phase may need a later one to be useful. Order phases so the most valuable path comes first.
- **Phase 1 is the tracer bullet:** the thinnest path that makes the core use case work, skipping limits, edge cases and polish. Later phases widen it. This surfaces integration problems (storage, auth, contracts between api and web) at the start rather than the end.
- **At most 5 tasks per phase.** More than that means the phase is doing too much; split it.
- **Backend and frontend of the same capability go in different phases.** The backend phase comes first and is done when its behaviour is verifiable without the UI (e.g. through api e2e tests); the frontend phase that follows puts it in front of users. Shared request/response types and limits (`packages/contracts`) belong to the backend phase that introduces them.

## Rules for tasks

- **Only what the PRD asks for.** No extra features, refactors or "nice to have" items. If something seems necessary but isn't in the PRD, list it in your report as a question instead of adding it.
- **Each task is one concrete, checkable piece of work**, phrased as an action: "Reject files over 2 GB on the api with 400", not "Handle limits". Name the area it touches (api module, web page, database, contracts) when it helps, but don't prescribe code, function names or file structure in detail.
- **Include the tests and translations a phase needs** inside that phase's tasks (e.g. e2e tests for new endpoints, English and Russian texts for new UI), rather than leaving them all for a final phase.
- **"When done" is a concrete criterion** a reviewer can answer yes or no, ideally pointing to the PRD's Definition of Done items it completes.

## Template

Use exactly this structure:

```markdown
# Plan: <Feature Name>

**PRD:** [docs/prds/<kebab-name>.md](../prds/<kebab-name>.md)
**Date:** YYYY-MM-DD

## Implementation phases

### Phase 1: <name>

**Goal:** <what this phase gives the user or the team>
**Affects:** <backend / frontend / database / contracts — the ones that apply>
**Tasks:**

- [ ] <task>
- [ ] <task>

**When done:** <concrete criterion>

### Phase 2: <name>

...
```

Write the plan in English.
