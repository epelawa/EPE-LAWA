export const ADMIN_BASE_PATH = process.env.NEXT_PUBLIC_ADMIN_BASE_PATH === "/admin" ? "/admin" : "";
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === "/") return "";
  const prefixed = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return prefixed.replace(/\/+$/, "");
}

/** Prefix an internal staff route when the staff app is mounted under a base path. */
export function staffHref(path: string, basePath = ""): string {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    CONTROL_CHARACTERS.test(path)
  ) {
    return "/";
  }

  const base = normalizeBasePath(basePath);
  if (!base) return path;
  if (path === base || path.startsWith(`${base}/`) || path.startsWith(`${base}?`) || path.startsWith(`${base}#`)) {
    return path;
  }
  return path === "/" ? base : `${base}${path}`;
}

export function adminHref(path: string): string {
  return staffHref(path, ADMIN_BASE_PATH);
}

/**
 * Validate an untrusted login return hint. It can select a destination only
 * after the normal verified staff sign-in succeeds; it grants no access.
 */
export function safeAdminNextPath(value: unknown): string {
  const fallback = ADMIN_BASE_PATH || "/";
  if (typeof value !== "string" || value.length > 2048) return fallback;

  const candidate = value.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    CONTROL_CHARACTERS.test(candidate)
  ) {
    return fallback;
  }

  const origin = "https://admin-return.invalid";
  let parsed: URL;
  try {
    parsed = new URL(candidate, origin);
  } catch {
    return fallback;
  }

  if (parsed.origin !== origin) return fallback;
  if (ADMIN_BASE_PATH && parsed.pathname !== ADMIN_BASE_PATH && !parsed.pathname.startsWith(`${ADMIN_BASE_PATH}/`)) {
    return fallback;
  }
  const loginPath = `${ADMIN_BASE_PATH}/login` || "/login";
  if (parsed.pathname === loginPath || parsed.pathname.startsWith(`${loginPath}/`)) return fallback;

  return `${parsed.pathname}${parsed.search}`;
}
