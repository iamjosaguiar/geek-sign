import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/pricing"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Auth routes (login, signup, etc.)
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/forgot-password");

  // API routes
  const isApiRoute = pathname.startsWith("/api");

  // Document signing routes (public for signers)
  const isSigningRoute = pathname.startsWith("/sign/");

  // Allow API routes, signing routes, and public routes
  if (isApiRoute || isSigningRoute) {
    return NextResponse.next();
  }

  // Allow auth routes for non-logged-in users
  if (isAuthRoute) {
    if (isLoggedIn) {
      // Redirect logged-in users away from auth pages
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Protect dashboard and other routes
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
