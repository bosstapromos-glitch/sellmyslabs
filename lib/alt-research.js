const ALT_GRADERS = new Set(["PSA", "BGS", "CGC"]);

export function isGradedSlab(item) {
  return Boolean(item &&
    (item.itemType === "Graded card" || (!item.itemType && item.grader && item.grade)));
}

export function altResearchUrl(item) {
  if (!isGradedSlab(item) || !ALT_GRADERS.has(item.grader) ||
      !item.name?.trim() || !item.grade?.trim()) return null;
  const params = new URLSearchParams({ query: item.name.trim() });
  return `https://alt.xyz/browse?${params}`;
}
