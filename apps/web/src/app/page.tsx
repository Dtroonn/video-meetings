import { Card } from '@heroui/react';

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Video Meetings</Card.Title>
          <Card.Description>Start or join a meeting.</Card.Description>
        </Card.Header>
      </Card>
    </main>
  );
}
