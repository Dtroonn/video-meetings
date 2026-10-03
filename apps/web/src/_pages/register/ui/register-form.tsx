'use client';

import { Button, FieldError, Form, Input, Label, TextField } from '@heroui/react';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { useMemo, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { Dictionary } from '@/shared/i18n';
import { PasswordInput } from '@/shared/ui';
import { register } from '../api/register';
import {
  createRegisterSchema,
  type RegisterFormInput,
  type RegisterFormMessages,
  type RegisterFormOutput,
} from '../model/register-form';

const fields = [
  { name: 'email', type: 'email', autoComplete: 'email' },
  { name: 'password', type: 'password', autoComplete: 'new-password' },
  { name: 'confirmPassword', type: 'password', autoComplete: 'new-password' },
] as const;

interface RegisterFormProps {
  /** Where to go after signing up. */
  from: string;
  /** The form's texts in the user's locale, passed down by the page. */
  messages: RegisterFormMessages;
  passwordInputLabels: Dictionary['common']['passwordInput'];
}

export function RegisterForm({ from, messages, passwordInputLabels }: RegisterFormProps) {
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(() => createRegisterSchema(messages.validation), [messages.validation]);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormInput, unknown, RegisterFormOutput>({
    resolver: valibotResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
    // With the default 'firstError', the resolver sets valibot's abortPipeEarly, so any field
    // issue (e.g. an empty email) stops the schema before the passwords-match check runs.
    criteriaMode: 'all',
  });

  // On success the Server Function redirects, and isPending stays true until the next page renders.
  const onSubmit = (data: RegisterFormOutput) =>
    startTransition(async () => {
      const { code } = await register(data, from);
      // A taken email belongs to the email field; everything else is about the whole form.
      setError(
        code === 'emailTaken' ? 'email' : 'root.server',
        { message: messages.errors[code] },
        { shouldFocus: true },
      );
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
          // Changing the password re-checks the confirmation, so "Passwords do not match"
          // appears or clears as either field changes (after the first submit, like the rest).
          rules={name === 'password' ? { deps: 'confirmPassword' } : undefined}
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
