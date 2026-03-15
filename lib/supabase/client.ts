import { createBrowserClient } from "@supabase/ssr";

/** Placeholder used when env vars are missing (e.g. during Cloudflare build without build env vars). */
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDIxNjIwMDAsImV4cCI6MTk1NzczODAwMH0.x";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? PLACEHOLDER_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? PLACEHOLDER_ANON_KEY;
  return createBrowserClient(url, anonKey);
}
