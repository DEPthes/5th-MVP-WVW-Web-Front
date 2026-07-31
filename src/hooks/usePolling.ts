import { useEffect, useState } from "react"
import { pollUntilDone } from "@/lib/polling"

interface UsePollingOptions {
  intervalMs?: number
  enabled?: boolean
  retryKey?: number
}

// ponytail: 폴링 대상이 몇 곳뿐이라 React Query 대신 이 얇은 훅으로 직접 구현
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  isDone: (data: T) => boolean,
  { intervalMs = 3000, enabled = true, retryKey = 0 }: UsePollingOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    setError(null)
    setData(null)

    return pollUntilDone(fetchFn, {
      intervalMs,
      isDone,
      onData: setData,
      onError: (err) =>
        setError(
          err instanceof Error ? err.message : "상태 확인에 실패했습니다."
        ),
    })
    // fetchFn/isDone are read once per (enabled, intervalMs, retryKey) cycle by design —
    // this hook targets a single stable id per mount (e.g. an answerId route param).
    // retryKey lets a caller force a fresh polling cycle (e.g. a "다시 시도" button).
  }, [enabled, intervalMs, retryKey])

  return { data, error }
}
