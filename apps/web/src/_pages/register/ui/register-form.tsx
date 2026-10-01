'use client';

import { Button, FieldError, Form, Input, Label, TextField } from '@heroui/react';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { Controller, useForm } from 'react-hook-form';
import { registerUser } from '../api/register';
import {
  registerSchema,
  type RegisterFormInput,
  type RegisterFormOutput,
} from '../model/register-form';
import { PasswordInput } from './password-input';

const fields = [
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password' },
  {
    name: 'confirmPassword',
    label: 'Confirm password',
    type: 'password',
    autoComplete: 'new-password',
  },
] as const;

export function RegisterForm() {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterFormInput, unknown, RegisterFormOutput>({
    resolver: valibotResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
    // With the default 'firstError', the resolver sets valibot's abortPipeEarly, so any field
    // issue (e.g. an empty email) stops the schema before the passwords-match check runs.
    criteriaMode: 'all',
  });

  const onSubmit = async ({ email, password }: RegisterFormOutput) => {
    try {
      const result = await registerUser({ email, password });
      console.log('POST /auth/register', result);
    } catch (error) {
      console.error('POST /auth/register failed', error);
    }
  };

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
              <Label>{label}</Label>
              {type === 'password' ? <PasswordInput ref={field.ref} /> : <Input ref={field.ref} />}
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
      ))}
      <Button type="submit" variant="primary" fullWidth isPending={isSubmitting}>
        Create account
      </Button>
    </Form>
  );
}
