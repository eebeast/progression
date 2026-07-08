import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Observable } from '@/storage/repository';
import { useObservable } from '@/hooks/useObservable';

function makeObservable<T>() {
  let observer: { next: (v: T) => void } | null = null;
  const unsubscribe = vi.fn();
  const obs: Observable<T> = {
    subscribe(o) {
      observer = o;
      return { unsubscribe };
    },
  };
  return { obs, unsubscribe, emit: (v: T) => act(() => observer?.next(v)) };
}

describe('useObservable', () => {
  it('is undefined until the first emit, then tracks the latest value', () => {
    const { obs, emit } = makeObservable<number>();
    const { result } = renderHook(() => useObservable(() => obs, []));

    expect(result.current).toBeUndefined();
    emit(1);
    expect(result.current).toBe(1);
    emit(2);
    expect(result.current).toBe(2);
  });

  it('unsubscribes on unmount', () => {
    const { obs, unsubscribe } = makeObservable<number>();
    const { unmount } = renderHook(() => useObservable(() => obs, []));

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
