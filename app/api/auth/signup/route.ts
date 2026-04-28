import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { sessionCache } from '@/lib/lru-cache';

export async function POST(request: NextRequest) {
  try {
    const { email, username, password, fullName } = await request.json();

    // Validation
    if (!email || !username || !password || !fullName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    const db = await getDB();
    const usersCollection = db.collection('users');

    // Check if user exists
    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email or username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await usersCollection.insertOne({
      email,
      username,
      password: hashedPassword,
      fullName,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userId = result.insertedId.toString();

    // Generate token
    const token = generateToken({ userId, email, username });

    // Cache session
    sessionCache.set(userId, { userId, email, username, createdAt: Date.now() });

    // Set cookie
    const response = NextResponse.json(
      { message: 'User created successfully', userId, username },
      { status: 201 }
    );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
