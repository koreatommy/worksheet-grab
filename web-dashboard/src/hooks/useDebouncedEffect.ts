import { useEffect, useRef } from 'react';

export function useDebouncedEffect(effect: () => void, deps: unknown[], ms: number) {
  const fn = useRef(effect);
  fn.current = effect;

  useEffect(() => {
    const t = setTimeout(() => fn.current(), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional debounce deps
  }, deps);
}
