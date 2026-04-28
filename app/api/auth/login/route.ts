import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { sessionCache } from '@/lib/lru-cache';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const db = await getDB();
    const usersCollection = db.collection('users');

    // Find user by email
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate token
    const userId = user._id.toString();
    const token = generateToken({
      userId,
      email: user.email,
      username: user.username,
    });

    // Cache session
    sessionCache.set(userId, {
      userId,
      email: user.email,
      username: user.username,
      createdAt: Date.now(),
    });

    // Set cookie
    const response = NextResponse.json(
      { message: 'Login successful', userId, username: user.username },
      { status: 200 }
    );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[v0] Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
