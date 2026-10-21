import { neon } from "@neondatabase/serverless";
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured.");
  return neon(process.env.DATABASE_URL);
}
export function configured() {
  return !!(
    process.env.DATABASE_URL &&
    process.env.BLOB_READ_WRITE_TOKEN &&
    process.env.RESEND_API_KEY &&
    process.env.MAIL_FROM &&
    process.env.SESSION_SECRET &&
    process.env.OWNER_EMAIL
  );
}
