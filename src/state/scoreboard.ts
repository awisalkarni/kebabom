export interface ScoreEntry {
  id: number;
  initials: string;
  score: number;
  created_at: number;
}

const TOP_N = 10;

function tzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

export async function fetchScores(scope: 'today' | 'all', limit = TOP_N): Promise<ScoreEntry[]> {
  const res = await fetch(`/api/scores?scope=${scope}&limit=${limit}&tz=${tzOffsetMinutes()}`);
  if (!res.ok) throw new Error(`scoreboard fetch failed (${res.status})`);
  const data = (await res.json()) as { entries: ScoreEntry[] };
  return data.entries;
}

export async function submitScore(
  initials: string,
  score: number,
): Promise<{ id: number; initials: string; score: number }> {
  const res = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initials, score }),
  });
  if (!res.ok) throw new Error(`score submit failed (${res.status})`);
  return (await res.json()) as { id: number; initials: string; score: number };
}

export function qualifies(entries: ScoreEntry[], score: number): boolean {
  if (score <= 0) return false;
  if (entries.length < TOP_N) return true;
  return score > entries[entries.length - 1].score;
}
