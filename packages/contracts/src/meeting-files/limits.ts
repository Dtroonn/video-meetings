/**
 * Largest chunk the api accepts in one upload request. Clients send chunks of exactly this size
 * (the last one may be smaller), so a 100 MB file takes 20 requests.
 */
export const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024;
export const FILE_NAME_MAX_LENGTH = 255;
/** Upper bound for the MIME type a client reports. */
export const FILE_TYPE_MAX_LENGTH = 255;
