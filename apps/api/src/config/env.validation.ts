import { Type, plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  /** Access token lifetime, in seconds. */
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  JWT_ACCESS_TTL: number = 15 * 60;

  /** Refresh token lifetime, in seconds. */
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  JWT_REFRESH_TTL: number = 7 * 24 * 60 * 60;
}

/** Validates `process.env` at startup, so a missing or malformed variable fails fast. */
export const validateEnv = (config: Record<string, unknown>): EnvironmentVariables => {
  const env = plainToInstance(EnvironmentVariables, config);
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment variables:\n${errors.toString()}`);
  }
  return env;
};
