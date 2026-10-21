import Papa from "papaparse";
import { cardSchema } from "./validation";
export function importCards(text) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (result.errors.length)
    throw Error("We could not read this CSV. Please use the template below.");
  if (!result.data.length || result.data.length > 50)
    throw Error("Import between 1 and 50 card rows.");
  return result.data.map((row, i) => {
    const parsed = cardSchema.safeParse({
      name: row.name || "",
      category: row.category || "Pokémon",
      grader: (row.grader || "").toUpperCase(),
      grade: row.grade || "",
      cert: row.cert || "",
      quantity: row.quantity || 1,
      asking: row.asking || "",
    });
    if (!parsed.success)
      throw Error(`Row ${i + 2}: ${parsed.error.issues[0].message}`);
    return parsed.data;
  });
}
