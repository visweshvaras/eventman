import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthRedirectUrl } from "./auth-redirect";

describe("getAuthRedirectUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the configured site URL for hosted auth callbacks", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://eventgenie-fytk.onrender.com/");

    expect(getAuthRedirectUrl("/auth/callback?next=/dashboard", "http://localhost:3000"))
      .toBe("https://eventgenie-fytk.onrender.com/auth/callback?next=/dashboard");
  });

  it("uses the current browser origin when no site URL is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    expect(getAuthRedirectUrl("/auth/callback?next=/dashboard", "http://localhost:3000"))
      .toBe("http://localhost:3000/auth/callback?next=/dashboard");
  });
});
