const categories = new Map([
  ['pokemon', 'Pokémon'], ['football', 'Football'], ['baseball', 'Baseball'],
  ['basketball', 'Basketball'], ['hockey', 'Hockey'], ['soccer', 'Soccer'], ['onepiece', 'One Piece'],
]);
const normalized = (value) => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function sellMySlabsCategory(value) { return categories.get(normalized(value)) || null; }
export function referenceIdentity(item) {
  return {
    title: String(item.name || item.title || '').slice(0, 240),
    category: sellMySlabsCategory(item.category) || '',
    set: String(item.set || '').slice(0, 120), card_number: String(item.number || '').slice(0, 50),
    year: String(item.year || '').slice(0, 4), language: String(item.language || '').slice(0, 40),
    variety: String(item.variant || '').slice(0, 120),
    grading_company: String(item.grader || '').slice(0, 40), grade: String(item.grade || '').slice(0, 40),
    source_url: String(item.sourceUrl || '').slice(0, 300),
    qualifier: item.qualifier ? String(item.qualifier).slice(0, 50) : null,
    subgrades: Object.fromEntries(['centering','corners','edges','surfaces'].filter(key => item.subgrades?.[key] != null).map(key => [key,String(item.subgrades[key]).slice(0, 10)])),
  };
}
export function referenceSource(item) {
  return item.itemType === 'Graded card' || (!item.itemType && item.grader && item.grade) ? 'ALT' : 'TCGplayer';
}
