import * as React from 'react';
import type { Observable } from '@/storage/repository';

/**
 * Subscribes to an Observable produced by `factory`, returns the latest value
 * (undefined until the first emit), and unsubscribes on cleanup / when `deps`
 * change. Backend-neutral replacement for dexie-react-hooks' useLiveQuery.
 */
export function useObservable<T>(
  factory: () => Observable<T>,
  deps: React.DependencyList,
): T | undefined {
  const [value, setValue] = React.useState<T | undefined>(undefined);

  React.useEffect(() => {
    const subscription = factory().subscribe({
      next: (v) => setValue(v),
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
