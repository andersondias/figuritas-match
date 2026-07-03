const STORAGE_KEY = 'figuritas-match';

const DEFAULT_DATA = {
  myCollection: null,
  teams: {},
};

/**
 * @returns {{ myCollection: object|null, teams: Record<string, string> }}
 */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DATA };
    const data = { ...DEFAULT_DATA, ...JSON.parse(raw) };
    delete data.savedComparisons;
    return data;
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveCollection(parsed, rawText) {
  const data = loadData();
  data.myCollection = {
    updatedAt: new Date().toISOString(),
    rawText,
    need: parsed.need,
    swaps: parsed.swaps,
  };
  data.teams = { ...data.teams, ...parsed.teams };
  saveData(data);
  return data;
}
