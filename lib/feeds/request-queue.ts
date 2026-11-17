export type RequestQueue = <T>(request: () => Promise<T>) => Promise<T>;

// Hold each slot until the response body has been consumed, not just its headers.
export function createRequestQueue(): RequestQueue {
  let active = 0;
  const waiting: (() => void)[] = [];

  return async <T>(request: () => Promise<T>): Promise<T> => {
    if (active < 4) active++;
    else await new Promise<void>((resolve) => waiting.push(resolve));

    try {
      return await request();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}
