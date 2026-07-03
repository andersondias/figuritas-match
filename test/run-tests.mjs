import { parseMessage, countStickers } from '../js/parser.js';
import { compareCollections, formatWhatsAppMessage } from '../js/compare.js';
import { sortTeamEntries } from '../js/teams.js';
import { teamKey } from '../js/parser.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, 'parser.test.html'), 'utf8');

function extractList(name) {
  const marker = `const ${name} = \``;
  const start = html.indexOf(marker) + marker.length;
  const end = html.indexOf('`;', start);
  return html.slice(start, end);
}

const ENGLISH_LIST = extractList('ENGLISH_LIST');
const PORTUGUESE_LIST = extractList('PORTUGUESE_LIST');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`);
}

const english = parseMessage(ENGLISH_LIST);
const portuguese = parseMessage(PORTUGUESE_LIST);

test('English list parses need count', () => {
  assertEqual(countStickers(english.need), 333, 'need count');
});

test('English list parses swap count', () => {
  assertEqual(countStickers(english.swaps), 25, 'swap count');
});

test('English list has no warnings', () => {
  if (english.warnings.length) throw new Error(english.warnings.join('; '));
});

test('English FWC entries are separate keys', () => {
  const fwcKeys = Object.keys(english.need).filter((k) => k.startsWith('FWC:'));
  if (fwcKeys.length !== 2) throw new Error(`Expected 2 FWC keys, got ${fwcKeys.length}`);
});

test('Portuguese list parses faltantes', () => {
  assertEqual(countStickers(portuguese.need), 8, 'faltantes count');
});

test('Portuguese list parses repetidas', () => {
  assertEqual(countStickers(portuguese.swaps), 99, 'repetidas count');
});

test('Portuguese list has no warnings', () => {
  if (portuguese.warnings.length) throw new Error(portuguese.warnings.join('; '));
});

const result = compareCollections(
  { need: english.need, swaps: english.swaps },
  { need: portuguese.need, swaps: portuguese.swaps }
);

test('Comparison finds KOR match (you get 7)', () => {
  const korKey = Object.keys(result.youGet).find((k) => k.startsWith('KOR:'));
  if (!korKey || !result.youGet[korKey].includes(7)) {
    throw new Error(`Expected KOR:7 in youGet, got ${JSON.stringify(result.youGet[korKey])}`);
  }
});

test('Comparison finds GER match (you get 10, 15)', () => {
  const gerKey = Object.keys(result.youGet).find((k) => k.startsWith('GER:'));
  if (!gerKey) throw new Error('Expected GER in youGet');
  assertEqual(result.youGet[gerKey], [10, 15], 'GER numbers');
});

test('Comparison totals are correct', () => {
  if (result.totals.youGet !== 33) throw new Error(`Expected youGet 33, got ${result.totals.youGet}`);
  if (result.totals.youGive !== 0) throw new Error(`Expected youGive 0, got ${result.totals.youGive}`);
  if (result.totals.fairTrade !== 0) throw new Error('fairTrade should be 0 when youGive is 0');
});

test('WhatsApp message format', () => {
  const teams = { ...english.teams, ...portuguese.teams };
  const appUrl = 'https://example.github.io/figuritas-match';
  const msg = formatWhatsAppMessage(result.youGive, result.youGet, teams, appUrl);
  if (!msg.startsWith('Olá, tudo bem?')) throw new Error('Missing greeting');
  if (msg.includes('Eu tenho as seguintes figurinhas que você quer:')) {
    throw new Error('Give section should be omitted when empty');
  }
  if (!msg.includes('Eu tenho interesse nas seguintes figurinhas:')) throw new Error('Missing get section');
  if (!msg.includes('KOR 🇰🇷: 7')) throw new Error('Missing KOR line in get section');
  if (!msg.includes(`Compare suas figurinhas em: ${appUrl}`)) throw new Error('Missing app link');
});

test('Team order follows album order', () => {
  const keys = sortTeamEntries(Object.entries(result.youGet)).map(([k]) => k);
  const korIdx = keys.indexOf(teamKey('KOR', '🇰🇷'));
  const gerIdx = keys.indexOf(teamKey('GER', '🇩🇪'));
  const ccIdx = keys.indexOf(teamKey('CC', '🥤'));
  if (korIdx === -1 || gerIdx === -1 || ccIdx === -1) throw new Error('Expected teams missing');
  if (korIdx > gerIdx || gerIdx > ccIdx) throw new Error(`Wrong order: ${keys.join(', ')}`);
});

const ALBUM_LIST = `Figurinhas que faltam - Álbum Copa 26

GRUPO A:
MEX: 2, 3, 4, 6, 7. 8, 9, 10, 11, 12, 13, 15, 17, 18
RSA: 3, 6, 7, 8, 10, 11, 15, 16, 17
KOR: 1, 2, 4, 5, 6, 9, 11, 13, 14, 16, 17
SCO:
GRUPO B:
CAN: 2, 3, 7, 9, 10, 11, 12, 13, 18, 19
FWC: 4, 5, 8, 11, 12, 13, 14, 18
CC: 1, 2`;

const album = parseMessage(ALBUM_LIST);

test('Album list parses as need section', () => {
  assertEqual(countStickers(album.need), 54, 'album need count');
  assertEqual(countStickers(album.swaps), 0, 'album swaps');
});

test('Album list has no warnings', () => {
  if (album.warnings.length) throw new Error(album.warnings.join('; '));
});

test('Album list parses period-separated numbers', () => {
  const mexKey = teamKey('MEX', '🇲🇽');
  if (!album.need[mexKey]?.includes(7) || !album.need[mexKey]?.includes(8)) {
    throw new Error(`Expected MEX to include 7 and 8, got ${JSON.stringify(album.need[mexKey])}`);
  }
});

test('Album list skips empty teams', () => {
  const scoKey = teamKey('SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿');
  if (album.need[scoKey]) throw new Error('SCO should be omitted when empty');
});

test('Album list assigns emojis to team keys', () => {
  const korKey = teamKey('KOR', '🇰🇷');
  if (!album.need[korKey]) throw new Error('KOR should use emoji key');
  assertEqual(album.teams[korKey], '🇰🇷', 'KOR emoji');
});

const albumCompare = compareCollections(
  { need: portuguese.need, swaps: portuguese.swaps },
  { need: album.need, swaps: album.swaps }
);

test('Album need format matches swaps by team code', () => {
  const rsaKey = teamKey('RSA', '🇿🇦');
  if (!albumCompare.youGive[rsaKey]?.includes(3)) {
    throw new Error(`Expected RSA:3 in youGive, got ${JSON.stringify(albumCompare.youGive[rsaKey])}`);
  }
});

test('Album format WhatsApp output uses emojis', () => {
  const teams = { ...portuguese.teams, ...album.teams };
  const msg = formatWhatsAppMessage(albumCompare.youGive, albumCompare.youGet, teams, 'https://example.com');
  if (!msg.includes('RSA 🇿🇦: 3')) throw new Error('Missing emoji in album compare output');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
