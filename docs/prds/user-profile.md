# PRD: User Profile

**Date:** 2026-11-08
**Status:** Draft

## Aim

Give signed-in users a profile page where they set how they appear in the app (avatar, name) and keep their personal details (date of birth, gender) and password up to date, so the app greets them by name and shows their own photo instead of a placeholder.

## Use cases

- A user clicks "Profile" in the header avatar menu => the profile page opens with their current avatar (or the placeholder), name, date of birth, gender and email
- A user uploads a JPEG, PNG or WebP image up to 5 MB as the avatar => it's saved and replaces the placeholder on the profile page and in the header
- A user uploads a new avatar while one is already set => the new image replaces the old one everywhere
- A user selects a file that isn't JPEG, PNG or WebP => the avatar doesn't change and the user sees the allowed types
- A user selects an image larger than 5 MB => the avatar doesn't change and the user sees the size limit
- A user removes their avatar => the placeholder is shown again on the profile page and in the header
- A user sets or changes their name and saves => the name is stored and the dashboard greets them with "Hello, <name>"
- A user clears their name and saves => the dashboard greets them with "Hello, <email>" again
- A user enters a name that is only spaces => it's treated as an empty name
- A user enters a name longer than 50 characters (after trimming spaces) => the name isn't saved and the user sees the limit
- A user sets, changes or clears their date of birth and saves => the new value is shown on the profile page after a reload
- A user enters a date of birth in the future or before 1900-01-01 => the date isn't saved and the user sees why
- A user picks gender "Male", "Female" or "Not specified" and saves => the choice is shown on the profile page after a reload
- A user enters the correct current password, a valid new password and the same new password again => the password changes, the user stays signed in, and all their other sessions are logged out
- A user enters a wrong current password => the password doesn't change and the user sees that the current password is wrong
- A user enters a new password and a confirmation that don't match => the form isn't submitted and the user sees the mismatch
- A user enters a new password shorter than 8 or longer than 128 characters => the password doesn't change and the user sees the length rule
- A user logs in with the old password after changing it => login fails; the new password works
- A save fails because of a network error or server error => the previous values stay, the user sees an error and can retry
- A signed-out visitor opens the profile page => is redirected to the login page and returns to the profile after logging in

## Scope

- A private profile page under the dashboard, opened from the "Profile" item of the header avatar menu
- Uploading, replacing and removing the avatar (JPEG, PNG, WebP; up to 5 MB)
- Setting, changing and clearing the name, date of birth and gender (Male / Female / Not specified)
- Changing the password with current password + new password + confirmation of the new password
- Logging out the user's other sessions after a successful password change
- The header avatar shows the user's photo when set, otherwise the existing placeholder
- The dashboard greeting shows the name when set, otherwise the email
- All new texts in both supported locales (en, ru)

## Not included in scope

- Changing the email address
- Showing names or avatars in meeting participant lists, file uploader columns or anywhere other than the header avatar and the dashboard greeting
- Cropping, rotating or otherwise editing the avatar image in the browser
- Password reset via email ("Forgot password")
- A list of active sessions or logging out a chosen session
- Deleting the account
- Viewing other users' profiles
- Gender options other than Male, Female and Not specified

## Technical restrictions

- Must use the existing auth session; the page is private like the rest of the dashboard
- Password rules must match registration: 8 to 128 characters (limits shared between web and api)
- Name is at most 50 characters after trimming; date of birth is between 1900-01-01 and today; these limits are shared between web and api
- Avatar type and size limits must be enforced by the api, not only in the browser, and shared with the web so both check the same rules
- Only the signed-in user may change their own profile; the api must never return the password hash
- Avatar images are served only to signed-in users

## Definition of Done

- [ ] "Profile" in the header avatar menu opens the profile page
- [ ] A signed-out visitor opening the profile page is redirected to `/login` and back to the profile page after logging in
- [ ] After uploading a JPEG, PNG or WebP image of 5 MB or less, the header avatar shows it without a manual page reload
- [ ] A file of another type, or over 5 MB, is rejected by the api (not only by the browser) and the avatar stays unchanged
- [ ] After removing the avatar, the header shows the placeholder icon
- [ ] With a name set, the dashboard greeting reads "Hello, <name>" (en) / "Привет, <name>" (ru); with no name or a name of only spaces, it shows the email
- [ ] Name, date of birth and gender each persist across a page reload and can each be cleared
- [ ] A date of birth in the future or before 1900-01-01 is rejected by the api
- [ ] A name longer than 50 characters after trimming is rejected by the api
- [ ] Gender accepts only Male, Female or Not specified
- [ ] A wrong current password leaves the password unchanged and shows an error
- [ ] A new password and confirmation that differ can't be submitted
- [ ] A new password under 8 or over 128 characters is rejected by the api
- [ ] After a password change, the old password fails at login and the new one works
- [ ] After a password change, the current session keeps working and the user's other sessions are signed out no later than when their current access token expires (15 minutes by default)
- [ ] A user can't read or change another user's profile through the api
- [ ] All new texts exist in both en and ru
