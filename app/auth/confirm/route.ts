import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const tokenHash = requestUrl.searchParams.get('token_hash');
    console.log(`token_hash: ${tokenHash}`)
    console.log("callback cookies:", request.cookies.getAll().map((c: { name: any; }) => c.name));
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash || 'hash',
        type: 'email'
    })
    console.log('User Data: ', data);
    console.log('User Session: ', data.session?.access_token);
}