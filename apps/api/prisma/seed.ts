/**
 * Development seed: a few users, meetings and files to log in with and click through locally.
 * Run with `pnpm db:seed` (from the root or `apps/api`). Safe to run again: rows are upserted by
 * fixed ids/emails, so it never duplicates data and resets the seeded rows to the values below.
 * Refuses to run against anything but a local database.
 */
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { MEETING_FILE_TYPES, type MeetingFileExtension } from '@video-meetings/contracts';
import { hash } from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client';

/** One password for every seeded user. Listed in `apps/api/CLAUDE.md` → "Dev seed". */
export const SEED_PASSWORD = 'devpassword123';

const SEED_USERS = ['alice@example.com', 'bob@example.com', 'carol@example.com'] as const;
type SeedUser = (typeof SEED_USERS)[number];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Dates are relative to now, so every run has past, today's and upcoming meetings. */
const SEED_MEETINGS: {
  id: string;
  title: string;
  offset: number;
  owner: SeedUser;
  participants: SeedUser[];
}[] = [
  {
    id: '00000000-0000-7000-8000-000000000101',
    title: 'Sprint retrospective',
    offset: -3 * DAY,
    owner: 'alice@example.com',
    participants: ['bob@example.com', 'carol@example.com'],
  },
  {
    id: '00000000-0000-7000-8000-000000000102',
    title: 'Daily stand-up',
    offset: 2 * HOUR,
    owner: 'alice@example.com',
    participants: ['bob@example.com'],
  },
  {
    id: '00000000-0000-7000-8000-000000000103',
    title: 'Design review',
    offset: 1 * DAY,
    owner: 'bob@example.com',
    participants: ['alice@example.com', 'carol@example.com'],
  },
  {
    id: '00000000-0000-7000-8000-000000000104',
    title: 'Quarterly planning',
    offset: 7 * DAY,
    owner: 'carol@example.com',
    participants: [],
  },
];

/** Completed files, written to `UPLOADS_DIR` too, so downloads work. Uploaders must be members. */
const SEED_FILES: {
  id: string;
  meetingId: string;
  uploader: SeedUser;
  name: string;
  content: string;
}[] = [
  {
    id: '00000000-0000-7000-8000-000000000201',
    meetingId: '00000000-0000-7000-8000-000000000101',
    uploader: 'alice@example.com',
    name: 'retro-notes.md',
    content: '# Retro notes\n\n- Went well: releases\n- To improve: code review times\n',
  },
  {
    id: '00000000-0000-7000-8000-000000000202',
    meetingId: '00000000-0000-7000-8000-000000000103',
    uploader: 'carol@example.com',
    name: 'agenda.txt',
    content: 'Agenda\n1. New meeting page\n2. File list layout\n',
  },
];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function assertLocalDatabase(databaseUrl: string | undefined): string {
  if (!databaseUrl) throw new Error('DATABASE_URL is not set (see apps/api/.env.example)');
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed in production');
  const { hostname } = new URL(databaseUrl);
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`Refusing to seed a non-local database (host "${hostname}")`);
  }
  return databaseUrl;
}

const extensionOf = (name: string) =>
  path.extname(name).slice(1).toLowerCase() as MeetingFileExtension;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: assertLocalDatabase(process.env.DATABASE_URL) }),
});

async function seed() {
  const passwordHash = await hash(SEED_PASSWORD);
  const userIds = new Map<SeedUser, string>();
  // By email, not id: a dev may already have registered one of these emails by hand.
  for (const email of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash },
      update: { passwordHash },
    });
    userIds.set(email, user.id);
  }
  const idOf = (email: SeedUser) => userIds.get(email) as string;

  const now = Date.now();
  for (const meeting of SEED_MEETINGS) {
    const data = {
      title: meeting.title,
      date: new Date(now + meeting.offset),
      ownerId: idOf(meeting.owner),
    };
    await prisma.meeting.upsert({
      where: { id: meeting.id },
      create: { id: meeting.id, ...data },
      update: data,
    });
    await prisma.meetingParticipant.createMany({
      data: meeting.participants.map((email) => ({ meetingId: meeting.id, userId: idOf(email) })),
      skipDuplicates: true,
    });
  }

  const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? 'uploads');
  for (const file of SEED_FILES) {
    // Same key format as `storageKeyFor` in src/meeting-files/meeting-files.mapper.ts.
    const storageKey = `meetings/${file.meetingId}/${file.id}`;
    const target = path.join(uploadsDir, storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content);

    const size = BigInt(Buffer.byteLength(file.content));
    const data = {
      meetingId: file.meetingId,
      uploaderId: idOf(file.uploader),
      name: file.name,
      mimeType: MEETING_FILE_TYPES[extensionOf(file.name)],
      size,
      bytesReceived: size,
      lastModified: new Date(now),
      storageKey,
      status: 'COMPLETED' as const,
      completedAt: new Date(now),
    };
    await prisma.meetingFile.upsert({
      where: { id: file.id },
      create: { id: file.id, ...data },
      update: data,
    });
  }

  console.log(
    `Seeded ${SEED_USERS.length} users, ${SEED_MEETINGS.length} meetings, ${SEED_FILES.length} files.`,
  );
  console.log(`Log in with any of these (password: ${SEED_PASSWORD}):`);
  for (const email of SEED_USERS) console.log(`  ${email}`);
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
