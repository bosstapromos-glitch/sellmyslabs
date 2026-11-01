import { CATEGORIES, GRADERS, ITEM_TYPES } from "./site";

export const DRAFT_KEY = "sms-request-draft-v2";
export const emptyCard = () => ({
  itemType: "Graded card",
  condition: "",
  name: "",
  category: "Pokémon",
  grader: "PSA",
  grade: "",
  cert: "",
  quantity: 1,
  asking: "",
});
export const emptyDraft = () => ({
  id: "",
  name: "",
  email: "",
  phone: "",
  notes: "",
  askingTotal: "",
  cards: [emptyCard()],
  consent: false,
  website: "",
});
const text = (value, limit) =>
  typeof value === "string" ? value.slice(0, limit) : "";

// Drafts may be incomplete, old, or corrupted. Never trust browser storage as form state.
export function restoreDraft(raw, makeId) {
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    saved = null;
  }
  if (!saved || typeof saved !== "object" || Array.isArray(saved))
    return { ...emptyDraft(), id: makeId() };
  const cards = Array.isArray(saved.cards)
    ? saved.cards
        .slice(0, 50)
        .filter((c) => c && typeof c === "object" && !Array.isArray(c))
        .map((c) => ({
          ...emptyCard(),
          itemType: ITEM_TYPES.includes(c.itemType)
            ? c.itemType
            : "Graded card",
          category: CATEGORIES.includes(c.category) ? c.category : "Pokémon",
          grader: GRADERS.includes(c.grader) ? c.grader : "PSA",
          name: text(c.name, 180),
          condition: text(c.condition, 500),
          grade: text(c.grade, 30),
          cert: text(c.cert, 80),
          asking: text(c.asking, 20),
          quantity:
            c.quantity === ""
              ? ""
              : Number.isInteger(Number(c.quantity)) &&
                  Number(c.quantity) > 0 &&
                  Number(c.quantity) <= 10000
                ? Number(c.quantity)
                : 1,
        }))
    : [];
  return {
    ...emptyDraft(),
    id:
      typeof saved.id === "string" &&
      /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
        saved.id,
      )
        ? saved.id
        : makeId(),
    name: text(saved.name, 120),
    email: text(saved.email, 254),
    phone: text(saved.phone, 40),
    notes: text(saved.notes, 4000),
    askingTotal: text(saved.askingTotal, 20),
    cards: cards.length ? cards : [emptyCard()],
  };
}

export const hasDraftContent = (draft) =>
  Boolean(
    draft.name ||
      draft.email ||
      draft.phone ||
      draft.notes ||
      draft.askingTotal ||
      draft.cards.some(
        (c) => c.name || c.grade || c.cert || c.asking || c.condition,
      ),
  );
