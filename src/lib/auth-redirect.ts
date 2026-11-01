export function getAuthRedirectUrl(path: string, browserOrigin: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || browserOrigin;
  return new URL(path, siteUrl).toString();
}
