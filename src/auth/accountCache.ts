/** Account identity only, never tokens. Supabase manages its own authenticated session. */
export interface CachedAccount { id: string; email?: string }
const cacheKey = (project: string) => `progression:last-account:${project}`;
export function readAccount(project: string): CachedAccount | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(cacheKey(project)) ?? 'null');
    return value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
      ? { id: value.id, email: 'email' in value && typeof value.email === 'string' ? value.email : undefined } : null;
  } catch { return null; }
}
export function saveAccount(project: string, account: CachedAccount | null): void {
  if (account) localStorage.setItem(cacheKey(project), JSON.stringify(account));
  else localStorage.removeItem(cacheKey(project));
}
