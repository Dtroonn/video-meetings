# Plan: User Profile

**PRD:** [docs/prds/user-profile.md](../prds/user-profile.md)
**Date:** 2026-11-08

## Implementation phases

### Phase 1: Profile details in the api

**Goal:** Tracer bullet on the backend: the signed-in user can read and change their name, date of birth and gender through the api, so the data model, the contract and the "only my own profile" rule are proven before any UI is built.
**Affects:** backend / database / contracts
**Tasks:**

- [ ] Add optional name, date of birth and gender (male / female / not set) to the users table with a migration; existing users get empty values
- [ ] Return name, date of birth and gender from `GET /users/me` (never the password hash), and add the response and update-request types plus the name (50 characters after trimming) and date of birth (1900-01-01 to today) limits to `packages/contracts`
- [ ] Add an endpoint that updates only the signed-in user's profile: each field can be set, changed or cleared; a name is trimmed and an all-spaces name is stored as empty; a name over 50 characters, a date outside 1900-01-01..today and a gender other than male / female / not set are rejected with 400
- [ ] Cover it with api e2e tests: set, change and clear each field and read it back from `GET /users/me`; all-spaces name becomes empty; 51-character name, a future date, a date before 1900-01-01 and an unknown gender give 400; a request without a session gets 401; one user's update never changes another user's profile

**When done:** The e2e tests pass (DoD: name / date of birth / gender persist and can be cleared — api side; future or pre-1900 date rejected; over-50-character name rejected; gender limited to the three values; a user can't change another user's profile).

### Phase 2: Profile page with personal details and greeting by name

**Goal:** Users open their profile from the header menu, edit name, date of birth and gender, and the dashboard greets them by name.
**Affects:** frontend
**Tasks:**

- [ ] Add a private profile page under `/<locale>/dashboard/profile` (signed-out visitors go to login and come back) and make the "Profile" item of the header avatar menu open it
- [ ] Show the user's email (read-only) and a form for name, date of birth and gender (Male / Female / Not specified) filled with the current values, checking the shared limits in the browser; saving shows success, and on a network or server error keeps the previous values, shows an error and allows a retry
- [ ] Keep the user store in sync after saving, and make the dashboard greeting show "Hello, <name>" when the name is set and the email otherwise
- [ ] Add English and Russian texts for the page, form fields, validation messages, save states and the updated greeting

**When done:** In the browser, "Profile" opens the page; a signed-out visitor is sent to `/login` and back; after saving a name the dashboard reads "Hello, <name>" / "Привет, <name>", after clearing it shows the email; all three fields survive a reload and can be cleared (DoD: Profile menu opens the page, signed-out redirect, greeting, fields persist, en/ru texts for this part).

### Phase 3: Avatar in the api

**Goal:** The signed-in user can upload, replace and remove their avatar through the api, with type and size limits enforced on the server.
**Affects:** backend / database / contracts
**Tasks:**

- [ ] Add the allowed avatar types (JPEG, PNG, WebP) and the 5 MB limit to `packages/contracts`; store the avatar on the api's disk (under the existing uploads storage) and link it to the user in the database
- [ ] Add an endpoint to upload or replace the signed-in user's avatar: a file of another type (checked by content, not only by name) or over 5 MB is rejected with 400 and leaves the current avatar unchanged; a replaced avatar's old file is removed
- [ ] Add an endpoint to remove the avatar (file removed too) and an endpoint that serves a user's avatar to signed-in users only (401 without a session); `GET /users/me` tells whether the user has an avatar and where to load it from
- [ ] Cover it with api e2e tests: upload each allowed type, replace, remove; 5 MB + 1 byte and a non-image file give 400 and keep the old avatar; serving without a session gives 401; a user can't change another user's avatar

**When done:** The e2e tests pass (DoD: wrong type or over 5 MB rejected by the api with the avatar unchanged; a user can't change another user's profile — avatar part).

### Phase 4: Avatar on the profile page and in the header

**Goal:** Users see their photo in the header and manage it from the profile page.
**Affects:** frontend
**Tasks:**

- [ ] Show the current avatar (or the placeholder) on the profile page with actions to upload a new one and to remove it
- [ ] Check type and size in the browser before uploading, using the limits from `packages/contracts`, and show the allowed types or the size limit when a file is rejected; show an error with retry when an upload or removal fails
- [ ] Show the user's photo in the header avatar when set and the placeholder otherwise, updated right after an upload or removal without a page reload
- [ ] Add English and Russian texts for the avatar actions, rejections and errors

**When done:** In the browser, uploading a JPEG, PNG or WebP of 5 MB or less updates the header avatar without a reload; a GIF or a 5 MB + 1 byte file is rejected before uploading; after removing, the header shows the placeholder (DoD: header shows the photo, removed avatar shows the placeholder, en/ru texts for this part).

### Phase 5: Password change in the api

**Goal:** The signed-in user can change their password by proving the current one, and their other sessions are ended.
**Affects:** backend / contracts
**Tasks:**

- [ ] Add the change-password request type to `packages/contracts` (current password and new password, reusing the registration password limits)
- [ ] Add an endpoint that changes the signed-in user's password: a wrong current password is rejected (password unchanged), a new password under 8 or over 128 characters gives 400; on success the new password is stored hashed like at registration
- [ ] On success delete all of the user's other sessions so they can no longer refresh, while the current session keeps working
- [ ] Cover it with api e2e tests: wrong current password rejected; too short and too long new passwords give 400; after a change, login with the old password fails and with the new one works; the current session still works; another session's refresh token is rejected

**When done:** The e2e tests pass (DoD: wrong current password leaves the password unchanged, length rejected by the api, old password fails and new works at login, current session keeps working and other sessions are signed out once their access token expires).

### Phase 6: Password change form

**Goal:** Users change their password from the profile page.
**Affects:** frontend
**Tasks:**

- [ ] Add a password change form to the profile page: current password, new password and confirmation of the new password, with show/hide toggles; it can't be submitted while the new password and confirmation differ or the new password breaks the length rule
- [ ] Send it to the api keeping the current browser session signed in (session cookies updated if the api issues new tokens); show success and clear the form, show "current password is wrong" for that error, and an error with retry on network or server failure
- [ ] Add English and Russian texts for the form, its validation messages and results

**When done:** In the browser, a mismatched confirmation can't be submitted; a wrong current password shows the error; after a successful change the user stays signed in, the old password fails at login and the new one works, and a second browser is signed out within 15 minutes (DoD: mismatch can't be submitted, wrong current password error, other sessions signed out, all new texts in en and ru).
