import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('AuthCallback: Processing callback');
  const requestUrl = new URL(request.url);
  
  // Check for query parameters (standard OAuth flow)
  let code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  let error = requestUrl.searchParams.get('error');
  let errorDescription = requestUrl.searchParams.get('error_description');
  
  // Check for URL fragments (Supabase OAuth flow)
  let accessToken = requestUrl.searchParams.get('access_token');
  let refreshToken = requestUrl.searchParams.get('refresh_token');
  
  // If no query params, check if this might be a fragment-based callback
  if (!code && !accessToken && !error) {
    // Return a page that handles fragment-based tokens
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Processing login...</title>
        </head>
        <body>
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: system-ui;">
            <div style="text-align: center;">
              <div style="margin-bottom: 16px;">Processing your login...</div>
              <div style="width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            </div>
          </div>
          <style>
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
          <script>
            // Handle fragment-based OAuth tokens
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const error = params.get('error');
            
            if (accessToken && refreshToken) {
              // Convert fragment to query params and reload
              window.location.href = '/auth/callback?access_token=' + encodeURIComponent(accessToken) + '&refresh_token=' + encodeURIComponent(refreshToken);
            } else if (error) {
              window.location.href = '/login?error=' + encodeURIComponent(error);
            } else {
              window.location.href = '/login?error=no-tokens';
            }
          </script>
        </body>
      </html>
    `, {
      headers: { 'content-type': 'text/html' },
    });
  }
  
  console.log('AuthCallback: Full URL:', request.url);
  console.log('AuthCallback: Code present:', !!code);
  console.log('AuthCallback: Access token present:', !!accessToken);
  console.log('AuthCallback: Error:', error);
  console.log('AuthCallback: Error Description:', errorDescription);

  if (code) {
    console.log('AuthCallback: Exchanging code for session');
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('AuthCallback: Error:', error);
      return NextResponse.redirect(new URL('/login?error=auth-failed', requestUrl.origin));
    }

    // Redirect to the next page if provided, otherwise go to home
    if (next) {
      console.log('AuthCallback: Redirecting to:', next);
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    console.log('AuthCallback: Success, redirecting to home');
    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
  }

  // Handle direct access token (from fragment conversion)
  if (accessToken && refreshToken) {
    console.log('AuthCallback: Setting session with tokens');
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    if (error) {
      console.error('AuthCallback: Session error:', error);
      return NextResponse.redirect(new URL('/login?error=session-failed', requestUrl.origin));
    }

    console.log('AuthCallback: Session set successfully, user:', data.user?.email);
    console.log('AuthCallback: Session data:', !!data.session);
    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
  }

  // Handle OAuth errors from provider
  if (error) {
    console.log('AuthCallback: OAuth error received:', error, errorDescription);
    return NextResponse.redirect(new URL(`/login?error=${error}&description=${encodeURIComponent(errorDescription || '')}`, requestUrl.origin));
  }

  console.log('AuthCallback: No code present, redirecting to login');
  return NextResponse.redirect(new URL('/login?error=no-code', requestUrl.origin));
} 