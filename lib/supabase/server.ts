import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

type CookieAdapter = NonNullable<Parameters<typeof createServerClient>[2]>["cookies"];
// Explicit cookie shape to avoid optional setAll typing issues in @supabase/ssr
export type SupabaseCookie = { name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] };

export function createClient(cookieAdapter: CookieAdapter) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: cookieAdapter,
        }
    );
}

export function createRouteHandlerClient(request: NextRequest, response: NextResponse) {
    return createClient({
        getAll() {
            return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
            );
        },
    });
}

export function createServerActionClient(cookieStore: { getAll: () => any; set: (name: string, value: string, options?: SupabaseCookie["options"]) => void }) {
    return createClient({
        getAll() {
            return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
    });
}