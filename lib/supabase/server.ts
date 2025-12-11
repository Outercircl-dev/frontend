import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
    let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null

    try {
        // cookies() throws if there is no active request context (e.g., certain AWS edge paths)
        cookieStore = await cookies()
    } catch (error) {
        console.error('SUPABASE_SERVER_CLIENT: cookies() unavailable; proceeding without request cookie store', error)
    }

    if (cookieStore) {
        const store = cookieStore
        return createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            {
                cookies: {
                    getAll() {
                        return store.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options))
                        } catch (error) {
                            console.error('SUPABASE_SERVER_CLIENT: cookies set in server. Please use NextJS Proxy to refresh', error)
                        }
                    }
                }
            }
        )
    }

    // Fallback for environments where request cookies aren't available; we still return a client
    // for non-session flows (e.g., sign-in with email) without persisting cookies.
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return []
                },
                setAll() {
                    // no-op
                }
            }
        }
    )
}