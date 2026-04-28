import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { extractTokenFromCookie, verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = extractTokenFromCookie(cookieHeader);

    if (!token || !verifyToken(token)) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { userId } = await params;

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const db = await getDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('[v0] Get user profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
