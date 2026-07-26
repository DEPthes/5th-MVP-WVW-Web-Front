import { beforeEach, describe, expect, it, vi } from "vitest"

function makeStorage(store: Record<string, string>): Storage {
  return {
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
}

;(globalThis as unknown as { localStorage: Storage }).localStorage = makeStorage({})
;(globalThis as unknown as { sessionStorage: Storage }).sessionStorage = makeStorage({})

;(globalThis as unknown as { window: { location: { href: string } } }).window = {
  location: { href: "" },
}

import { clearToken, getAnswer, getToken, setToken, uploadAnswer } from "@/lib/api"

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

    await uploadAnswer("q1", new Blob(["x"]))

    expect(capturedHeaders["Content-Type"]).toBeUndefined()
  })

  it("clears the token and redirects to /login on a 401 response", async () => {
    setToken("abc123")
    globalThis.fetch = vi.fn(
      async () => new Response("unauthorized", { status: 401 })
    ) as typeof fetch

    await expect(getAnswer("1")).rejects.toThrow("인증이 만료되었습니다")

    expect(getToken()).toBeNull()
    expect(
      (globalThis as unknown as { window: { location: { href: string } } })
        .window.location.href
    ).toBe("/login")
  })
})
