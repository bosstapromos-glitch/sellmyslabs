import { db } from "../../../../lib/db";
import { digest, setSession, sameOrigin } from "../../../../lib/security";
const valid = (t) => typeof t === "string" && /^[a-f0-9]{64}$/.test(t);
export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!valid(token))
    return Response.redirect(new URL("/admin?error=link", request.url));
  return new Response(
    `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · SellMySlabs</title><style>body{font-family:Arial,sans-serif;background:#f5f7fa;color:#1d1d1f;padding:10vh 24px}main{max-width:420px;margin:auto;background:white;padding:36px;border-radius:24px}h1{font-size:30px}p{line-height:1.6;color:#626871}button{background:#0071e3;color:white;border:0;border-radius:30px;padding:16px 24px;font-size:16px;cursor:pointer}</style><main><h1>Your workspace is ready.</h1><p>Confirm sign-in to open the SellMySlabs submission inbox.</p><form method="POST" action="/api/auth/verify"><input type="hidden" name="token" value="${token}"><button>Sign in to my workspace</button></form></main></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        // Same-origin form POSTs need their Origin header for CSRF validation.
        // Cross-origin requests still receive no referrer, protecting the token.
        "Referrer-Policy": "same-origin",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
      },
    },
  );
}
export async function POST(request) {
  if (!sameOrigin(request))
    return new Response("Invalid origin", { status: 403 });
  const token = (await request.formData()).get("token");
  if (!valid(token))
    return Response.redirect(new URL("/admin?error=link", request.url), 303);
  try {
    const sql = db();
    const rows =
      await sql`DELETE FROM login_tokens WHERE hash=${digest(token)} AND expires_at>now() RETURNING hash`;
    if (!rows.length)
      return Response.redirect(new URL("/admin?error=link", request.url), 303);
    await setSession();
    return Response.redirect(new URL("/admin", request.url), 303);
  } catch {
    return Response.redirect(new URL("/admin?error=link", request.url), 303);
  }
}
