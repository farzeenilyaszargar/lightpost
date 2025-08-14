// lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Read from .env.local
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * A single helper you can call anywhere.
 * Works in Client Components, Server Components, and Route Handlers.
 * (We’re skipping SSR cookie-plumbing to avoid the typing issues.)
 */
export function supa(): SupabaseClient {
  return createClient(url, anon);
}

// OPTIONAL: If you prefer names similar to earlier steps
export const supabaseBrowser = supa;
export const supabaseServer = supa;
