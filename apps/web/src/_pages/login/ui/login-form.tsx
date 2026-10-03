'use client';

import { Button, FieldError, Form, Input, Label, TextField } from '@heroui/react';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { useMemo, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { Dictionary } from '@/shared/i18n';
import { PasswordInput } from '@/shared/ui';
import { login } from '../api/login';
import {
  createLoginSchema,
  type LoginFormInput,
  type LoginFormMessages,
  type LoginFormOutput,
} from '../model/login-form';

const fields = [
  { name: 'email', type: 'email', autoComplete: 'email' },
  { name: 'password', type: 'password', autoComplete: 'current-password' },
] as const;

interface LoginFormProps {
  /** Where to go after logging in. */
  from: string;
  /** The form's texts in the user's locale, passed down by the page. */
  messages: LoginFormMessages;
  passwordInputLabels: Dictionary['common']['passwordInput'];
}

export function LoginForm({ from, messages, passwordInputLabels }: LoginFormProps) {
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(() => createLoginSchema(messages.validation), [messages.validation]);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormInput, unknown, LoginFormOutput>({
    resolver: valibotResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // On success the Server Function redirects, and isPending stays true until the next page renders.
  const onSubmit = (data: LoginFormOutput) =>
    startTransition(async () => {
      const { code } = await login(data, from);
      setError('root.server', { message: messages.errors[code] });
    });

  return (
    // react-hook-form validates, so the form uses ARIA validation instead of native browser popups.
    <Form
      className="flex flex-col gap-4"
      validationBehavior="aria"
      onSubmit={handleSubmit(onSubmit)}
    >
      {fields.map(({ name, type, autoComplete }) => (
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
              <Label>{messages[name]}</Label>
              {type === 'password' ? (
                <PasswordInput ref={field.ref} labels={passwordInputLabels} />
              ) : (
                <Input ref={field.ref} />
              )}
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
        {messages.submit}
      </Button>
    </Form>
  );
}
