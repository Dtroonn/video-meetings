import { randomBytes, randomUUID } from 'node:crypto';
import { access, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MEETING_FILE_MAX_SIZE, UPLOAD_CHUNK_SIZE } from '@video-meetings/contracts';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

interface Upload {
  id: string;
  meetingId: string;
  name: string;
  type: string;
  size: number;
  bytesReceived: number;
}

interface MeetingFile {
  id: string;
  meetingId: string;
  name: string;
  type: string;
  size: number;
  uploader: { id: string; email: string };
  uploadedAt: string;
}

interface StartUploadBody {
  meetingId: string;
  name: string;
  type: string;
  size: number;
}

const PASSWORD = 'Str0ng-Passw0rd!';

// Set by `vitest.config.e2e.ts`, so test uploads don't land in the dev uploads folder.
const UPLOADS_DIR = process.env.UPLOADS_DIR as string;

// Every test registers its own users, so tests don't depend on each other or on a clean database.
const uniqueEmail = () => `user-${randomUUID()}@example.com`;

// Random bytes could start with some format's signature (`MZ` of an `.exe` is 2 bytes) and be
// refused as not matching the file's extension, so test content starts with plain text.
const CONTENT_PREFIX = Buffer.from('video-meetings e2e test file\n');

/** `size` bytes of random content that `file-type` doesn't recognize as any format. */
const randomContent = (size: number) =>
  size <= CONTENT_PREFIX.length
    ? CONTENT_PREFIX.subarray(0, size)
    : Buffer.concat([CONTENT_PREFIX, randomBytes(size - CONTENT_PREFIX.length)]);

const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  );

const createApp = async (): Promise<INestApplication<App>> => {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  await app.init();
  return app;
};

