'use client';

import { CircleCheckFill } from '@gravity-ui/icons';
import { Button, Description, FieldError, Form, Label, TextField } from '@heroui/react';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@video-meetings/contracts';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { formatMessage, type Dictionary } from '@/shared/i18n';
import { PasswordInput } from '@/shared/ui';
import { changePassword } from '../api/change-password';
import {
  EMPTY_PASSWORD_FORM,
  createPasswordSchema,
  toChangePasswordRequest,
  type PasswordFormInput,
  type PasswordFormMessages,
  type PasswordFormOutput,
} from '../model/password-form';

const fields = [
  { name: 'currentPassword', autoComplete: 'current-password' },
  { name: 'newPassword', autoComplete: 'new-password' },
  { name: 'confirmNewPassword', autoComplete: 'new-password' },
] as const;

interface PasswordFormProps {
  /** The form's texts in the user's locale, passed down by the page. */
  messages: PasswordFormMessages;
  passwordInputLabels: Dictionary['common']['passwordInput'];
}

/**
 * Changes the signed-in user's password: the current one, the new one and its confirmation, each
 * with a show/hide toggle. The schema blocks submitting a confirmation that differs or a new
 * password outside the length limits. On success the session cookies hold the api's new tokens (this
 * browser stays signed in, other sessions are ended) and the form is cleared; a wrong current
 * password shows on its field; any other failure keeps the input and offers a retry.
 */
export function PasswordForm({ messages, passwordInputLabels }: PasswordFormProps) {
  const [result, setResult] = useState<'changed' | 'failed' | null>(null);
  const schema = useMemo(() => createPasswordSchema(messages.validation), [messages.validation]);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting, isDirty },
  } = useForm<PasswordFormInput, unknown, PasswordFormOutput>({
    resolver: valibotResolver(schema),
    defaultValues: EMPTY_PASSWORD_FORM,
    // With the default 'firstError', an empty current password would hide "Passwords do not match".
    criteriaMode: 'all',
  });

  const submit = handleSubmit(async (values) => {
    setResult(null);
    let error;
    try {
      error = await changePassword(toChangePasswordRequest(values));
    } catch {
      // The Server Function couldn't be reached (network) or crashed.
      setResult('failed');
      return;
    }
    if (!error) {
      reset(EMPTY_PASSWORD_FORM);
      setResult('changed');
    } else if (error.code === 'wrongCurrentPassword') {
      setError(
        'currentPassword',
        { message: messages.errors.wrongCurrentPassword },
        { shouldFocus: true },
      );
    } else {
      setResult('failed');
    }
  });

  return (
    // react-hook-form validates, so the form uses ARIA validation instead of native browser popups.
    <Form className="flex flex-col gap-6" validationBehavior="aria" onSubmit={submit}>
      {fields.map(({ name, autoComplete }) => (
        <Controller
          key={name}
          control={control}
          name={name}
          // Changing the new password re-checks the confirmation, so "Passwords do not match"
          // appears or clears as either field changes (after the first submit, like the rest).
          rules={name === 'newPassword' ? { deps: 'confirmNewPassword' } : undefined}
          render={({ field, fieldState }) => (
            <TextField
              fullWidth
              isRequired
              autoComplete={autoComplete}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              isDisabled={field.disabled}
              isInvalid={fieldState.invalid}
            >
              <Label>{messages[name]}</Label>
              <PasswordInput ref={field.ref} labels={passwordInputLabels} />
              {name === 'newPassword' && (
                <Description>
                  {formatMessage(messages.newPasswordHint, {
                    min: PASSWORD_MIN_LENGTH,
                    max: PASSWORD_MAX_LENGTH,
                  })}
                </Description>
              )}
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
      ))}
      {result === 'failed' && (
        <div role="alert" className="text-danger flex flex-wrap items-center gap-2 text-sm">
          {messages.errors.failed}
          <Button size="sm" variant="secondary" isDisabled={isSubmitting} onPress={() => submit()}>
            {messages.retry}
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" isPending={isSubmitting}>
          {messages.submit}
        </Button>
        {/* Always rendered, so screen readers announce the text when it appears. */}
        <p role="status" className="flex items-center gap-1.5 text-sm">
          {result === 'changed' && !isDirty && (
            <>
              {/* HeroUI's green is too light for text (~2.2:1 on white), so only the icon is green. */}
              <CircleCheckFill aria-hidden className="text-success size-4 shrink-0" />
              {messages.changed}
            </>
          )}
        </p>
      </div>
    </Form>
  );
}
