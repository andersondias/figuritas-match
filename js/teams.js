import { teamKey } from './parser.js';

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

const TEAM_ORDER = TEAM_ORDER_LINES.split('\n').map((line) => {
  const match = line.match(TEAM_LINE);
  return teamKey(match[1], match[2]);
});

const TEAM_INDEX = new Map(TEAM_ORDER.map((key, index) => [key, index]));

/** Sort [teamKey, numbers][] entries by album team order. */
export function sortTeamEntries(entries) {
  return [...entries].sort(([a], [b]) => {
    const ia = TEAM_INDEX.get(a) ?? Number.MAX_SAFE_INTEGER;
    const ib = TEAM_INDEX.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b);
  });
}
