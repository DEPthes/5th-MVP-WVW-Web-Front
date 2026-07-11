import { beforeEach, describe, expect, it, vi } from "vitest"

const store: Record<string, string> = {}
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v
  },
  removeItem: (k: string) => {
    delete store[k]
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k]
  },
  key: () => null,
  length: 0,
}

import { clearToken, getAnswer, setToken, uploadAnswer } from "@/lib/api"

describe("apiFetch", () => {
  beforeEach(() => {
    clearToken()
    vi.restoreAllMocks()
  })

  it("returns parsed JSON on success", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ id: "1" }), { status: 200 })
    ) as typeof fetch

    const result = await getAnswer("1")

    expect(result).toEqual({ id: "1" })
  })

  it("throws with status and body text on a non-ok response", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("not found", { status: 404 })
    ) as typeof fetch

    await expect(getAnswer("missing")).rejects.toThrow("API error 404: not found")
  })

  it("attaches an Authorization header when a token is set", async () => {
    setToken("abc123")
    let capturedHeaders: Record<string, string> = {}
    globalThis.fetch = vi.fn(async (_url, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>
      return new Response(JSON.stringify({}), { status: 200 })
    }) as typeof fetch

    await getAnswer("1")

    expect(capturedHeaders.Authorization).toBe("Bearer abc123")
  })

  it("omits Content-Type when the body is FormData", async () => {
    let capturedHeaders: Record<string, string> = {}
    globalThis.fetch = vi.fn(async (_url, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>
      return new Response(JSON.stringify({ id: "a1" }), { status: 200 })
    }) as typeof fetch

    await uploadAnswer("q1", new Blob(["x"]), {
      eyeContactRatio: 0.8,
      expressionChanges: 3,
    })

    expect(capturedHeaders["Content-Type"]).toBeUndefined()
  })
})
