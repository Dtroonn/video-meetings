# PRD: Meeting File Upload

**Date:** 2026-10-05
**Status:** Draft

## Aim

Let meeting members attach the meeting's recordings and documents to the meeting itself, so everything about a meeting is kept in one place. The files are stored so that a later feature can process them (e.g. transcription).

## Use cases

- A user opens a meeting from the dashboard => sees the meeting page with its title, date, participants and the list of files
- A user (owner or participant) selects one or more allowed files up to 100 MB each => each file uploads with its own progress (percentage and uploaded/total size) and appears in the meeting's file list when it finishes
- A user selects a file of a type that isn't allowed => the file isn't uploaded and the user sees which file was rejected and which types are allowed
- A user selects a file larger than 100 MB => the file isn't uploaded and the user sees the size limit
- A user cancels an upload in progress => the upload stops and the file doesn't appear in the list
- A user's connection drops during an upload => the upload pauses and continues from where it stopped once the connection is back
- A user reloads or closes the page during an upload and selects the same file again on that meeting within 24 hours => the upload continues from where it stopped instead of starting over
- A user selects the same file again more than 24 hours after the upload was interrupted => the upload starts from the beginning
- A user uploads a file with the same name and content as a file already in the meeting => it's stored as a separate file and both appear in the list
- A user tries to leave the page while an upload is in progress => is warned that the upload will be interrupted
- A user clicks a file in the list => the file downloads with its original name
- A participant deletes a file they uploaded => after a confirmation the file is removed for everyone
- A participant views a file uploaded by someone else => no delete action is offered, and a delete request for it is refused
- The owner deletes any file in the meeting => after a confirmation the file is removed for everyone
- A user who isn't the owner or a participant opens the meeting page or a file link => gets the same "not found" result as for a missing meeting
- Another member opens the meeting while a file is still uploading => doesn't see that file until its upload has finished
- A participant who uploaded files is removed from the meeting => their files stay in the meeting for the remaining members, and only the owner can delete them

## Scope

- Meeting page reachable from the dashboard's meeting list: title, date, participants and the files section
- Uploading files to a meeting by its owner and its participants, several files at once
- Allowed files: audio/video recordings (mp4, webm, mov, mkv, mp3, m4a, wav, ogg) and documents (pdf, docx, xlsx, pptx, txt, md, png, jpg/jpeg)
- Up to 100 MB per file; no limit on the number of files per meeting
- Per-file upload progress, cancel, and automatic resume after a network interruption or page reload; an unfinished upload can be resumed for 24 hours, after which it's discarded
- Duplicate files (same name and content) are allowed and stored as separate files
- Files stay in the meeting when their uploader stops being a participant
- File list per meeting showing file name, type, size, who uploaded it and when
- Downloading files by any meeting member
- Deleting files: the owner can delete any file, a participant only their own
- Durable storage of uploaded files, available to a future processing feature
- English and Russian texts for everything the feature shows

## Not included in scope

- Any processing of files: transcription, summaries, thumbnails, format conversion, or a processing status in the UI
- In-browser playback or preview of recordings and documents
- Renaming files, replacing a file with a new version, or folders
- Recording a meeting directly in the app
- Uploads that keep running while the user navigates to other pages
- Sharing files with people outside the meeting (public links)
- Per-user or per-meeting storage quotas
- Detecting or merging duplicate files
- Removing participants from a meeting (only the rule for their files is defined here)
- Editing the meeting itself (title, date, participants) or deleting meetings
- Virus or content scanning

## Technical restrictions

- Must use the existing auth session and meeting access rules: only the owner and participants can see, upload, download or delete a meeting's files, and anyone else gets the same "not found" response as for a missing meeting
- Type and size limits must be enforced by the server, not only checked in the browser; the limits must be shared between api and web, not defined twice
- Files must not pass through the web app's server: 100 MB uploads can't be buffered in memory by either app
- Stored files must survive api restarts and redeploys, and stay readable by a future processing feature
- Download access must be checked for every download; a file must not be reachable by guessing its URL
- Downloads must not render uploaded content inside the app's origin (e.g. a malicious html-like file or image must not run as part of the app)
- All UI texts in English and Russian

## Definition of Done

- [ ] The dashboard links every listed meeting to its meeting page, which shows title, date, participants and the file list
- [ ] The owner and a participant can each upload a 100 MB mp4 file, and it then appears in the list for all meeting members with name, type, size, uploader and upload time
- [ ] Selecting 3 allowed files uploads all 3, each with its own progress indicator showing percentage and uploaded/total size
- [ ] A file of 100 MB + 1 byte, or a file with a disallowed type (e.g. `.exe`), is rejected in the browser before uploading, and the api rejects the same file when sent directly
- [ ] Cutting the network mid-upload and restoring it finishes the upload without starting over
- [ ] Reloading the page mid-upload and selecting the same file again on that meeting continues from the previous progress, not from 0%
- [ ] An upload interrupted more than 24 hours ago starts from 0% when the same file is selected again, and its partial data is deleted from storage
- [ ] Uploading the same file twice to one meeting succeeds, and both copies are listed, downloadable and deletable separately
- [ ] Files uploaded by a user stay listed and downloadable for the other members after that user is no longer a participant
- [ ] Cancelling an upload stops it, and the file doesn't appear in the list for any member
- [ ] An unfinished upload isn't visible to other members
- [ ] Leaving the page during an upload shows a warning first
- [ ] Downloading a file gives a file byte-identical to the uploaded one, with its original name
- [ ] A participant sees a delete action only on their own files; the owner sees it on every file; both ask for confirmation
- [ ] The api refuses a participant's request to delete another member's file
- [ ] A signed-in user who isn't a member gets "not found" for the meeting page, its file list, file downloads and uploads
- [ ] After an api restart, previously uploaded files are still listed and downloadable
- [ ] All new texts are available in English and Russian
