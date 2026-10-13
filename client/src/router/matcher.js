/**
 * Match a route pattern (e.g. "/compare" or "/vehicles/:id") against a URL path.
 * Strips query strings and hash fragments before matching.
 */
export function matchRoute(routePattern, currentPath) {
  const cleanCurrent = (currentPath || "/").split("?")[0].split("#")[0] || "/";
  const cleanPattern = (routePattern || "/").split("?")[0].split("#")[0] || "/";

  if (cleanPattern === cleanCurrent) {
    return { matches: true, params: {} };
  }

  const patternParts = cleanPattern.split("/").filter(Boolean);
  const pathParts = cleanCurrent.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return { matches: false, params: {} };
  }

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(":")) {
      const paramName = patternPart.slice(1);
      params[paramName] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return { matches: false, params: {} };
    }
  }

  return { matches: true, params };
}

/**
 * Parse a raw path or URL into a structured location object { pathname, search, hash }.
 */
export function parseLocation(pathOrUrl = "/") {
  const raw = pathOrUrl || "/";
  const [pathAndQuery, hash = ""] = raw.split("#");
  const [pathname = "/", search = ""] = pathAndQuery.split("?");
  return {
    pathname: pathname.startsWith("/") ? pathname : `/${pathname}`,
    search: search ? `?${search}` : "",
    hash: hash ? `#${hash}` : "",
  };
}
