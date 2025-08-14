// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE!; // server-only

// Use ONLY on the server (API routes, server actions)
export const supabaseAdmin = () => createClient(url, service);
