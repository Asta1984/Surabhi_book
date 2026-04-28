import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { extractTokenFromCookie, verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
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

    const { content, targetUserId, taggedUsers, idempotencyKey } = await request.json();

    // Validation
    if (!content || !targetUserId) {
      return NextResponse.json(
        { error: 'Content and targetUserId are required' },
        { status: 400 }
      );
    }

    if (content.length > 50) {
      return NextResponse.json(
        { error: 'Post content must be 50 words or less' },
        { status: 400 }
      );
    }

    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount > 50) {
      return NextResponse.json(
        { error: 'Post exceeds 50 word limit' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(targetUserId)) {
      return NextResponse.json(
        { error: 'Invalid target user ID' },
        { status: 400 }
      );
    }

    const db = await getDB();
    const postsCollection = db.collection('posts');

    // Check for idempotency - prevent duplicate posts
    if (idempotencyKey) {
      const existingPost = await postsCollection.findOne({
        idempotencyKey,
      });

      if (existingPost) {
        return NextResponse.json(
          {
            message: 'Post already exists (idempotent)',
            postId: existingPost._id.toString(),
          },
          { status: 200 }
        );
      }
    }

    // Verify target user exists
    const usersCollection = db.collection('users');
    const targetUser = await usersCollection.findOne({
      _id: new ObjectId(targetUserId),
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Create post
    const post = {
      authorId: new ObjectId(decoded.userId),
      targetUserId: new ObjectId(targetUserId),
      content,
      taggedUsers: (taggedUsers || []).map((uid: string) => new ObjectId(uid)),
      idempotencyKey: idempotencyKey || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await postsCollection.insertOne(post);

    return NextResponse.json(
      {
        message: 'Post created successfully',
        postId: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Post creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
