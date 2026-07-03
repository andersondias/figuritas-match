export function teamKey(code, emoji) {
  return `${code}:${emoji}`;
}

const TEAM_ORDER_LINES = `
FWC 🌎
FWC 📜
MEX 🇲🇽
RSA 🇿🇦
KOR 🇰🇷
CZE 🇨🇿
CAN 🇨🇦
BIH 🇧🇦
QAT 🇶🇦
SUI 🇨🇭
BRA 🇧🇷
MAR 🇲🇦
HAI 🇭🇹
SCO 🏴󠁧󠁢󠁳󠁣󠁴󠁿
USA 🇺🇸
PAR 🇵🇾
AUS 🇦🇺
TUR 🇹🇷
GER 🇩🇪
CUW 🇨🇼
CIV 🇨🇮
ECU 🇪🇨
NED 🇳🇱
JPN 🇯🇵
SWE 🇸🇪
TUN 🇹🇳
BEL 🇧🇪
EGY 🇪🇬
IRN 🇮🇷
NZL 🇳🇿
ESP 🇪🇸
CPV 🇨🇻
KSA 🇸🇦
URU 🇺🇾
FRA 🇫🇷
SEN 🇸🇳
IRQ 🇮🇶
NOR 🇳🇴
ARG 🇦🇷
ALG 🇩🇿
AUT 🇦🇹
JOR 🇯🇴
POR 🇵🇹
COD 🇨🇩
UZB 🇺🇿
COL 🇨🇴
ENG 🏴󠁧󠁢󠁥󠁮󠁧󠁿
CRO 🇭🇷
GHA 🇬🇭
PAN 🇵🇦
CC 🥤
`.trim();

const TEAM_LINE = /^([A-Z]{2,4})\s+(\S+)$/u;

const CODE_TO_EMOJI = new Map();
for (const line of TEAM_ORDER_LINES.split('\n')) {
  const match = line.match(TEAM_LINE);
  if (match && !CODE_TO_EMOJI.has(match[1])) {
    CODE_TO_EMOJI.set(match[1], match[2]);
  }
}

const TEAM_ORDER = TEAM_ORDER_LINES.split('\n').map((line) => {
  const match = line.match(TEAM_LINE);
  return teamKey(match[1], match[2]);
});

const TEAM_INDEX = new Map(TEAM_ORDER.map((key, index) => [key, index]));
const CODE_INDEX = new Map(TEAM_ORDER.map((key, index) => [key.slice(0, key.indexOf(':')), index]));

/** Emoji for a team code (first album entry when duplicates exist, e.g. FWC). */
export function emojiForCode(code) {
  return CODE_TO_EMOJI.get(code) || '';
}

/** Canonical team key for album-style input that omits emojis. */
export function teamKeyForCode(code) {
  return teamKey(code, emojiForCode(code));
}

/** Sort [teamKey, numbers][] entries by album team order. */
export function sortTeamEntries(entries) {
  return [...entries].sort(([a], [b]) => {
    const ia = TEAM_INDEX.get(a) ?? CODE_INDEX.get(a.slice(0, a.indexOf(':'))) ?? Number.MAX_SAFE_INTEGER;
    const ib = TEAM_INDEX.get(b) ?? CODE_INDEX.get(b.slice(0, b.indexOf(':'))) ?? Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b);
  });
}
