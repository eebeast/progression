import type { Mutation, Operation } from './types';
export const entityKey = (store: string, id: string) => `${store}/${id}`;
export function writeKeys(operation: Pick<Operation, 'mutations'>): Set<string> {
  return new Set(operation.mutations.map((m) => entityKey(m.store, m.id)));
}
export function dependencyKeys(operation: Pick<Operation, 'mutations'>): Set<string> {
  const keys = writeKeys(operation);
  for (const mutation of operation.mutations) addReferences(keys, mutation);
  return keys;
}
function addReferences(keys: Set<string>, mutation: Mutation) {
  const data = mutation.data;
  if (!data) return;
  if (mutation.store === 'logs') {
    if (typeof data.sessionId === 'string') keys.add(entityKey('sessions', data.sessionId));
    if (typeof data.exerciseId === 'string') keys.add(entityKey('exercises', data.exerciseId));
  }
  if (Array.isArray(data.exercises)) for (const row of data.exercises) {
    if (row && typeof row.exerciseId === 'string') keys.add(entityKey('exercises', row.exerciseId));
  }
  if (mutation.store === 'programOrder' && Array.isArray(data.orderedIds)) {
    for (const id of data.orderedIds) if (typeof id === 'string') keys.add(entityKey('templates', id));
  }
}
export function dependsOn(candidate: Operation, predecessor: Operation): boolean {
  const candidateReads = dependencyKeys(candidate); const predecessorReads = dependencyKeys(predecessor);
  return [...writeKeys(predecessor)].some((key) => candidateReads.has(key)) ||
    [...writeKeys(candidate)].some((key) => predecessorReads.has(key));
}
