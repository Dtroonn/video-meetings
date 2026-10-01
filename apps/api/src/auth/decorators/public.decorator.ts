import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opens a route (or every route of a controller) to unauthenticated requests. Everything else
 * requires an access token, because `AccessTokenGuard` is registered globally.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
