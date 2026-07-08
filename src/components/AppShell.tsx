import { NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, Dumbbell, History, LayoutGrid, ListChecks, Settings } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';

/** Hide all chrome during the focused logging flow. */
const HIDE_NAV_PREFIXES = ['/workout', '/summary', '/onboarding'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { settings } = useSettings();
  const hideNav = HIDE_NAV_PREFIXES.some((p) => pathname.startsWith(p));

  const tabs = [
    { to: '/', label: 'Today', icon: Dumbbell, end: true },
    { to: '/activity', label: 'Activity', icon: CalendarDays, end: false },
    { to: '/history', label: 'History', icon: History, end: false },
    ...(settings.showExerciseLibrary
      ? [{ to: '/exercises', label: 'Exercises', icon: ListChecks, end: false }]
      : []),
    { to: '/templates', label: 'Plans', icon: LayoutGrid, end: false },
    { to: '/settings', label: 'Settings', icon: Settings, end: false },
  ];

  return (
    <div
      className={cn(
        'min-h-[100dvh] bg-background md:flex',
        // Desktop: floating sidebar + inset content pane (macOS-style panels).
        !hideNav && 'md:h-[100dvh] md:gap-2 md:overflow-hidden md:p-2',
      )}
    >
      {/* Sidebar nav (tablet + desktop) */}
      {!hideNav && (
        <aside className="hidden h-full w-56 shrink-0 flex-col rounded-2xl border border-border bg-card/70 px-3 py-6 backdrop-blur-[20px] backdrop-saturate-[1.8] md:flex lg:w-64">
          <NavLink
            to="/"
            aria-label="Go to home"
            className="mb-8 flex items-center gap-2.5 rounded-lg px-3 py-1 transition-colors hover:opacity-80"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold">Workout</span>
          </NavLink>
          <nav className="flex flex-col gap-1">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
      )}

      {/* Content area — inset, rounded, self-scrolling pane on desktop. */}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          hideNav
            ? 'min-h-[100dvh]'
            : 'min-h-[100dvh] md:h-full md:min-h-0 md:overflow-y-auto md:rounded-2xl md:border md:border-border',
        )}
      >
        <main
          className={cn(
            'mx-auto w-full flex-1',
            // Focused logging flow stays a narrow, centered column.
            // Nav pages fill the content area so the sticky header reads as a
            // full-width bar; each page centers its own body content.
            hideNav && 'max-w-2xl',
            // Leave room for the mobile tab bar; not needed once the sidebar shows.
            !hideNav && 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-10',
          )}
        >
          {children}
        </main>
      </div>

      {/* Bottom tab bar (mobile only) */}
      {!hideNav && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/70 backdrop-blur-[20px] backdrop-saturate-[1.8] md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="mx-auto flex max-w-md items-stretch justify-around">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
