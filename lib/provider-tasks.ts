export type ProviderTask<T> = {
  name: string;
  run: (signal: AbortSignal) => Promise<T>;
};
export type ProviderOutcome<T> = { name: string; value?: T; error?: unknown };
// Results retain registration order. Deadline failures never expose late mutations.
export async function runProviderTasks<T>(
  tasks: ProviderTask<T>[],
  options: {
    concurrency?: number;
    timeoutMs?: number;
  } = {},
): Promise<ProviderOutcome<T>[]> {
  const controller = new AbortController();
  const deadline = new DOMException(
    "Refresh deadline exceeded",
    "TimeoutError",
  );
  let timer: ReturnType<typeof setTimeout>;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(deadline);
      reject(deadline);
    }, options.timeoutMs ?? 20000);
  });
  const outcomes: ProviderOutcome<T>[] = new Array(tasks.length);
  let next = 0;
  try {
    await Promise.all(
      Array.from(
        { length: Math.min(options.concurrency ?? 6, tasks.length) },
        async () => {
          while (next < tasks.length) {
            const index = next++,
              task = tasks[index];
            try {
              if (controller.signal.aborted) throw deadline;
              const value = await Promise.race([
                task.run(controller.signal),
                expired,
              ]);
              outcomes[index] = { name: task.name, value };
            } catch (error) {
              outcomes[index] = { name: task.name, error };
            }
          }
        },
      ),
    );
  } finally {
    clearTimeout(timer!);
  }
  return outcomes;
}
