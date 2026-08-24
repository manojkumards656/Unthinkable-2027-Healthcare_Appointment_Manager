import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/google-calendar/client';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state');

  if (!code || !userId) {
    return NextResponse.redirect(new URL('/en?error=missing_oauth_params', request.url));
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (tokens.refresh_token) {
      await db
        .update(users)
        .set({ googleCalendarRefreshToken: tokens.refresh_token })
        .where(eq(users.id, userId));
    }

    return NextResponse.redirect(new URL('/en/dashboard/patient?calendar=connected', request.url));
  } catch (error: any) {
    console.error('Google Calendar OAuth callback error:', error);
    return NextResponse.redirect(new URL('/en?error=calendar_connection_failed', request.url));
  }
}
