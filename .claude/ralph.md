# Ralph Loop - rules for standalone work

## How to handle issues
- Implement only the issue named in the prompt. Don't pick another open issue, even if it looks
  like the next one: the loop script reviews, commits and closes the changes under that number
- Read title, body and DoDs (`gh issue view <number>`)
- Check if the specified branch exists. If not, create it from the current HEAD. Switch to it.
- Work only in the branch without creating new ones

## Implementation rules
- Tests first, then implementation (TDD)
- Run tests after making final changes
- If tests fail after 5 attempts, stop: write a comment with the error description in the issue
  and create the file `.claude/ralph.failed`

## Completion rules
- Make sure that all tests pass
- Make sure all requirements are satisfied
- Leave the changes uncommitted. Don't commit, don't run `/code-review`, don't close the issue
  and don't open a pull request: the Ralph loop script (`.claude/ralph.mjs`) reviews the
  uncommitted changes, commits them and closes the issue
