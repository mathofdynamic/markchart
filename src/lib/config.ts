/**
 * Public client configuration.
 * The Google OAuth Client ID is public by design (it is sent to the browser
 * during sign-in), but we still keep it out of source control and inject it at
 * build time via a Vite env var. The OAuth *client secret* is never used here.
 *
 * Set VITE_GOOGLE_CLIENT_ID in a local `.env` (see `.env.example`).
 */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
