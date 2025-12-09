import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { getRedirectUrlForState, getUserAuthState } from '@/lib/auth-state-machine';

interface AuthMeResponse {
  state: string;
  redirectUrl: string;
  user: {
    id: string;
    email: string;
    supabaseUserId: string;
  };
  profile?: {
    emailVerified: boolean;
    profileCompleted: boolean;
  };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No auth header' },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('supabase_user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = not found (new users) — treat as no profile
      console.error('Profile error:', profileError);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }

    const state = getUserAuthState(
      profile?.email_verified ?? false,
      profile?.profile_completed ?? false
    );
    const redirectUrl = getRedirectUrlForState(state);

    const response: AuthMeResponse = {
      state,
      redirectUrl,
      user: {
        id: user.id,
        email: user.email || '',
        supabaseUserId: user.id,
      },
      profile: {
        emailVerified: profile?.email_verified ?? false,
        profileCompleted: profile?.profile_completed ?? false,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/v1/auth/me:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

