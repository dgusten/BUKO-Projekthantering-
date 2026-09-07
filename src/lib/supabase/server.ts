import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// For use in Server Components / Server Actions - respects the signed-in
// user's own session (cookie-based), so Supabase's row-level security (once
// enabled) applies normally.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, not a Server Action/Route
          // Handler - cookies can't be set there. The proxy (middleware)
          // refreshes the session cookie instead, so this is safe to ignore.
        }
      },
    },
  });
}

// Bypasses RLS entirely - only for trusted server-side admin operations
// (the seed script creating auth users, and file upload/delete in
// actions.ts). Never expose SUPABASE_SECRET_KEY to the client.
export function createAdminSupabaseClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Ärendebilagor (ritningar/PDF/bilder). Public bucket - same security level
// as the old public/uploads/ setup (a random-UUID filename is unguessable,
// but anyone with the exact URL can fetch it without being logged in).
// Move to a private bucket + signed URLs later if that's not good enough.
export const FILES_BUCKET = "case-files";

export async function ensureStorageBucket() {
  const supabaseAdmin = createAdminSupabaseClient();
  // Check first rather than create-and-swallow-the-error: the exact error
  // message/code Storage returns for "already exists" isn't part of the
  // client's public types, so matching against it would be guesswork.
  const { data: existing } = await supabaseAdmin.storage.getBucket(FILES_BUCKET);
  if (existing) return;
  const { error } = await supabaseAdmin.storage.createBucket(FILES_BUCKET, { public: true });
  if (error) throw error;
}
