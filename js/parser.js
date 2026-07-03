const NEED_KEYWORDS = ['i need', 'faltantes', 'necesito'];
const SWAP_KEYWORDS = ['swaps', 'repetidas', 'repetidas/cambios'];
const FOOTER_PATTERNS = [
  /^download the app/i,
  /^baixe o app/i,
  /^descarga la app/i,
  /figuritas\.app/i,
];

const TEAM_LINE_REGEX = /^([A-Z]{2,4})\s+(\S+)\s*:\s*([\d,\s]+)$/u;

/**
 * Build a canonical team key. Same code with different emojis (e.g. FWC 🌎 vs FWC 📜)
 * are stored separately.
 */
export function teamKey(code, emoji) {
  return `${code}:${emoji}`;
}

function parseNumbers(raw) {
  return raw
    .split(',')
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
  return null;
}

/**
 * Parse a Figuritas App WhatsApp message into need/swaps collections.
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

    if (!section) continue;

    const match = line.match(TEAM_LINE_REGEX);
    if (!match) {
      warnings.push(`Não foi possível analisar a linha: "${line}"`);
      continue;
    }

    const [, code, emoji, numbersRaw] = match;
    const key = teamKey(code, emoji);
    const numbers = parseNumbers(numbersRaw);

    teams[key] = emoji;

    if (section === 'need') {
      need[key] = numbers;
    } else {
      swaps[key] = numbers;
    }
  }

  return { need, swaps, teams, warnings };
}

/** Count total stickers across all teams in a collection. */
export function countStickers(collection) {
  return Object.values(collection).reduce((sum, nums) => sum + nums.length, 0);
}
