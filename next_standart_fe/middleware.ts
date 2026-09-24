import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const token = await getToken({
    req,
    secureCookie: process.env.NODE_ENV === "production",
    cookieName: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "random",
  });

  const isLoggedIn = !!token;

  const publicPaths = ['/auth/login', '/auth/register'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // 1. Kondisi jika user sudah login
  if (isLoggedIn) {
    if (isPublicPath) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return response;
  }

  // 2. Kondisi jika user belum login
  if (!isLoggedIn) {
    if (isPublicPath) {
      return NextResponse.next();
    }

    // Blokir akses ke rute terproteksi lainnya dan arahkan ke halaman login
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Memproses semua rute halaman kecuali aset statis dan route API internal Next.js
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|assets|images).*)',
  ],
};