/** The body of an error response: NestJS's default exception shape. */
export interface ApiErrorResponse {
  readonly statusCode: number;
  /** One message, or one per failed field for validation errors (400). */
  readonly message: string | string[];
  readonly error?: string;
}
