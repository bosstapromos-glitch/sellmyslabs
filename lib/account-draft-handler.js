import {
  DraftError,
  listAccountDrafts,
  readAccountDraft,
  saveAccountDraft,
  closeAccountDraft,
} from "./account-drafts";
import { UploadValidationError } from "./submission-uploads";
export function createAccountDraftHandler({
  getIdentity,
  db,
  sameOrigin,
  limited,
}) {
  return async (request) => {
    try {
      if (request.method !== "GET" && !sameOrigin(request))
        return Response.json(
          { error: "Please use this website." },
          { status: 403 },
        );
      const identity = await getIdentity();
      if (!identity)
        return Response.json(
          { error: "Sign in to use account drafts." },
          { status: 401 },
        );
      const sql = db();
      let result;
      if (request.method === "GET") {
        const id = new URL(request.url).searchParams.get("id");
        result = id
          ? await readAccountDraft(identity, id, sql)
          : {
              email: identity.email,
              drafts: await listAccountDrafts(identity, sql),
            };
      } else {
        if (Number(request.headers.get("content-length")) > 150000)
          return Response.json(
            { error: "This draft is too large." },
            { status: 413 },
          );
        if (await limited(request, "account-draft", 600))
          return Response.json(
            { error: "Please wait a moment before saving again." },
            { status: 429 },
          );
        const body = await request.json();
        result =
          request.method === "DELETE"
            ? await closeAccountDraft(identity, body.id, body.version, sql)
            : await saveAccountDraft(identity, body, sql);
      }
      return Response.json(result, {
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch (e) {
      return Response.json(
        {
          error:
            e instanceof DraftError || e instanceof UploadValidationError
              ? e.message
              : "Could not save or open this draft. Please try again.",
        },
        {
          status:
            e instanceof DraftError
              ? e.status
              : e instanceof UploadValidationError
                ? 400
                : 503,
        },
      );
    }
  };
}
