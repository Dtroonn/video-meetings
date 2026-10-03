'use client';

import { Button, FieldError, Form, Input, Label, TextField } from '@heroui/react';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { PasswordInput } from '@/shared/ui';
import { login } from '../api/login';
import { loginSchema, type LoginFormInput, type LoginFormOutput } from '../model/login-form';

const fields = [
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
] as const;

interface LoginFormProps {
  /** Where to go after logging in. */
  from: string;
}

export function LoginForm({ from }: LoginFormProps) {
  const [isPending, startTransition] = useTransition();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormInput, unknown, LoginFormOutput>({
    resolver: valibotResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // On success the Server Function redirects, and isPending stays true until the next page renders.
  const onSubmit = (data: LoginFormOutput) =>
    startTransition(async () => {
      const error = await login(data, from);
      setError('root.server', { message: error.message });
    });

  return (
    // react-hook-form validates, so the form uses ARIA validation instead of native browser popups.
    <Form
      className="flex flex-col gap-4"
      validationBehavior="aria"
      onSubmit={handleSubmit(onSubmit)}
    >
      {fields.map(({ name, label, type, autoComplete }) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field, fieldState }) => (
            <TextField
              fullWidth
              isRequired
              // PasswordInput sets its own type, switching between password and text.
              type={type === 'password' ? undefined : type}
              autoComplete={autoComplete}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              isDisabled={field.disabled}
              isInvalid={fieldState.invalid}
            >
              <Label>{label}</Label>
              {type === 'password' ? <PasswordInput ref={field.ref} /> : <Input ref={field.ref} />}
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
      ))}
      {errors.root?.server && (
        <p role="alert" className="text-sm text-danger">
          {errors.root.server.message}
        </p>
      )}
      <Button type="submit" variant="primary" fullWidth isPending={isPending}>
        Log in
      </Button>
    </Form>
  );
}
