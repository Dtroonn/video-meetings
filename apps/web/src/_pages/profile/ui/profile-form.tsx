'use client';

import { CircleCheckFill } from '@gravity-ui/icons';
import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextField,
} from '@heroui/react';
import { valibotResolver } from '@hookform/resolvers/valibot';
import {
  DATE_OF_BIRTH_MIN,
  GENDERS,
  NAME_MAX_LENGTH,
  type UserResponse,
} from '@video-meetings/contracts';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useUserStore } from '@/entities/user';
import { formatMessage } from '@/shared/i18n';
import { updateProfile } from '../api/update-profile';
import {
  GENDER_NOT_SPECIFIED,
  createProfileSchema,
  toProfileFormValues,
  todayUtc,
  type ProfileFormInput,
  type ProfileFormMessages,
  type ProfileFormOutput,
} from '../model/profile-form';

const GENDER_OPTIONS = [...GENDERS, GENDER_NOT_SPECIFIED] as const;

interface ProfileFormProps {
  user: UserResponse;
  /** The form's texts in the user's locale, passed down by the page. */
  messages: ProfileFormMessages;
}

/**
 * The email (read-only) and a form for the user's name, date of birth and gender, filled with the
 * current values. Saving updates the user store, so the header and the dashboard greeting follow;
 * if saving fails, the store keeps the previous values, the form keeps the input, and an error
 * offers a retry.
 */
export function ProfileForm({ user, messages }: ProfileFormProps) {
  const setUser = useUserStore((state) => state.setUser);
  const [result, setResult] = useState<'saved' | 'error' | null>(null);
  // Fixed for the form's life: a page left open past midnight (UTC) still allows yesterday's max.
  const [today] = useState(() => todayUtc());
  const schema = useMemo(
    () => createProfileSchema(messages.validation, today),
    [messages.validation, today],
  );
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<ProfileFormInput, unknown, ProfileFormOutput>({
    resolver: valibotResolver(schema),
    defaultValues: toProfileFormValues(user),
  });

  const submit = handleSubmit(async (body) => {
    setResult(null);
    try {
      const updated = await updateProfile(body);
      setUser(updated);
      // The saved values (e.g. the trimmed name) become the form's new starting point.
      // Fields edited while the request was in flight keep their input and stay dirty.
      reset(toProfileFormValues(updated), { keepDirtyValues: true });
      setResult('saved');
    } catch {
      // A 401 that couldn't be refreshed already redirected to login; anything else can be retried.
      setResult('error');
    }
  });

  return (
    // react-hook-form validates, so the form uses ARIA validation instead of native browser popups.
    <Form className="flex flex-col gap-6" validationBehavior="aria" onSubmit={submit}>
      <TextField fullWidth isReadOnly type="email" value={user.email}>
        <Label>{messages.email}</Label>
        <Input className="text-muted" />
        <Description>{messages.emailHint}</Description>
      </TextField>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            fullWidth
            autoComplete="name"
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            isDisabled={field.disabled}
            isInvalid={fieldState.invalid}
          >
            <Label>{messages.name}</Label>
            <Input ref={field.ref} />
            <Description>{formatMessage(messages.nameHint, { max: NAME_MAX_LENGTH })}</Description>
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />
      <Controller
        control={control}
        name="dateOfBirth"
        render={({ field, fieldState }) => (
          <TextField
            fullWidth
            type="date"
            autoComplete="bday"
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            isDisabled={field.disabled}
            isInvalid={fieldState.invalid}
          >
            <Label>{messages.dateOfBirth}</Label>
            {/* The browser's date picker; an empty value clears the date. */}
            <Input ref={field.ref} className="sm:max-w-56" min={DATE_OF_BIRTH_MIN} max={today} />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />
      <Controller
        control={control}
        name="gender"
        render={({ field, fieldState }) => (
          <RadioGroup
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            isDisabled={field.disabled}
            isInvalid={fieldState.invalid}
            orientation="horizontal"
            className="flex-col items-start gap-2"
          >
            {/* The label on its own line, like the other fields'; the options in a row below. */}
            <Label>{messages.gender}</Label>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {GENDER_OPTIONS.map((gender) => (
                <Radio key={gender} value={gender}>
                  <Radio.Content>
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    {messages.genders[gender]}
                  </Radio.Content>
                </Radio>
              ))}
            </div>
            <FieldError>{fieldState.error?.message}</FieldError>
          </RadioGroup>
        )}
      />
      {result === 'error' && (
        <div role="alert" className="text-danger flex flex-wrap items-center gap-2 text-sm">
          {messages.saveError}
          <Button size="sm" variant="secondary" isDisabled={isSubmitting} onPress={() => submit()}>
            {messages.retry}
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" isPending={isSubmitting}>
          {messages.save}
        </Button>
        {/* Always rendered, so screen readers announce the text when it appears. */}
        <p role="status" className="flex items-center gap-1.5 text-sm">
          {result === 'saved' && !isDirty && (
            <>
              {/* HeroUI's green is too light for text (~2.2:1 on white), so only the icon is green. */}
              <CircleCheckFill aria-hidden className="text-success size-4 shrink-0" />
              {messages.saved}
            </>
          )}
        </p>
      </div>
    </Form>
  );
}
