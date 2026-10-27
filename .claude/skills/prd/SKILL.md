---
name: prd
description: 'Create a PRD (product requirements document) for a feature in docs/prds/<feature-name>.md. Takes the feature name and an optional short description; asks clarifying questions when the description is too thin.'
argument-hint: '<feature name> [short description]'
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
---

# Create PRD

A PRD here is a short contract between the product side and whoever builds the feature. It pins down **what** the feature does and **why** users need it, and gives a checklist to decide when it's done. It deliberately leaves out **how**: implementation choices belong to the person building it, and a PRD that prescribes code goes stale the moment the design changes.

Input: `$ARGUMENTS` is the feature name, optionally followed by a description. If there's no feature name, ask for one.

## Workflow

1. **Work out the file path.** Convert the feature name to kebab-case (lowercase, words joined by `-`, no other punctuation): `User Profile Settings` → `user-profile-settings`. The file is `docs/prds/<kebab-name>.md` at the repository root. Writing the file creates `docs/prds/` if it's missing.
2. **Check for an existing PRD.** If the file already exists, read it and ask whether to overwrite it or update it. It may hold decisions someone already agreed on.
3. **Understand the feature before writing.** Each section of the template has to be filled with concrete, feature-specific content. If the description doesn't give you enough for that (typically a name plus a sentence or two), interview the user with `AskUserQuestion` until you do. Ask about:
   - who the user is and what problem this solves for them
   - the main scenarios, plus the error and edge cases that matter
   - where the feature stops: what's tempting to include but shouldn't be
   - constraints such as deadlines, platforms, compliance, or existing behaviour that must not break

   Don't fill gaps with invented requirements. A plausible-sounding guess in a PRD gets built as if it were agreed.
4. **Get just enough project context.** Skim the root and app `CLAUDE.md` files and any existing PRDs in `docs/prds/`. Use them to make the technical restrictions match the real stack and to stay consistent with existing features. Stop there: this isn't an implementation plan.
5. **Write the file** using the template. The date is today's date as `YYYY-MM-DD`. A new PRD's status is always `Draft`; the user moves it on (e.g. `Approved`, `In progress`, `Done`) as the feature progresses.
6. **Report back** with the file path, plus any assumptions you made or questions still open, so the user can settle them before the PRD is approved.

## Template

Use exactly these sections, in this order:

```markdown
# PRD: <Feature Name>

**Date:** YYYY-MM-DD
**Status:** Draft

## Aim

<1–2 sentences: what the feature gives the user and why they need it.>

## Use cases

- A user <action> => <result>

## Scope

- <what is included>

## Not included in scope

- <what we explicitly must not do>

## Technical restrictions

- <restrictions that must be taken into account>

## Definition of Done

- [ ] <checkable item>
```

## Writing guidelines

- **No fluff.** Every line should carry a requirement or a constraint. Leave out intros, background essays and marketing language: people skim PRDs, and padding hides the parts that matter.
- **What and why, not how.** Don't name components, endpoints, database tables, libraries or file structure. The exception is a hard external constraint (e.g. "must use the existing auth session"), which goes under _Technical restrictions_.
- **Use cases** use the form `A user <action> => <result>`, one scenario per line. Include the failure paths that matter (wrong input, no permission, network loss). Those are where implementations usually differ from what was meant.
- **Not included in scope** should list real, tempting neighbours of the feature, not obvious nonsense. Its job is to stop scope creep during implementation and review.
- **Definition of Done items must be checkable.** A reviewer or a test should be able to answer each item with yes or no. "A logged-out user opening `/dashboard` is redirected to `/login`" is checkable. "Works smoothly" or "good UX" isn't. Use numbers where they matter (limits, timings, counts).
- Uncertain points go in your report as assumptions, not into the PRD as facts.
- Write the PRD in English.

## Example (abridged)

```markdown
# PRD: Meeting Waiting Room

**Date:** 2026-10-05
**Status:** Draft

## Aim

Let hosts decide who joins their meeting, so uninvited people can't drop into private calls through a shared link.

## Use cases

- A guest opens a meeting link while the waiting room is on => sees "Waiting for the host to let you in"
- A host admits a waiting guest => the guest joins the meeting with camera and mic off
- A host denies a waiting guest => the guest sees "The host did not let you in" and can't retry for that meeting
- A host leaves while guests are waiting => waiting guests see "The meeting has ended"

## Scope

- Per-meeting waiting room toggle, set by the host
- List of waiting guests with admit/deny actions for the host

## Not included in scope

- Admitting or denying everyone at once
- Co-hosts or delegated admission rights
- Chat between waiting guests and the host

## Technical restrictions

- Guests must not receive any meeting media or participant list before they're admitted

## Definition of Done

- [ ] With the waiting room on, a guest opening the link doesn't join until admitted
- [ ] An admitted guest appears in the participant list within 2 seconds of the host clicking "Admit"
- [ ] A denied guest can't rejoin the same meeting with the same link
- [ ] With the waiting room off, guests join directly as before
```
