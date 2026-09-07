import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Called "Proxy" in Next.js 16 (was "Middleware" in earlier versions, same
// mechanism). Refreshes the Supabase auth cookie on every request so a
// user's session doesn't silently expire mid-visit - the actual "are you
// logged in" check still happens per-page via requireUser(), this is only
// the token refresh (Supabase's own guidance: don't rely on this alone for
// authorization).
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