describe('Meeting files (e2e)', () => {
  let app: INestApplication<App>;

  const server = () => request(app.getHttpServer());

  const registerUser = async (): Promise<TestUser> => {
    const email = uniqueEmail();
    const res = await server()
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);
    const { user, accessToken } = res.body as { user: { id: string }; accessToken: string };
    return { id: user.id, email, accessToken };
  };

  const createMeeting = async (owner: TestUser, participants: TestUser[] = []) => {
    const res = await server()
      .post('/meetings')
      .auth(owner.accessToken, { type: 'bearer' })
      .send({
        title: `Meeting ${randomUUID()}`,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        participants: participants.map(({ id }) => id),
      })
      .expect(201);
    return (res.body as { id: string }).id;
  };

  const startUpload = (body: object, accessToken?: string) => {
    const req = server().post('/meeting/files/uploads');
    return (accessToken ? req.auth(accessToken, { type: 'bearer' }) : req).send(body);
  };

  const sendChunk = (id: string, offset: number | string, chunk: Buffer, accessToken?: string) => {
    const req = server()
      .post(`/meeting/files/uploads/${id}/chunks`)
      .query({ offset })
      .set('Content-Type', 'application/octet-stream');
    return (accessToken ? req.auth(accessToken, { type: 'bearer' }) : req).send(chunk);
  };

  const completeUpload = (id: string, accessToken?: string) => {
    const req = server().post(`/meeting/files/uploads/${id}/complete`);
    return accessToken ? req.auth(accessToken, { type: 'bearer' }) : req;
  };

  const listFiles = (meetingId: string, accessToken?: string) => {
    const req = server().get('/meeting/files').query({ meetingId });
    return accessToken ? req.auth(accessToken, { type: 'bearer' }) : req;
  };

  const uploadBody = (meetingId: string, overrides: Partial<StartUploadBody> = {}) => ({
    meetingId,
    name: 'notes.txt',
    type: 'text/plain',
    size: 5,
    ...overrides,
  });

  const startUploadFor = async (user: TestUser, body: StartUploadBody): Promise<Upload> => {
    const res = await startUpload(body, user.accessToken).expect(201);
    return res.body as Upload;
  };

  /** Uploads `content` in chunks of `UPLOAD_CHUNK_SIZE`, like the web app, and completes it. */
  const uploadFile = async (
    user: TestUser,
    meetingId: string,
    content: Buffer,
    { name = 'recording.mp4', type = 'video/mp4' } = {},
  ): Promise<MeetingFile> => {
    const upload = await startUploadFor(user, { meetingId, name, type, size: content.length });
    for (let offset = 0; offset < content.length; offset += UPLOAD_CHUNK_SIZE) {
      const chunk = content.subarray(offset, offset + UPLOAD_CHUNK_SIZE);
      const res = await sendChunk(upload.id, offset, chunk, user.accessToken).expect(200);
      expect((res.body as Upload).bytesReceived).toBe(offset + chunk.length);
    }
    const res = await completeUpload(upload.id, user.accessToken).expect(200);
    return res.body as MeetingFile;
  };

  /** Sends a chunked upload without completing it, so it can be completed (or not) later. */
  const sendFile = async (user: TestUser, body: StartUploadBody, content: Buffer) => {
    const upload = await startUploadFor(user, { ...body, size: content.length });
    await sendChunk(upload.id, 0, content, user.accessToken).expect(200);
    return upload;
  };

  /** Requests a file's download, collecting the body as a buffer whatever its content type. */
  const downloadFile = (id: string, accessToken?: string) => {
    const req = server()
      .get(`/meeting/files/${id}/download`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    return accessToken ? req.auth(accessToken, { type: 'bearer' }) : req;
  };

  const deleteFile = (id: string, accessToken?: string) => {
    const req = server().delete(`/meeting/files/${id}`);
    return accessToken ? req.auth(accessToken, { type: 'bearer' }) : req;
  };

  const storedPath = (file: Pick<MeetingFile, 'id' | 'meetingId'>) =>
    path.join(UPLOADS_DIR, 'meetings', file.meetingId, file.id);

  const storedFile = (file: MeetingFile) => readFile(storedPath(file));

  const tempPath = (uploadId: string) => path.join(UPLOADS_DIR, 'tmp', `${uploadId}.part`);

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    await rm(UPLOADS_DIR, { recursive: true, force: true });
  });

  describe('uploading a file', () => {
    it('stores a file uploaded in several chunks byte for byte', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const content = randomContent(2 * UPLOAD_CHUNK_SIZE + 1234);

      const file = await uploadFile(owner, meetingId, content, {
        name: 'Standup recording.mp4',
        type: 'video/mp4',
      });

      expect(file).toEqual({
        id: expect.any(String) as unknown,
        meetingId,
        name: 'Standup recording.mp4',
        type: 'video/mp4',
        size: content.length,
        uploader: { id: owner.id, email: owner.email },
        uploadedAt: expect.any(String) as unknown,
      });
      expect((await storedFile(file)).equals(content)).toBe(true);
    });

    it('lets a participant upload a file', async () => {
      const owner = await registerUser();
      const participant = await registerUser();
      const meetingId = await createMeeting(owner, [participant]);

      const file = await uploadFile(participant, meetingId, randomContent(100));

      expect(file.uploader).toEqual({ id: participant.id, email: participant.email });
    });

    it('starts an upload with nothing received yet', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const body = uploadBody(meetingId, { name: 'slides.pdf', type: 'application/pdf', size: 42 });

      const res = await startUpload(body, owner.accessToken).expect(201);

      expect(res.body).toEqual({
        id: expect.any(String) as unknown,
        meetingId,
        name: 'slides.pdf',
        type: 'application/pdf',
        size: 42,
        bytesReceived: 0,
      });
    });

    it('accepts an empty file', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);

      const upload = await startUploadFor(owner, uploadBody(meetingId, { size: 0 }));
      const res = await completeUpload(upload.id, owner.accessToken).expect(200);

      expect((res.body as MeetingFile).size).toBe(0);
      expect((await storedFile(res.body as MeetingFile)).length).toBe(0);
    });

    it('returns the same file when an upload is completed twice', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const upload = await startUploadFor(owner, uploadBody(meetingId));
      await sendChunk(upload.id, 0, Buffer.from('hello'), owner.accessToken).expect(200);

      const first = await completeUpload(upload.id, owner.accessToken).expect(200);
      const second = await completeUpload(upload.id, owner.accessToken).expect(200);

      expect(second.body).toEqual(first.body);
    });

    it('returns 409 when a chunk does not start where the previous one ended', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const upload = await startUploadFor(owner, uploadBody(meetingId, { size: 10 }));
      await sendChunk(upload.id, 0, Buffer.from('hello'), owner.accessToken).expect(200);

      await sendChunk(upload.id, 0, Buffer.from('hello'), owner.accessToken).expect(409);
      await sendChunk(upload.id, 7, Buffer.from('abc'), owner.accessToken).expect(409);
    });

    it('returns 400 when a chunk goes past the declared size', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const upload = await startUploadFor(owner, uploadBody(meetingId, { size: 5 }));

      await sendChunk(upload.id, 0, Buffer.from('hello!'), owner.accessToken).expect(400);
    });

    it('returns 413 for a chunk larger than the chunk size', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const size = UPLOAD_CHUNK_SIZE + 1;
      const upload = await startUploadFor(owner, uploadBody(meetingId, { size }));

      // The api rejects it from `Content-Length` without reading the body (and closes the
      // connection), so only declare the size: a client still writing 5 MiB would see a reset.
      await sendChunk(upload.id, 0, Buffer.from('x'), owner.accessToken)
        .set('Content-Length', String(size))
        .expect(413);
    });

    it('returns 415 when a chunk is not sent as application/octet-stream', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const upload = await startUploadFor(owner, uploadBody(meetingId));

      await server()
        .post(`/meeting/files/uploads/${upload.id}/chunks`)
        .query({ offset: 0 })
        .auth(owner.accessToken, { type: 'bearer' })
        .set('Content-Type', 'text/plain')
        .send('hello')
        .expect(415);
    });

    it('returns 400 for an empty chunk or an invalid offset', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const upload = await startUploadFor(owner, uploadBody(meetingId));

      await sendChunk(upload.id, 0, Buffer.alloc(0), owner.accessToken).expect(400);
      await sendChunk(upload.id, -1, Buffer.from('hello'), owner.accessToken).expect(400);
      await sendChunk(upload.id, 'start', Buffer.from('hello'), owner.accessToken).expect(400);
    });

    it('returns 409 when completing an upload with bytes still missing', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const upload = await startUploadFor(owner, uploadBody(meetingId, { size: 10 }));
      await sendChunk(upload.id, 0, Buffer.from('hello'), owner.accessToken).expect(200);

      await completeUpload(upload.id, owner.accessToken).expect(409);
    });

    it('returns 409 for a chunk sent after the upload was completed', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const upload = await startUploadFor(owner, uploadBody(meetingId));
      await sendChunk(upload.id, 0, Buffer.from('hello'), owner.accessToken).expect(200);
      await completeUpload(upload.id, owner.accessToken).expect(200);

      await sendChunk(upload.id, 5, Buffer.from('!'), owner.accessToken).expect(409);
    });

    // Overrides of a valid body; `undefined` drops the field (JSON leaves it out).
    it.each([
      ['meetingId is missing', { meetingId: undefined }],
      ['meetingId is not a UUID', { meetingId: 'nope' }],
      ['name is missing', { name: undefined }],
      ['name is empty', { name: '' }],
      ['name is too long', { name: `${'a'.repeat(256)}.txt` }],
      ['type is missing', { type: undefined }],
      ['size is missing', { size: undefined }],
      ['size is negative', { size: -1 }],
      ['size is not an integer', { size: 1.5 }],
      ['size is a string', { size: '1' }],
      ['an unknown field is sent', { path: '/etc/passwd' }],
    ])('returns 400 when %s', async (_case, overrides) => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);

      await startUpload({ ...uploadBody(meetingId), ...overrides }, owner.accessToken).expect(400);
    });

    it('returns 401 without an access token', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const upload = await startUploadFor(owner, uploadBody(meetingId));

      await startUpload(uploadBody(meetingId)).expect(401);
      await sendChunk(upload.id, 0, Buffer.from('hello')).expect(401);
      await completeUpload(upload.id).expect(401);
    });
  });

  describe('file limits', () => {
    it('returns 400 for a file one byte over the size limit and accepts one at the limit', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);

      const over = await startUpload(
        uploadBody(meetingId, { name: 'recording.mp4', size: MEETING_FILE_MAX_SIZE + 1 }),
        owner.accessToken,
      ).expect(400);
      await startUpload(
        uploadBody(meetingId, { name: 'recording.mp4', size: MEETING_FILE_MAX_SIZE }),
        owner.accessToken,
      ).expect(201);

      expect((over.body as { message: string[] }).message).toEqual([
        expect.stringContaining('100 MB') as unknown,
      ]);
    });

    it.each(['setup.exe', 'page.html', 'image.svg', 'archive.zip', 'README', 'notes.txt.exe'])(
      'returns 400 for a file named %s',
      async (name) => {
        const owner = await registerUser();
        const meetingId = await createMeeting(owner);

        const res = await startUpload(uploadBody(meetingId, { name }), owner.accessToken).expect(
          400,
        );

        expect((res.body as { message: string[] }).message).toEqual([
          expect.stringContaining('Allowed file types: mp4') as unknown,
        ]);
      },
    );

    it('accepts an allowed extension in any case', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);

      const file = await uploadFile(owner, meetingId, randomContent(10), { name: 'Notes.MD' });

      expect(file.name).toBe('Notes.MD');
    });

    it('stores the type of the extension, not the one the client reports', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);

      const upload = await startUploadFor(
        owner,
        uploadBody(meetingId, { name: 'call.mkv', type: 'application/x-msdownload' }),
      );

      expect(upload.type).toBe('video/x-matroska');
    });

    it('returns 400 and deletes the upload when its content is another type', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      // An `.exe` starts with `MZ`; renaming it doesn't make it a picture.
      const exe = Buffer.concat([Buffer.from('MZ'), randomBytes(200)]);
      const upload = await sendFile(owner, uploadBody(meetingId, { name: 'photo.png' }), exe);

      await completeUpload(upload.id, owner.accessToken).expect(400);

      await completeUpload(upload.id, owner.accessToken).expect(404);
      expect(await exists(tempPath(upload.id))).toBe(false);
      const res = await listFiles(meetingId, owner.accessToken).expect(200);
      expect(res.body).toEqual([]);
    });

    it('accepts content of the declared type', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), randomBytes(100)]);

      const file = await uploadFile(owner, meetingId, pdf, { name: 'slides.pdf' });

      expect(file.type).toBe('application/pdf');
    });
  });

  describe('listing files', () => {
    it('shows files uploaded by the owner and a participant to every member', async () => {
      const owner = await registerUser();
      const participant = await registerUser();
      const meetingId = await createMeeting(owner, [participant]);

      const ownerFile = await uploadFile(owner, meetingId, randomContent(300), {
        name: 'agenda.pdf',
        type: 'application/pdf',
      });
      const participantFile = await uploadFile(participant, meetingId, randomContent(200), {
        name: 'recording.webm',
        type: 'video/webm',
      });

      const forOwner = await listFiles(meetingId, owner.accessToken).expect(200);
      const forParticipant = await listFiles(meetingId, participant.accessToken).expect(200);

      expect(forOwner.body).toEqual([participantFile, ownerFile]);
      expect(forParticipant.body).toEqual([participantFile, ownerFile]);
    });

    it('lists the same file uploaded twice as two separate files', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const content = randomContent(500);

      const first = await uploadFile(owner, meetingId, content, { name: 'same.mp4' });
      const second = await uploadFile(owner, meetingId, content, { name: 'same.mp4' });

      const res = await listFiles(meetingId, owner.accessToken).expect(200);

      expect(second.id).not.toBe(first.id);
      expect(res.body).toEqual([second, first]);
      expect((await storedFile(first)).equals(content)).toBe(true);
      expect((await storedFile(second)).equals(content)).toBe(true);
    });

    it('does not list an upload that has not been completed', async () => {
      const owner = await registerUser();
      const participant = await registerUser();
      const meetingId = await createMeeting(owner, [participant]);
      const pending = await startUploadFor(participant, uploadBody(meetingId, { size: 10 }));
      await sendChunk(pending.id, 0, Buffer.from('hello'), participant.accessToken).expect(200);
      const notStarted = await startUploadFor(participant, uploadBody(meetingId));

      const forOwner = await listFiles(meetingId, owner.accessToken).expect(200);
      const forUploader = await listFiles(meetingId, participant.accessToken).expect(200);

      expect(forOwner.body).toEqual([]);
      expect(forUploader.body).toEqual([]);
      expect(notStarted.id).not.toBe(pending.id);
    });

    it('does not list files of other meetings', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const otherMeetingId = await createMeeting(owner);
      await uploadFile(owner, otherMeetingId, randomContent(10));

      const res = await listFiles(meetingId, owner.accessToken).expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns 400 when meetingId is missing or not a UUID', async () => {
      const user = await registerUser();

      await server().get('/meeting/files').auth(user.accessToken, { type: 'bearer' }).expect(400);
      await listFiles('not-a-uuid', user.accessToken).expect(400);
    });

    it('returns 401 without an access token', async () => {
      await listFiles(randomUUID()).expect(401);
    });
  });

  describe('non-members', () => {
    it('get the same 404 as for a missing meeting when listing files', async () => {
      const owner = await registerUser();
      const stranger = await registerUser();
      const meetingId = await createMeeting(owner);
      await uploadFile(owner, meetingId, randomContent(10));

      const foreign = await listFiles(meetingId, stranger.accessToken).expect(404);
      const missing = await listFiles(randomUUID(), stranger.accessToken).expect(404);

      expect(foreign.body).toEqual(missing.body);
    });

    it('get the same 404 as for a missing meeting when starting an upload', async () => {
      const owner = await registerUser();
      const stranger = await registerUser();
      const meetingId = await createMeeting(owner);

      const foreign = await startUpload(uploadBody(meetingId), stranger.accessToken).expect(404);
      const missing = await startUpload(uploadBody(randomUUID()), stranger.accessToken).expect(404);

      expect(foreign.body).toEqual(missing.body);
      const res = await listFiles(meetingId, owner.accessToken).expect(200);
      expect(res.body).toEqual([]);
    });

    it("get 404 for chunks and completion of a member's upload", async () => {
      const owner = await registerUser();
      const stranger = await registerUser();
      const meetingId = await createMeeting(owner);
      const upload = await startUploadFor(owner, uploadBody(meetingId));

      await sendChunk(upload.id, 0, Buffer.from('hello'), stranger.accessToken).expect(404);
      await sendChunk(upload.id, 0, Buffer.from('hello'), owner.accessToken).expect(200);
      await completeUpload(upload.id, stranger.accessToken).expect(404);

      const res = await listFiles(meetingId, owner.accessToken).expect(200);
      expect(res.body).toEqual([]);
    });

    it('get 404 for an upload id that does not exist', async () => {
      const user = await registerUser();

      await sendChunk(randomUUID(), 0, Buffer.from('hello'), user.accessToken).expect(404);
      await completeUpload(randomUUID(), user.accessToken).expect(404);
    });
  });

  it("does not let another member send chunks to or complete someone else's upload", async () => {
    const owner = await registerUser();
    const participant = await registerUser();
    const meetingId = await createMeeting(owner, [participant]);
    const upload = await startUploadFor(participant, uploadBody(meetingId));

    await sendChunk(upload.id, 0, Buffer.from('hello'), owner.accessToken).expect(404);
    await sendChunk(upload.id, 0, Buffer.from('hello'), participant.accessToken).expect(200);
    await completeUpload(upload.id, owner.accessToken).expect(404);
  });

  describe('downloading a file', () => {
    it('gives the uploaded bytes under the original name, as an attachment', async () => {
      const owner = await registerUser();
      const participant = await registerUser();
      const meetingId = await createMeeting(owner, [participant]);
      const content = randomContent(UPLOAD_CHUNK_SIZE + 4321);
      const name = 'Запись встречи "итоги".mp4';
      const file = await uploadFile(owner, meetingId, content, { name });

      const res = await downloadFile(file.id, participant.accessToken).expect(200);

      expect((res.body as Buffer).equals(content)).toBe(true);
      expect(res.headers['content-length']).toBe(String(content.length));
      expect(res.headers['content-disposition']).toMatch(/^attachment;/);
      expect(res.headers['content-disposition']).toContain(
        `filename*=UTF-8''${encodeURIComponent(name)}`,
      );
    });

    it('never lets the browser render or sniff the file', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const html = Buffer.from('<html><script>alert(document.cookie)</script></html>');
      const file = await uploadFile(owner, meetingId, html, { name: 'page.txt' });

      const res = await downloadFile(file.id, owner.accessToken).expect(200);

      expect(res.headers['content-type']).toBe('application/octet-stream');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toContain('sandbox');
      expect(res.headers['cache-control']).toContain('no-store');
    });

    it('gives each copy of the same file separately', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const content = randomContent(300);
      const first = await uploadFile(owner, meetingId, content, { name: 'same.mp4' });
      const second = await uploadFile(owner, meetingId, content, { name: 'same.mp4' });

      const firstRes = await downloadFile(first.id, owner.accessToken).expect(200);
      const secondRes = await downloadFile(second.id, owner.accessToken).expect(200);

      expect((firstRes.body as Buffer).equals(content)).toBe(true);
      expect((secondRes.body as Buffer).equals(content)).toBe(true);
    });

    it('returns 404 for an upload that has not been completed', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const upload = await sendFile(owner, uploadBody(meetingId), Buffer.from('hello'));

      await downloadFile(upload.id, owner.accessToken).expect(404);
    });

    it('returns 400 for an id that is not a UUID and 401 without an access token', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const file = await uploadFile(owner, meetingId, randomContent(10));

      await downloadFile('nope', owner.accessToken).expect(400);
      await downloadFile(file.id).expect(401);
    });
  });

  describe('deleting a file', () => {
    it('lets a participant delete their own file, for everyone', async () => {
      const owner = await registerUser();
      const participant = await registerUser();
      const meetingId = await createMeeting(owner, [participant]);
      const file = await uploadFile(participant, meetingId, randomContent(100));

      await deleteFile(file.id, participant.accessToken).expect(204);

      const res = await listFiles(meetingId, owner.accessToken).expect(200);
      expect(res.body).toEqual([]);
      await downloadFile(file.id, owner.accessToken).expect(404);
      expect(await exists(storedPath(file))).toBe(false);
    });

    it("lets the owner delete a participant's file", async () => {
      const owner = await registerUser();
      const participant = await registerUser();
      const meetingId = await createMeeting(owner, [participant]);
      const file = await uploadFile(participant, meetingId, randomContent(100));

      await deleteFile(file.id, owner.accessToken).expect(204);

      const res = await listFiles(meetingId, participant.accessToken).expect(200);
      expect(res.body).toEqual([]);
    });

    it("returns 403 when a participant deletes another member's file", async () => {
      const owner = await registerUser();
      const participant = await registerUser();
      const other = await registerUser();
      const meetingId = await createMeeting(owner, [participant, other]);
      const ownerFile = await uploadFile(owner, meetingId, randomContent(100));
      const otherFile = await uploadFile(other, meetingId, randomContent(100));

      await deleteFile(ownerFile.id, participant.accessToken).expect(403);
      await deleteFile(otherFile.id, participant.accessToken).expect(403);

      const res = await listFiles(meetingId, owner.accessToken).expect(200);
      expect(res.body).toEqual([otherFile, ownerFile]);
      expect(await exists(storedPath(ownerFile))).toBe(true);
    });

    it('deletes one copy of the same file and keeps the other', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const content = randomContent(300);
      const first = await uploadFile(owner, meetingId, content, { name: 'same.mp4' });
      const second = await uploadFile(owner, meetingId, content, { name: 'same.mp4' });

      await deleteFile(first.id, owner.accessToken).expect(204);

      const res = await listFiles(meetingId, owner.accessToken).expect(200);
      expect(res.body).toEqual([second]);
      const download = await downloadFile(second.id, owner.accessToken).expect(200);
      expect((download.body as Buffer).equals(content)).toBe(true);
    });

    it('returns 404 for a file already deleted or an upload not completed', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const file = await uploadFile(owner, meetingId, randomContent(10));
      const upload = await sendFile(owner, uploadBody(meetingId), Buffer.from('hello'));
      await deleteFile(file.id, owner.accessToken).expect(204);

      await deleteFile(file.id, owner.accessToken).expect(404);
      await deleteFile(upload.id, owner.accessToken).expect(404);
    });

    it('returns 400 for an id that is not a UUID and 401 without an access token', async () => {
      const owner = await registerUser();
      const meetingId = await createMeeting(owner);
      const file = await uploadFile(owner, meetingId, randomContent(10));

      await deleteFile('nope', owner.accessToken).expect(400);
      await deleteFile(file.id).expect(401);
    });
  });

  describe('non-members downloading and deleting', () => {
    it('get the same 404 as for a missing file', async () => {
      const owner = await registerUser();
      const stranger = await registerUser();
      const meetingId = await createMeeting(owner);
      const file = await uploadFile(owner, meetingId, randomContent(10));

      const foreignDownload = await downloadFile(file.id, stranger.accessToken).expect(404);
      const missingDownload = await downloadFile(randomUUID(), stranger.accessToken).expect(404);
      const foreignDelete = await deleteFile(file.id, stranger.accessToken).expect(404);
      const missingDelete = await deleteFile(randomUUID(), stranger.accessToken).expect(404);

      expect((foreignDownload.body as Buffer).equals(missingDownload.body as Buffer)).toBe(true);
      expect(foreignDelete.body).toEqual(missingDelete.body);
      const res = await listFiles(meetingId, owner.accessToken).expect(200);
      expect(res.body).toEqual([file]);
    });
  });

  describe('files of a user who is no longer a participant', () => {
    it('stay listed and downloadable, and only the owner can delete them', async () => {
      const owner = await registerUser();
      const former = await registerUser();
      const participant = await registerUser();
      const meetingId = await createMeeting(owner, [former, participant]);
      const content = randomContent(200);
      const file = await uploadFile(former, meetingId, content);

      // There's no endpoint for removing participants yet, so remove them in the database.
      await app.get(PrismaService).meetingParticipant.delete({
        where: { meetingId_userId: { meetingId, userId: former.id } },
      });

      const res = await listFiles(meetingId, participant.accessToken).expect(200);
      expect(res.body).toEqual([file]);
      const download = await downloadFile(file.id, participant.accessToken).expect(200);
      expect((download.body as Buffer).equals(content)).toBe(true);
      await downloadFile(file.id, former.accessToken).expect(404);
      await deleteFile(file.id, former.accessToken).expect(404);
      await deleteFile(file.id, participant.accessToken).expect(403);
      await deleteFile(file.id, owner.accessToken).expect(204);
    });
  });

  it('still lists and downloads uploaded files after the api restarts', async () => {
    const owner = await registerUser();
    const participant = await registerUser();
    const meetingId = await createMeeting(owner, [participant]);
    const content = randomContent(UPLOAD_CHUNK_SIZE + 10);
    const file = await uploadFile(participant, meetingId, content);

    await app.close();
    app = await createApp();

    const res = await listFiles(meetingId, owner.accessToken).expect(200);
    expect(res.body).toEqual([file]);
    const download = await downloadFile(file.id, owner.accessToken).expect(200);
    expect((download.body as Buffer).equals(content)).toBe(true);
  });
});
