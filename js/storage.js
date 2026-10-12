// Local-only persistence. Storage can be unavailable (private mode, blocked site data), so every access is guarded.
const BEST_KEY = 'ffc.best';

export function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Not persisted this session; the in-memory best still works.
  }
}

// The character chosen on the Character tab, shared with the play page. Falls back to the default.
const CHARACTER_KEY = 'ffc.character';

export function loadCharacterId(fallback) {
  try {
    return localStorage.getItem(CHARACTER_KEY) || fallback;
  } catch {
    return fallback;
  }
}

export function saveCharacterId(id) {
  try {
    localStorage.setItem(CHARACTER_KEY, id);
  } catch {
    // Not persisted; the choice still applies until the page is reloaded.
  }
}

// Lifetime stats for the My Stats screen: runs played, total height climbed, runs per character, and how runs
// ended (fall, crow, butterfly, owl, gust).
const STATS_KEY = 'ffc.stats';

export function loadStats() {
  const empty = { runs: 0, totalFt: 0, byCharacter: {}, byCause: {} };
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY));
    return s && typeof s.runs === 'number' ? { ...empty, ...s } : empty;
  } catch {
    return empty;
  }
}

export function recordRun(score, characterId, cause) {
  const s = loadStats();
  s.runs += 1;
  s.totalFt += score;
  s.byCharacter[characterId] = (s.byCharacter[characterId] || 0) + 1;
  if (cause) s.byCause[cause] = (s.byCause[cause] || 0) + 1;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    // Not persisted; stats simply won't include this run.
  }
}
