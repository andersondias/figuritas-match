import { emojiForCode, teamKey, teamKeyForCode } from './teams.js';

export { teamKey };

const NEED_KEYWORDS = ['i need', 'faltantes', 'necesito'];
const SWAP_KEYWORDS = ['swaps', 'repetidas', 'repetidas/cambios'];
const ALBUM_NEED_PATTERNS = [/figurinhas que faltam/i];
const ALBUM_SWAP_PATTERNS = [/figurinhas que sobram/i, /figurinhas repetidas/i];
const FOOTER_PATTERNS = [
  /^download the app/i,
  /^baixe o app/i,
  /^descarga la app/i,
  /figuritas\.app/i,
];

const APP_TEAM_LINE_REGEX = /^([A-Z]{2,4})\s+(\S+)\s*:\s*([\d.,\s]+)$/u;
const ALBUM_TEAM_LINE_REGEX = /^([A-Z]{2,4})\s*:\s*([\d.,\s]*)$/u;
const GROUP_LINE_REGEX = /^grupo\s+[a-z]\s*:?\s*$/i;

function parseNumbers(raw) {
  return raw
    .split(/[,.]/)
    .map((n) => parseInt(n.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

function isFooterLine(line) {
  return FOOTER_PATTERNS.some((pattern) => pattern.test(line));
}

function detectSection(line) {
  const normalized = line.trim().toLowerCase();
  if (NEED_KEYWORDS.includes(normalized)) return 'need';
  if (SWAP_KEYWORDS.some((kw) => normalized === kw || normalized.startsWith(kw))) return 'swaps';
  if (ALBUM_NEED_PATTERNS.some((pattern) => pattern.test(line))) return 'need';
  if (ALBUM_SWAP_PATTERNS.some((pattern) => pattern.test(line))) return 'swaps';
  return null;
}

function isSkippableLine(line) {
  return GROUP_LINE_REGEX.test(line);
}

function storeTeamLine(section, need, swaps, teams, key, emoji, numbers) {
  teams[key] = emoji;
  if (section === 'need') {
    need[key] = numbers;
  } else {
    swaps[key] = numbers;
  }
}

function parseTeamLine(line, section, need, swaps, teams) {
  const appMatch = line.match(APP_TEAM_LINE_REGEX);
  if (appMatch) {
    const [, code, emoji, numbersRaw] = appMatch;
    storeTeamLine(section, need, swaps, teams, teamKey(code, emoji), emoji, parseNumbers(numbersRaw));
    return true;
  }

  const albumMatch = line.match(ALBUM_TEAM_LINE_REGEX);
  if (albumMatch) {
    const [, code, numbersRaw] = albumMatch;
    const numbers = parseNumbers(numbersRaw);
    if (!numbers.length) return true;
    const emoji = emojiForCode(code);
    storeTeamLine(section, need, swaps, teams, teamKeyForCode(code), emoji, numbers);
    return true;
  }

  return false;
}

/**
 * Parse a Figuritas App or album-style message into need/swaps collections.
 * @param {string} text - Raw message text
 * @returns {{ need: Record<string, number[]>, swaps: Record<string, number[]>, teams: Record<string, string>, warnings: string[] }}
 */
export function parseMessage(text) {
  const need = {};
  const swaps = {};
  const teams = {};
  const warnings = [];

  let section = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (isFooterLine(line)) break;

    const newSection = detectSection(line);
    if (newSection) {
      section = newSection;
      continue;
    }

    if (isSkippableLine(line)) continue;

    if (!section) continue;

    if (!parseTeamLine(line, section, need, swaps, teams)) {
      warnings.push(`Não foi possível analisar a linha: "${line}"`);
    }
  }

  return { need, swaps, teams, warnings };
}

/** Count total stickers across all teams in a collection. */
export function countStickers(collection) {
  return Object.values(collection).reduce((sum, nums) => sum + nums.length, 0);
}
