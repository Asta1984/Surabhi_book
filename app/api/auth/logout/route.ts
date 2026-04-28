import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromCookie, verifyToken } from '@/lib/auth';
import { sessionCache } from '@/lib/lru-cache';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = extractTokenFromCookie(cookieHeader);

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        // Remove from cache
        sessionCache.delete(decoded.userId);
      }
    }

    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('[v0] Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
