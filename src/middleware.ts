import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyToken } from "./lib/auth";

const PUBLIC = [/^\/login/, /^\/api\/cron\//, /^\/api\/setup/, /^\/manifest\.webmanifest$/, /^\/sw\.js$/, /^\/icons\//, /^\/favicon/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  if (await verifyToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return new NextResponse("Unauthorized", { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
