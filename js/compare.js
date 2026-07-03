/**
 * Intersect two sorted number arrays.
 */
function intersect(a, b) {
  const setB = new Set(b);
  return a.filter((n) => setB.has(n)).sort((x, y) => x - y);
}

/**
 * Compare two collections and find mutually beneficial trades.
 * @param {{ need: Record<string, number[]>, swaps: Record<string, number[]> }} mine
 * @param {{ need: Record<string, number[]>, swaps: Record<string, number[]> }} theirs
 * @returns {{ youGet: Record<string, number[]>, youGive: Record<string, number[]>, totals: { youGet: number, youGive: number, fairTrade: number } }}
 */
export function compareCollections(mine, theirs) {
  const youGet = {};
  const youGive = {};

  const allKeys = new Set([
    ...Object.keys(mine.need || {}),
    ...Object.keys(mine.swaps || {}),
    ...Object.keys(theirs.need || {}),
    ...Object.keys(theirs.swaps || {}),
  ]);

  for (const key of allKeys) {
    const get = intersect(theirs.swaps?.[key] || [], mine.need?.[key] || []);
    const give = intersect(mine.swaps?.[key] || [], theirs.need?.[key] || []);

    if (get.length) youGet[key] = get;
    if (give.length) youGive[key] = give;
  }

  const youGetTotal = countEntries(youGet);
  const youGiveTotal = countEntries(youGive);

  return {
    youGet,
    youGive,
    totals: {
      youGet: youGetTotal,
      youGive: youGiveTotal,
      fairTrade: Math.min(youGetTotal, youGiveTotal),
    },
  };
}

function countEntries(collection) {
  return Object.values(collection).reduce((sum, nums) => sum + nums.length, 0);
}

/** Split a team key "CODE:emoji" into display parts. */
export function parseTeamKey(key) {
  const colon = key.indexOf(':');
  if (colon === -1) return { code: key, emoji: '' };
  return { code: key.slice(0, colon), emoji: key.slice(colon + 1) };
}

function formatStickerLines(collection, teams) {
  return Object.entries(collection)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, numbers]) => {
      const { code, emoji } = parseTeamKey(key);
      const displayEmoji = teams[key] || emoji;
      return `${code} ${displayEmoji}: ${numbers.join(', ')}`;
    })
    .join('\n');
}

/**
 * Format comparison result as a WhatsApp-ready message in Portuguese.
 * Omits sections that have no matching stickers.
 */
export function formatWhatsAppMessage(youGive, youGet, teams, appUrl) {
  const sections = ['Olá, tudo bem?'];

  if (Object.keys(youGive).length) {
    sections.push('', 'Eu tenho as seguintes figurinhas que você quer:', formatStickerLines(youGive, teams));
  }

  if (Object.keys(youGet).length) {
    sections.push('', 'Eu tenho interesse nas seguintes figurinhas:', formatStickerLines(youGet, teams));
  }

  if (appUrl) {
    sections.push('', `Compare suas figurinhas em: ${appUrl}`);
  }

  return sections.join('\n');
}
