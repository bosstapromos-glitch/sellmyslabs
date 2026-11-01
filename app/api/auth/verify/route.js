import { db } from "../../../../lib/db";
import { digest, setSession, sameOrigin } from "../../../../lib/security";
const valid = (t) => typeof t === "string" && /^[a-f0-9]{64}$/.test(t);
export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!valid(token))
    return Response.redirect(new URL("/admin?error=link", request.url));
  return new Response(
    `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · SellMySlabs</title><style>*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#f5f7fa;color:#1d1d1f;margin:0;padding:12vh 20px}main{max-width:440px;margin:auto;background:white;padding:32px;border:1px solid #dfe5ec;border-radius:16px}h1{font-size:28px;line-height:1.2;letter-spacing:-.03em;margin:24px 0 16px}p{line-height:1.6;color:#626871}a{color:#0071e3;font-weight:700;text-decoration:none}button{background:#0071e3;color:white;border:0;border-radius:12px;min-height:48px;padding:14px 24px;font-size:16px;font-weight:600;font-family:inherit;cursor:pointer;width:100%}button:hover{background:#005fc0}a:focus-visible,button:focus-visible{outline:3px solid #0071e3;outline-offset:4px}@media(max-width:400px){main{padding:24px}}</style><main><a href="/">SellMySlabs</a><h1>Sign in to your workspace.</h1><p>Confirm sign-in to open the SellMySlabs submission inbox.</p><form method="POST" action="/api/auth/verify"><input type="hidden" name="token" value="${token}"><button>Sign in to my workspace</button></form></main></html>`,
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
