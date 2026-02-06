export function parseCookies(cookieHeader: string | undefined) {
  const cookies: Record<string, string | undefined> = {};
  if (!cookieHeader) return cookies;
  const cookiePairs = cookieHeader.split(";");
  for (const seg of cookiePairs) {
    const pair = seg.trim();
    if (!pair) continue;
    const i = pair.indexOf("=");
    const key = i === -1 ? pair : pair.slice(0, i).trim();
    if (!key) continue;
    const value = i === -1 ? "" : pair.slice(i + 1);
    cookies[key] = value;
  }

  return cookies;
}
