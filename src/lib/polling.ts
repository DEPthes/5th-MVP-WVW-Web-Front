export interface PollOptions<T> {
  intervalMs?: number
  isDone: (data: T) => boolean
  onData?: (data: T) => void
  onError?: (error: unknown) => void
}

/** Polls fetchFn until isDone(result) is true. Returns a function that cancels polling. */
export function pollUntilDone<T>(
  fetchFn: () => Promise<T>,
  { intervalMs = 3000, isDone, onData, onError }: PollOptions<T>
): () => void {
  let cancelled = false
  let timeoutId: ReturnType<typeof setTimeout>

  const tick = async () => {
    try {
      const result = await fetchFn()
      if (cancelled) return
      onData?.(result)
      if (!isDone(result)) {
        timeoutId = setTimeout(tick, intervalMs)
      }
    } catch (err) {
      if (cancelled) return
      onError?.(err)
    }
  }

  tick()

  return () => {
    cancelled = true
    clearTimeout(timeoutId)
  }
}
