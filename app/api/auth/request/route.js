import { siteUrl } from '../../../../lib/origin';
import { db, configured } from "../../../../lib/db";
import {
  owner,
  randomToken,
  digest,
  limited,
  sameOrigin,
} from "../../../../lib/security";
import { mail } from "../../../../lib/mail";
export async function POST(request) {
  try {
    if (!sameOrigin(request))
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    if (!configured())
      return Response.json(
        { error: "The workspace is not connected yet." },
        { status: 503 },
      );
    if (await limited(request, "login", 5))
      return Response.json(
        { error: "Please wait before requesting another sign-in link." },
        { status: 429 },
      );
    const { email } = await request.json();
    if (typeof email !== "string")
      return Response.json({ error: "Enter your email." }, { status: 400 });
    if (email.trim().toLowerCase() === owner()) {
      const token = randomToken();
      const sql = db();
      await sql`INSERT INTO login_tokens(hash,expires_at) VALUES(${digest(token)},now()+interval '15 minutes')`;
      await mail({
        subject: "Your SellMySlabs sign-in link",
        text: `Sign in to your private workspace:\n${siteUrl()}/api/auth/verify?token=${token}\n\nThis link expires in 15 minutes and can only be used once. If you did not request it, you can ignore this email.`,
      });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "The sign-in email could not be sent. Please try again." },
      { status: 503 },
    );
  }
}
