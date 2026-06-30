import * as React from 'react';
import type { WorkoutRepository } from '@/storage/repository';
import { dexieRepository } from '@/storage/dexie/DexieRepository';

const RepositoryContext = React.createContext<WorkoutRepository>(dexieRepository);

/**
 * Provides the app's WorkoutRepository. Defaults to the Dexie singleton; pass a
 * different `repository` (e.g. a future HttpRepository) to swap backends without
 * touching any page/component.
 */
export function RepositoryProvider({
  children,
  repository = dexieRepository,
}: {
  children: React.ReactNode;
  repository?: WorkoutRepository;
}) {
  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>;
}

export function useRepo(): WorkoutRepository {
  return React.useContext(RepositoryContext);
}
