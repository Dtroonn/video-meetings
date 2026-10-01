import { Card } from '@heroui/react';
import type { Metadata } from 'next';
import { RegisterForm } from './register-form';

export const metadata: Metadata = {
  title: 'Create account · Video Meetings',
};

export function RegisterPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Header>
          {/* A plain h1, not Card.Title (an h3): this is the page's main heading. */}
          <h1 className="text-xl font-semibold text-foreground">Create an account</h1>
          <Card.Description>Sign up to start and join meetings.</Card.Description>
        </Card.Header>
        <Card.Content>
          <RegisterForm />
        </Card.Content>
      </Card>
    </main>
  );
}
