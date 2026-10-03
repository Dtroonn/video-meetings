'use client';

import { Button } from '@heroui/react';

/**
 * Reloads the current URL. The proxy shows this page through a rewrite, so the URL is still the
 * one the user asked for and a reload retries it.
 */
export function RetryButton() {
  return (
    <Button variant="primary" fullWidth onPress={() => window.location.reload()}>
      Try again
    </Button>
  );
}
