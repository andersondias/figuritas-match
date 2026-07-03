import { sortTeamEntries, teamKeyForCode } from './teams.js';

/**
 * Intersect two sorted number arrays.
 */
function intersect(a, b) {
  const setB = new Set(b);
  return a.filter((n) => setB.has(n)).sort((x, y) => x - y);
}

function teamCode(key) {
  const colon = key.indexOf(':');
  return colon === -1 ? key : key.slice(0, colon);
}

function stickersForCode(collection, code) {
  for (const [key, nums] of Object.entries(collection || {})) {
    if (teamCode(key) === code) return nums;
  }
  return [];
}

function allTeamCodes(...collections) {
  const codes = new Set();
  for (const collection of collections) {
    for (const key of Object.keys(collection || {})) {
      codes.add(teamCode(key));
    }
  }
  return codes;
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

  const codes = allTeamCodes(mine.need, mine.swaps, theirs.need, theirs.swaps);

  for (const code of codes) {
    const get = intersect(stickersForCode(theirs.swaps, code), stickersForCode(mine.need, code));
    const give = intersect(stickersForCode(mine.swaps, code), stickersForCode(theirs.need, code));

    const key = teamKeyForCode(code);
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
  return sortTeamEntries(Object.entries(collection))
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
