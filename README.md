# Campus Connect - Student Social Network

A modern, lightweight social network platform designed for students to connect, share messages, and build community within their institution.

## Features

### Core Functionality
- **User Authentication**: Custom JWT-based authentication with secure password hashing using bcrypt
- **Post on Walls**: Students can post up to 50-word messages on classmates' walls
- **Mention Tagging**: Tag other students using @mentions with real-time search suggestions
- **User Discovery**: Search and discover students in your institution
- **User Profiles**: View detailed student profiles with wall history

### Performance & Security
- **LRU Cache**: Session caching with LRU eviction (1000 max entries, 1-hour TTL) for optimized auth lookups
- **Idempotent Posts**: Duplicate post prevention using idempotency keys (SHA-256 hash)
- **Secure Sessions**: HTTP-only cookies with proper CSRF protection
- **Password Security**: Bcrypt hashing with 10 salt rounds
- **Input Validation**: Comprehensive field validation on both client and server

## Tech Stack

- **Frontend**: React 19, Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB
- **Authentication**: Custom JWT implementation
- **Caching**: In-memory LRU Cache
- **Security**: bcrypt, jsonwebtoken

## Installation & Setup

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- MongoDB connection string (Atlas or local)

### Environment Variables

Set the following in your project settings:

```
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret-key>
NODE_ENV=development
```

### Development

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
/app
  /api                    # API endpoints
    /auth               # Authentication routes (signup, login, logout, me)
    /users              # User routes (search, profile)
    /posts              # Post creation with idempotency
    /walls              # User wall feeds
  /dashboard            # Main dashboard page
  /profile/[userId]     # User profile & wall page
  /search              # Student discovery page
  /login               # Login page
  /signup              # Signup page
  
/lib
  /auth.ts             # JWT and password utilities
  /db.ts               # MongoDB connection and setup
  /lru-cache.ts        # LRU Cache implementation
  /auth-context.tsx    # React auth context & hooks
  /protected-route.tsx # Auth protection wrapper
  
/components
  /post-form.tsx       # Post creation with @mentions
  /post-card.tsx       # Post display component
  /ui/*                # shadcn/ui components
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/me` - Get current authenticated user

### Users
- `GET /api/users/search?q=<query>` - Search students by name/username
- `GET /api/users/[userId]` - Get user profile

### Posts
- `POST /api/posts/create` - Create new post with idempotency
- `GET /api/walls/[userId]` - Get user's wall posts (paginated)

## Features Explained

### LRU Cache for Sessions
The application implements a custom LRU cache for session management:
- Max 1000 entries to prevent unbounded memory growth
- 1-hour TTL for automatic session expiration
- O(1) lookups for session validation
- Automatic LRU eviction when cache is full

Located in `/lib/lru-cache.ts`, used in auth endpoints.

### Idempotent Posts
Post creation is idempotent to prevent duplicates:
- Client generates SHA-256 hash of (content + userId + targetUserId + timestamp)
- Server checks if post with same idempotency key exists
- If exists, returns existing post instead of creating duplicate
- Prevents accidental double-posting due to network retries

### Mention System
Real-time @mention suggestions:
- Type `@` in the post form to trigger search
- Search is debounced for performance
- Click suggestions to add tagged users
- Tagged users appear as pills that can be removed
- Up to 10 results shown per search

## Authentication Flow

1. **Signup**: User creates account with email, username, password, full name
2. **Password Hashing**: Passwords are hashed with bcrypt (10 rounds) before storage
3. **JWT Token Generation**: On successful login/signup, JWT token is issued
4. **Cookie Storage**: Token stored in HTTP-only cookie (7-day expiry)
5. **Session Caching**: Token decoded and user cached in LRU for fast lookups
6. **Protected Routes**: Frontend routes require valid token via `/lib/protected-route.tsx`

## Database Schema

### users
```
{
  _id: ObjectId,
  email: String (unique),
  username: String (unique),
  password: String (hashed),
  fullName: String,
  createdAt: Date,
  updatedAt: Date
}
```

### posts
```
{
  _id: ObjectId,
  authorId: ObjectId,
  targetUserId: ObjectId,
  content: String (max 50 words),
  taggedUsers: [ObjectId],
  idempotencyKey: String (unique, sparse),
  createdAt: Date,
  updatedAt: Date
}
```

### sessions
```
{
  _id: ObjectId,
  userId: ObjectId,
  data: Object,
  createdAt: Date,
  expiresAt: Date (TTL index)
}
```

## Validation Rules

- **Email**: Must be valid email format
- **Username**: Minimum 3 characters, must be unique
- **Password**: Minimum 6 characters, hashed before storage
- **Post Content**: Maximum 50 words, cannot be empty
- **User IDs**: Must be valid MongoDB ObjectId

## Performance Optimizations

1. **Database Indexes**: Unique indexes on email/username, compound indexes on posts
2. **LRU Caching**: Reduces database queries for session validation
3. **Pagination**: Wall feeds support pagination (10 posts per page)
4. **Search Limits**: User search limited to 10 results
5. **Selective Projections**: Only needed fields fetched from database

## Deployment

The application is built for Vercel but can be deployed anywhere Node.js is supported:

1. **Push to GitHub**: Connected repository for CI/CD
2. **Environment Variables**: Configure in Vercel project settings
3. **Database**: Ensure MongoDB Atlas or local instance is accessible
4. **Build**: `pnpm build`
5. **Start**: `pnpm start`

## Future Enhancements

- Post deletion/editing
- Likes and comments
- User follow system
- Real-time notifications
- File uploads (profile pics, attachments)
- Admin moderation tools
- Analytics dashboard
- Dark mode toggle

## Security Considerations

- All sensitive data (passwords, tokens) handled securely
- CORS properly configured for API endpoints
- Input sanitization on all user inputs
- Rate limiting recommended for production
- HTTPS enforced in production
- JWT secret should be strong and rotated regularly

## Development Notes

### Adding New Features
1. Create API routes in `/app/api`
2. Add TypeScript interfaces for data shapes
3. Implement client component in `/components` or page
4. Connect to auth context via `useAuth()` hook
5. Test with MongoDB connection working

### Testing the App
1. Signup with test account
2. Search for other users
3. Navigate to user profile
4. Post on wall (max 50 words)
5. Use @mentions in posts
6. Test logout functionality

## Support & Issues

For issues or questions about the application, ensure:
- MONGODB_URI environment variable is set correctly
- MongoDB Atlas firewall allows your IP
- All dependencies installed with `pnpm install`
- Dev server running with `pnpm dev`

Happy building! 🎓
