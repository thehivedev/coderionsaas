# Coderion v2 - SaaS Platform

## 🚀 Project Structure

```
coderion-v2/
├── app/
│   ├── lib/
│   │   ├── supabaseClient.ts    # Client-side Supabase instance
│   │   ├── supabaseServer.ts    # Server-side Supabase instance (Remix)
│   │   ├── database.ts          # Database operations (profiles, chats)
│   │   ├── auth.ts              # Authentication helpers
│   │   ├── types.ts             # TypeScript types
│   │   └── constants.ts         # App constants
├── supabase/
│   ├── schema.sql               # Main database schema
│   └── functions/
│       └── deduct_tokens.sql    # Token deduction function
└── README.md
```

## 📋 Setup Instructions

### 1. Database Setup
1. Go to your Supabase Dashboard
2. Open SQL Editor
3. Paste and execute `supabase/schema.sql`
4. Paste and execute `supabase/functions/deduct_tokens.sql`

### 2. Environment Variables
Create a `.env` file in the root:
```env
SUPABASE_URL=https://wscqlfgbloxmtwwmqokm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY3FsZmdibG94bXR3d21xb2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzUxNjcsImV4cCI6MjEwNDgxMTE2N30.HyRLZHTqNBfFvZiMUnM3m8zTSdpTKDGgWmdjZjYU4nI
```

## 🔐 Database Schema

### Profiles Table
- `id` (UUID, PK) - References auth.users
- `email` (TEXT)
- `full_name` (TEXT)
- `avatar_url` (TEXT)
- `token_balance` (BIGINT) - Default: 100,000 tokens
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### Chats Table
- `id` (UUID, PK)
- `user_id` (UUID, FK) - References auth.users
- `title` (TEXT)
- `messages` (JSONB) - Array of chat messages
- `model` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## 🛡️ Security Features
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Automatic profile creation on signup
- Token balance management with RPC function
- Cascade deletion when user is removed

## 🎯 Next Steps
1. Set up Remix routes and components
2. Implement authentication UI
3. Create chat interface
4. Add token management system
5. Integrate AI model API
