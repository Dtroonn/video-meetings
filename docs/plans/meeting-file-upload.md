# Plan: Meeting File Upload

**PRD:** [docs/prds/meeting-file-upload.md](../prds/meeting-file-upload.md)
**Date:** 2026-10-05

## Implementation phases

### Phase 1: Store and list meeting files through the api

**Goal:** Tracer bullet on the backend: a meeting member can upload a file to the api's disk storage and see it in the meeting's file list, so storage, auth and the upload contract are proven before any UI is built.
**Affects:** backend / database / contracts
**Tasks:**

- [ ] Add a files directory on the api's disk: its path comes from an env variable (in `apps/api/.env.example`), it's created on start, lives outside the build output and the repo (gitignored), so files survive restarts and redeploys; document it in the api `CLAUDE.md`
- [ ] Add a meeting files table (meeting, uploader, original name, type, size, path on disk, pending/completed state, bytes received, timestamps) with a migration; a file stays linked to its uploader even when the uploader stops being a participant
- [ ] Add contracts and api endpoints for a chunked upload (all file endpoints in this feature live under `/meeting/files`, the browser reaches them as `/api/meeting/files/...`): start an upload, send chunks of at most a few MB that are streamed to a temporary file on disk (never buffered whole in memory), and complete it, which moves the file into place; only the owner and participants may call them, anyone else gets the meetings 404
- [ ] Add an endpoint under `/meeting/files` listing a meeting's completed files with name, type, size, uploader email and upload time (pending uploads excluded, members only), and return participants' emails from `GET /meetings/:id` so the meeting page can show them
- [ ] Cover it with api e2e tests: owner and participant upload and see the file, the same file uploaded twice gives two entries, a pending upload isn't listed, a non-member gets 404 for start, complete and list

**When done:** The e2e tests pass; a file uploaded in chunks through the api shows up in the list for every member and is still listed after an api restart (DoD: owner and participant upload, duplicates stored separately, unfinished upload hidden, non-member 404 for list and upload, survives restart — api side).

### Phase 2: Meeting page with file list and upload progress

**Goal:** Users reach a meeting from the dashboard, see its details and files, and upload several files at once with per-file progress.
**Affects:** frontend
**Tasks:**

- [ ] Add the meeting page under `/<locale>/dashboard/meetings/<id>` showing title, date and participants; a missing or not-visible meeting shows the not-found page; link every meeting listed on the dashboard to it
- [ ] Show the meeting's file list (name, type, size, uploader, upload time)
- [ ] Let members select several files and upload each one in chunks through `/api`, with its own progress showing percentage and uploaded/total size; a finished file appears in the list
- [ ] Add English and Russian texts for the page, list and upload states

**When done:** From the dashboard a member opens a meeting, uploads 3 files at once with 3 separate progress indicators, and a 100 MB mp4 then appears in the list for all members; a non-member opening the page gets not-found (DoD 1, 2, 3; non-member part of the meeting page item).

### Phase 3: File limits, download and delete in the api

**Goal:** The api enforces the agreed file rules and lets members download and delete files with the right permissions.
**Affects:** backend / contracts
**Tasks:**

- [ ] Define the allowed file types and the 100 MB limit in `packages/contracts`; reject disallowed types and oversized files with 400 when an upload starts, and reject a completed upload whose stored size or type doesn't match (removing the stored data)
- [ ] Add a download endpoint under `/meeting/files` that checks membership on every request and streams the file from disk as an attachment with the original file name and headers that stop the browser from rendering or sniffing it (e.g. `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`), so an uploaded file never runs inside the app's origin and can't be fetched without membership
- [ ] Add a delete endpoint under `/meeting/files`: the owner can delete any file, a participant only their own (403 otherwise); the stored data is removed too
- [ ] Cover it with api e2e tests: 100 MB + 1 byte and `.exe` rejected, download is byte-identical with the original name, two copies of the same file are downloaded and deleted separately, non-member gets 404 for download and delete, a participant can't delete another member's file, files of a user who is no longer a participant stay listed and downloadable

**When done:** The e2e tests pass (DoD: api rejects disallowed files, byte-identical download, duplicates downloadable and deletable separately, api refuses deleting another member's file, non-member 404 for downloads, files kept after the uploader leaves).

### Phase 4: Limits, download and delete in the UI

**Goal:** Users see clear messages for rejected files and can download and delete files from the meeting page.
**Affects:** frontend
**Tasks:**

- [ ] Check type and size in the browser before uploading, using the limits from `packages/contracts`; show which file was rejected and the allowed types or the size limit
- [ ] Download a file by clicking it in the list
- [ ] Show a delete action only on files the user may delete (the owner on every file, a participant on their own), ask for confirmation, and remove the file from the list after deleting
- [ ] Add English and Russian texts for rejections, download and delete

**When done:** In the browser, a 100 MB + 1 byte file and an `.exe` are rejected before any upload starts; a clicked file downloads with its original name; a participant sees delete only on their own files, the owner on all, both with confirmation (DoD 4 browser part, 13, 14).

### Phase 5: Resumable uploads and cancel in the api

**Goal:** The api lets an interrupted upload continue where it stopped for 24 hours, and lets users cancel uploads.
**Affects:** backend / database / contracts
**Tasks:**

- [ ] When a member starts uploading a file that matches their own pending upload in that meeting (same name, size and last-modified time), return the existing upload with the number of bytes already received instead of starting a new one, and accept chunks from that offset
- [ ] Add a cancel endpoint under `/meeting/files` that deletes a pending upload's temporary file and its record
- [ ] Discard pending uploads older than 24 hours: delete their temporary files and records with a scheduled cleanup, so selecting the same file afterwards starts a new upload
- [ ] Cover it with api e2e tests: restarting a pending upload returns the bytes already received, a cancelled upload never appears in the list, an upload older than 24 hours starts from scratch and its partial data is gone

**When done:** The e2e tests pass (DoD: cancel api side, 24-hour expiry with partial data deleted, resume api side).

### Phase 6: Resume, cancel and leave warning in the UI

**Goal:** Uploads survive network drops and page reloads, and users can cancel them or are warned before losing them.
**Affects:** frontend
**Tasks:**

- [ ] Pause an upload when the connection drops and continue from the last received byte when it's back
- [ ] When the user selects a file that has a pending upload on this meeting, continue from the stored progress instead of 0%
- [ ] Add a cancel action per upload; a cancelled file doesn't appear in the list
- [ ] Warn the user before leaving or reloading the page while an upload is in progress
- [ ] Add English and Russian texts for paused, resumed and cancelled uploads and the leave warning

**When done:** Cutting the network mid-upload and restoring it finishes the upload without starting over; reloading mid-upload and selecting the same file continues from the previous progress; a cancelled upload isn't listed for anyone; leaving the page mid-upload shows a warning; all new texts exist in English and Russian (DoD 5, 6, 10, 12, 18).
