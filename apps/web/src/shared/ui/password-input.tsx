'use client';

import { Eye, EyeSlash } from '@gravity-ui/icons';
import { Button, InputGroup } from '@heroui/react';
import { useState, type Ref } from 'react';

interface PasswordInputProps {
  ref?: Ref<HTMLInputElement>;
}

/**
 * A password input for use inside a `TextField`, with a button that shows or hides the value.
 * The icon shows the action the button performs (eye = show), and the label says it in words.
 */
export function PasswordInput({ ref }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <InputGroup>
      <InputGroup.Input ref={ref} type={isVisible ? 'text' : 'password'} />
      <InputGroup.Suffix className="pe-0">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          onPress={() => setIsVisible((visible) => !visible)}
        >
          {isVisible ? (
            <EyeSlash aria-hidden className="size-4" />
          ) : (
            <Eye aria-hidden className="size-4" />
          )}
        </Button>
      </InputGroup.Suffix>
    </InputGroup>
  );
}
