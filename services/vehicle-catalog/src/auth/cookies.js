export const COOKIE_NAME_ACCESS = "accessToken";

export function parseCookies(request) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader || typeof cookieHeader !== "string") {
    return {};
  }

  const cookies = {};
  const pairs = cookieHeader.split(";");

  for (const rawPair of pairs) {
    const pair = rawPair.trim();
    if (!pair) continue;
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;

    const key = pair.slice(0, eqIdx).trim();
    const val = pair.slice(eqIdx + 1).trim();

    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }

  return cookies;
}
