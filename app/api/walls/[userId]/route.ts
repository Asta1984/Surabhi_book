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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const db = await getDB();
    const postsCollection = db.collection('posts');
    const usersCollection = db.collection('users');

    // Verify user exists
    const targetUser = await usersCollection.findOne({
      _id: new ObjectId(userId),
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get posts for user's wall
    const posts = await postsCollection
      .find({
        targetUserId: new ObjectId(userId),
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Enrich posts with author information
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const author = await usersCollection.findOne({
          _id: new ObjectId(post.authorId),
        });

        const taggedUsers = await Promise.all(
          (post.taggedUsers || []).map(async (taggedId: ObjectId) => {
            const user = await usersCollection.findOne({
              _id: taggedId,
            });
            return {
              userId: user?._id.toString(),
              username: user?.username,
              fullName: user?.fullName,
            };
          })
        );

        return {
          postId: post._id.toString(),
          authorId: post.authorId.toString(),
          author: {
            username: author?.username,
            fullName: author?.fullName,
          },
          content: post.content,
          taggedUsers,
          createdAt: post.createdAt,
        };
      })
    );

    // Get total count for pagination
    const totalCount = await postsCollection.countDocuments({
      targetUserId: new ObjectId(userId),
    });

    return NextResponse.json({
      posts: enrichedPosts,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('[v0] Wall feed error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
