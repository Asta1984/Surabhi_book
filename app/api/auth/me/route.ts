import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromCookie, verifyToken } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = extractTokenFromCookie(cookieHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const db = await getDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({
      _id: new ObjectId(decoded.userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      fullName: user.fullName,
    });
  } catch (error) {
    console.error('[v0] Get current user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
