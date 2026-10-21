import { clearSession, sameOrigin } from "../../../../lib/security";
export async function POST(request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  await clearSession();
  return Response.json({ ok: true });
}
