/**
 * Unauthenticated access to a resource route (thumbnails, downloads).
 * A human navigating in a browser (Accept: text/html) gets sent to the app's
 * login page; programmatic clients (<img>, fetch, curl) get a plain-text 401.
 * Without an explicit Content-Type the 401 body was served as
 * application/octet-stream and browsers downloaded it as a file.
 */
export function unauthorizedResponse(request: Request): Response {
  const accept = request.headers.get("accept") ?? "";

  if (accept.includes("text/html")) {
    return new Response(null, { status: 307, headers: { Location: "/login" } });
  }

  return new Response("Unauthorized", {
    status: 401,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
