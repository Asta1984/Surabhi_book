import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { extractTokenFromCookie, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = extractTokenFromCookie(cookieHeader);

    if (!token || !verifyToken(token)) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 1) {
      return NextResponse.json(
        { error: 'Query must be at least 1 character' },
        { status: 400 }
      );
    }

    const db = await getDB();
    const usersCollection = db.collection('users');

    // Search for users by username or fullName (case-insensitive)
    const users = await usersCollection
      .find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { fullName: { $regex: query, $options: 'i' } },
        ],
      })
      .project({ _id: 1, username: 1, fullName: 1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      users: users.map((u) => ({
        userId: u._id.toString(),
        username: u.username,
        fullName: u.fullName,
      })),
    });
  } catch (error) {
    console.error('[v0] User search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
