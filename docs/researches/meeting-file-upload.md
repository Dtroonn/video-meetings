# Research: Meeting File Upload

**Plan:** [docs/plans/meeting-file-upload.md](../plans/meeting-file-upload.md)
**Date:** 2026-10-27

Which technical approach and stack to use for the plan's six phases.

## Approach

**Custom chunked upload over the existing api, files on the api's local disk, metadata in PostgreSQL.**

- The browser slices a file into 5 MiB chunks and sends them one by one as raw `application/octet-stream` requests to `/api/meeting/files/...`.
- The api streams each chunk straight into a temporary `.part` file (Node streams, never buffered in memory) and records `bytesReceived` in the DB.
- On "complete" the api checks size and type, atomically moves the file to its final place and marks the row completed.
- Resume = the client asks the api how many bytes it already has (idempotent "start" for the same name + size + last-modified) and continues from there.

## Stack

| Concern                | Choice                                                                                          | Why                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Upload protocol        | Custom chunked (4 endpoints)                                                                    | The plan already defines the DB model, resume rule, membership 404 and 24 h expiry; it maps directly to this    |
| Server upload handling | Node `stream/promises` `pipeline` + `fs.createWriteStream`                                      | Streams to disk, no memory buffering; Nest doesn't parse octet-stream bodies, so `req` stays a stream           |
| Multipart / multer     | Not used                                                                                        | Built for whole-file multipart uploads, not chunk streams                                                       |
| File storage           | Local disk, `UPLOADS_DIR` env, ids as file names, relative `storageKey` in DB                   | Simple, durable, readable by a future processing feature; tmp and final on one filesystem so `rename` is atomic |
| Metadata               | New Prisma model `MeetingFile` (PENDING/COMPLETED, bytesReceived)                               | Same ORM and migrations as the rest of the api                                                                  |
| Access control         | `GetMeetingByIdQuery` through the `QueryBus`                                                    | Reuses the existing "non-member gets the meetings 404" rule and the CQRS module boundaries                      |
| Limits and types       | `packages/contracts` (size, chunk size, extension table)                                        | Required: one definition shared by api and web                                                                  |
| Type validation        | By extension (+ `file-type` magic-byte check on complete)                                       | Browsers report unreliable MIME for `.md`, `.mkv`, `.m4a`                                                       |
| Safe download          | `StreamableFile`, `application/octet-stream`, `Content-Disposition: attachment`, `nosniff`      | Uploaded content never runs in the app's origin                                                                 |
| 24 h expiry            | `@nestjs/schedule` (^12.0.2) cleanup job, plus a lazy check on start                            | Idiomatic for Nest 12; the lazy check makes expiry independent of the job                                       |
| Web upload client      | Existing axios `apiClient` (XHR adapter gives upload progress), `Blob.slice`, `AbortController` | No new dependency; refresh-on-401 already built in                                                              |
| Web state              | zustand store per provider                                                                      | Same pattern as `entities/user`                                                                                 |
| Web placement          | New FSD page slice `_pages/meeting`                                                             | "Pages first" rule                                                                                              |
| Download in browser    | Plain `<a href>` to the api, after one cheap authenticated call to refresh the cookie           | Streams to disk without loading 100 MB into memory                                                              |

New api dependencies: `@nestjs/schedule`, `file-type`. No new web dependencies.

## Alternatives rejected

- **tus (`@tus/server` + `tus-js-client`)**: standard resumable protocol, but it keeps its own state (`.info` files, client-side fingerprints) next to our DB table, and the 404, pending-invisible, cancel and expiry rules would all become hooks around it. It remains the fallback if the custom protocol proves too costly.
- **multer / `FileInterceptor`**: multipart whole-file upload, no resume.
- **Direct upload to S3 / presigned URLs**: the PRD requires durable local storage for now and membership checks on every request; adds infrastructure not in scope.
- **Uppy**: UI library on top of tus/S3; the upload UI is small and HeroUI-based.
- **Signed download URLs**: extra secret and expiry logic with no benefit over checking membership on every request.

## Risks and things to check

- **Dev proxy:** in dev the browser reaches the api through Next's rewrite. Not tested here (dev servers weren't running); verify with one 100 MB upload in Phase 1/2. Production uses nginx directly.
- **nginx:** default `client_max_body_size` is 1 MB; it must be raised to at least 8 MB for `/api/` or every chunk is rejected.
- **Emails in responses:** the meetings module doesn't read the users table; participants' and uploaders' emails should come from a users query through the `QueryBus`.
- **Leave warning:** `beforeunload` doesn't cover in-app navigation (links, back button); decide whether that's required.
- **Single disk:** local storage ties the api to one instance and volume.
- **Magic-byte check:** not verified against real mp3/mkv/docx samples; keep an extension-only fallback.

## Sources

- tus protocol and Node server: <https://tus.io/protocols/resumable-upload>, <https://tus.io/blog/2025/03/25/tus-node-server-v200>
- `@nestjs/schedule` 12.x: <https://newreleases.io/project/npm/@nestjs/schedule/release/12.0.0>
- Next.js 16 bundled docs (`proxyClientMaxBodySize`, `Link` `onNavigate`)
