/** A user as sent to clients. Dates are ISO 8601 strings, as they arrive over JSON. */
export interface UserResponse {
  readonly id: string;
  readonly email: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
