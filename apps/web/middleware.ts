import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protectedRoutes = ["/dashboard"];
  const publicRoutes = ["/sign-in", "/sign-up", "/"];
  const isProtected = protectedRoutes.includes(path);
  const isPublic = publicRoutes.includes(path);
  const token = request.cookies.get("token");

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/sign-in", request.nextUrl));
  }

  if (isPublic && token && !request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
