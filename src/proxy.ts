import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (request.nextUrl.pathname !== "/" || !code) {
    return NextResponse.next();
  }

  const callbackUrl = request.nextUrl.clone();
  callbackUrl.pathname = "/auth/callback";
  callbackUrl.searchParams.set("next", "/dashboard");

  return NextResponse.redirect(callbackUrl);
}

export const config = {
  matcher: "/",
};
