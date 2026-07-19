import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth gating happens in each page (redirects if not signed in / not an approved
// admin) and is enforced for real by Postgres Row Level Security — so a user can
// never read/write data they shouldn't even if a client check were bypassed.
export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/cart/:path*', '/admin/dashboard/:path*'],
};
