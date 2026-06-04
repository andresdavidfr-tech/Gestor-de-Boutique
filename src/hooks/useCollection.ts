import { useEffect, useState } from 'react';
import { onSnapshot, Query, FirestoreError } from 'firebase/firestore';

/**
 * Subscribes to a Firestore query in real time and returns the documents
 * (with their id), a loading flag and the last error. Centralizes the
 * onSnapshot boilerplate that used to be copy-pasted in every page.
 */
export function useCollection<T>(buildQuery: () => Query, deps: unknown[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      buildQuery(),
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[]);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
        console.error('Firestore listener error:', err);
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
