import * as React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useRepo } from '@/storage/RepositoryProvider';
import { useSettings } from '@/hooks/useSettings';
import { AppShell } from '@/components/AppShell';
import type { Theme } from '@/types';

import Dashboard from '@/pages/Dashboard';
import Workout from '@/pages/Workout';
import Summary from '@/pages/Summary';
import Activity from '@/pages/Activity';
import HistoryPage from '@/pages/History';
import HistoryDetail from '@/pages/HistoryDetail';
import ExerciseHistory from '@/pages/ExerciseHistory';
import Templates from '@/pages/Templates';
import TemplateEditor from '@/pages/TemplateEditor';
import SettingsPage from '@/pages/Settings';
import Onboarding from '@/pages/Onboarding';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', dark);
}

function useThemeEffect(theme: Theme) {
  React.useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);
}

export default function App() {
  const repo = useRepo();
  const [seeded, setSeeded] = React.useState(false);
  const { settings, loading } = useSettings();
  const location = useLocation();

  React.useEffect(() => {
    repo.ensureSeeded().finally(() => setSeeded(true));
  }, [repo]);

  useThemeEffect(settings.theme);

  React.useEffect(() => {
    document.documentElement.dataset.accent = settings.accent;
  }, [settings.accent]);

  // Wait for both seeding and the first settings read before routing decisions.
  if (!seeded || loading) {
    return <div className="min-h-[100dvh] bg-background" />;
  }

  // Force onboarding until a name is set.
  if (!settings.userName && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/workout/:sessionId" element={<Workout />} />
        <Route path="/summary/:sessionId" element={<Summary />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:sessionId" element={<HistoryDetail />} />
        <Route path="/exercise/:exerciseId" element={<ExerciseHistory />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/templates/new" element={<TemplateEditor />} />
        <Route path="/templates/:templateId" element={<TemplateEditor />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
