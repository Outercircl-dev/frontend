import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildApiUrl } from '@/lib/utils/api-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * GET /api/v1/profile
 * 
 * Proxies to NestJS backend profile endpoint.
 * 
 * Architecture:
 * 1. Get Supabase session from cookies
 * 2. Extract access token
 * 3. Call backend /api/profile with Bearer token
 * 4. Return profile data
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Get Supabase client (uses request cookies)
    const supabase = await createClient();

    // 2. Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No valid session' },
        { status: 401 }
      );
    }

    const accessToken = session.access_token;

    // 3. Call backend /api/profile endpoint with Bearer token
    if (!API_URL) {
      console.error('NEXT_PUBLIC_API_URL is not configured');
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const backendResponse = await fetch(buildApiUrl(API_URL, 'profile'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend /api/profile error:', backendResponse.status, errorText);

      if (backendResponse.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Backend authentication failed' },
          { status: 401 }
        );
      }

      if (backendResponse.status === 404) {
        // Profile doesn't exist yet - not an error
        return NextResponse.json(
          { profile: null, error: null },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend request failed' },
        { status: 500 }
      );
    }

    const profileData = await backendResponse.json();

    return NextResponse.json({ profile: profileData, error: null }, { status: 200 });

  } catch (error) {
    console.error('Error in GET /api/v1/profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/profile
 * 
 * Proxies to NestJS backend profile endpoint to create/update profile.
 * 
 * Architecture:
 * 1. Get Supabase session from cookies
 * 2. Extract access token
 * 3. Call backend /api/profile with Bearer token and profile data
 * 4. Return result
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Get Supabase client (uses request cookies)
    const supabase = await createClient();

    // 2. Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No valid session' },
        { status: 401 }
      );
    }

    const accessToken = session.access_token;

    // 3. Get profile data from request body
    const profileData = await request.json();

    // 4. Call backend /api/profile endpoint with Bearer token
    if (!API_URL) {
      console.error('NEXT_PUBLIC_API_URL is not configured');
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for POST

    const backendResponse = await fetch(buildApiUrl(API_URL, 'profile'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend /api/profile POST error:', backendResponse.status, errorText);

      if (backendResponse.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Backend authentication failed' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to save profile' },
        { status: 500 }
      );
    }

    const result = await backendResponse.json();

    return NextResponse.json({ success: true, profile: result }, { status: 200 });

  } catch (error) {
    console.error('Error in POST /api/v1/profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/profile
 * 
 * Proxies to NestJS backend profile endpoint to update profile.
 */
export async function PUT(request: NextRequest) {
  try {
    // 1. Get Supabase client (uses request cookies)
    const supabase = await createClient();

    // 2. Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No valid session' },
        { status: 401 }
      );
    }

    const accessToken = session.access_token;

    // 3. Get profile data from request body
    const profileData = await request.json();

    // 4. Call backend /api/profile endpoint with Bearer token
    if (!API_URL) {
      console.error('NEXT_PUBLIC_API_URL is not configured');
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for PUT

    const backendResponse = await fetch(buildApiUrl(API_URL, 'profile'), {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend /api/profile PUT error:', backendResponse.status, errorText);

      if (backendResponse.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Backend authentication failed' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to update profile' },
        { status: 500 }
      );
    }

    const result = await backendResponse.json();

    return NextResponse.json({ success: true, profile: result }, { status: 200 });

  } catch (error) {
    console.error('Error in PUT /api/v1/profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/profile
 * 
 * OD-189: Edit profile - Proxies to NestJS backend profile endpoint for partial updates.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No valid session' },
        { status: 401 }
      );
    }

    const accessToken = session.access_token;
    const profileData = await request.json();

    if (!API_URL) {
      console.error('NEXT_PUBLIC_API_URL is not configured');
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const backendResponse = await fetch(buildApiUrl(API_URL, 'profile'), {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend /api/profile PATCH error:', backendResponse.status, errorText);

      if (backendResponse.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Backend authentication failed' },
          { status: 401 }
        );
      }

      if (backendResponse.status === 400) {
        return NextResponse.json(
          { error: 'Bad Request', message: errorText },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to update profile' },
        { status: 500 }
      );
    }

    const result = await backendResponse.json();
    return NextResponse.json({ success: true, profile: result }, { status: 200 });

  } catch (error) {
    console.error('Error in PATCH /api/v1/profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/profile
 * 
 * OD-190: Delete profile - Proxies to NestJS backend profile endpoint to delete profile.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No valid session' },
        { status: 401 }
      );
    }

    const accessToken = session.access_token;

    if (!API_URL) {
      console.error('NEXT_PUBLIC_API_URL is not configured');
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const backendResponse = await fetch(buildApiUrl(API_URL, 'profile'), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend /api/profile DELETE error:', backendResponse.status, errorText);

      if (backendResponse.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Backend authentication failed' },
          { status: 401 }
        );
      }

      if (backendResponse.status === 404) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Profile not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to delete profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Profile deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error in DELETE /api/v1/profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


