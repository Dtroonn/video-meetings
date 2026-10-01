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
          <Card.Title>Create an account</Card.Title>
          <Card.Description>Sign up to start and join meetings.</Card.Description>
        </Card.Header>
        <Card.Content>
          <RegisterForm />
        </Card.Content>
      </Card>
    </main>
  );
}
