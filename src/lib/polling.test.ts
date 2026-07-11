import { afterEach, describe, expect, it, vi } from "vitest"
import { pollUntilDone } from "@/lib/polling"

interface Status {
  status: "PENDING" | "DONE"
}

afterEach(() => {
  vi.useRealTimers()
})

describe("pollUntilDone", () => {
  it("keeps polling until isDone, reporting each result via onData", async () => {
    vi.useFakeTimers()
    const results: Status[] = [
      { status: "PENDING" },
      { status: "PENDING" },
      { status: "DONE" },
    ]
    let call = 0
    const fetchFn = vi.fn(async () => results[call++])
    const onData = vi.fn()

    pollUntilDone(fetchFn, {
      intervalMs: 1000,
      isDone: (r) => r.status === "DONE",
      onData,
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchFn).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchFn).toHaveBeenCalledTimes(3)
    expect(onData).toHaveBeenLastCalledWith({ status: "DONE" })

    // no further calls scheduled once done
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  it("stops calling fetchFn once cancelled", async () => {
    vi.useFakeTimers()
    const fetchFn = vi.fn(async (): Promise<Status> => ({ status: "PENDING" }))

    const cancel = pollUntilDone(fetchFn, {
      intervalMs: 1000,
      isDone: () => false,
    })

    await vi.advanceTimersByTimeAsync(0)
    cancel()
    await vi.advanceTimersByTimeAsync(5000)

    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it("reports errors via onError and does not keep retrying", async () => {
    vi.useFakeTimers()
    const fetchFn = vi.fn(async (): Promise<Status> => {
      throw new Error("boom")
    })
    const onError = vi.fn()

    pollUntilDone(fetchFn, { intervalMs: 1000, isDone: () => false, onError })

    await vi.advanceTimersByTimeAsync(0)
    expect(onError).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
