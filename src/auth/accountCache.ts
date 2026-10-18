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

export function isLocallySignedOut(project: string): boolean {
  try { return localStorage.getItem(`${cacheKey(project)}:signed-out`) === 'true'; } catch { return false; }
}
export function setLocallySignedOut(project: string, signedOut: boolean): void {
  try {
    if (signedOut) localStorage.setItem(`${cacheKey(project)}:signed-out`, 'true');
    else localStorage.removeItem(`${cacheKey(project)}:signed-out`);
  } catch { /* Identity remains scoped in memory when browser storage is unavailable. */ }
}
