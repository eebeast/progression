import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const cloudClient = url && key ? createClient(url, key, {
  auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true },
}) : null;
export const cloudProject = url ? new URL(url).host : '';

// React StrictMode can mount effects twice; one authorization code must be exchanged once.
let callback: Promise<void> | undefined;
export function completeOAuth(): Promise<void> {
  if (callback) return callback;
  const params = new URLSearchParams(window.location.search);
  if (window.location.pathname !== '/auth/callback') return Promise.resolve();
  callback = (async () => {
    if (params.has('error')) throw new Error(params.get('error_description') ?? 'Google sign-in was cancelled.');
    const code = params.get('code');
    if (!code || !cloudClient) throw new Error('Missing sign-in code or cloud configuration.');
    const { error } = await cloudClient.auth.exchangeCodeForSession(code);
    if (error) throw error;
    window.history.replaceState(null, '', '/settings');
  })();
  return callback;
}
