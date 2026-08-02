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

import { clearToken, getAccessToken, getUserProfile, setTokens, submitAnswer } from "@/lib/api"

describe("apiFetch", () => {
  beforeEach(() => {
    clearToken()
    vi.restoreAllMocks()
  })

  it("returns parsed JSON on success", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ id: 1, loginId: "u", nickname: "n", desiredPosition: "p" }),
          { status: 200 }
        )
    ) as typeof fetch

    const result = await getUserProfile()

    expect(result.loginId).toBe("u")
  })

  it("throws with status and body text on a non-ok response", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("not found", { status: 404 })
    ) as typeof fetch

    await expect(getUserProfile()).rejects.toThrow("API error 404: not found")
  })

  it("attaches an Authorization header when a token is set", async () => {
    setTokens("abc123", "refresh123")
    let capturedHeaders: Record<string, string> = {}
    globalThis.fetch = vi.fn(async (_url, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>
      return new Response(JSON.stringify({}), { status: 200 })
    }) as typeof fetch

    await getUserProfile()

    expect(capturedHeaders.Authorization).toBe("Bearer abc123")
  })

  it("omits Content-Type when the body is FormData", async () => {
    let capturedHeaders: Record<string, string> = {}
    globalThis.fetch = vi.fn(async (_url, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>
      return new Response(JSON.stringify({ answerId: 1, questionId: 2, status: "COMPLETED" }), {
        status: 200,
      })
    }) as typeof fetch

    await submitAnswer(1, 2, new Blob(["x"]))

    expect(capturedHeaders["Content-Type"]).toBeUndefined()
  })

  it("reissues the access token once on 401 and retries the original request", async () => {
    setTokens("expired-access", "refresh-token")
    let call = 0
    globalThis.fetch = vi.fn(async (url) => {
      call++
      if (typeof url === "string" && url.includes("/auth/reissue")) {
        return new Response(
          JSON.stringify({ accessToken: "new-access", refreshToken: "new-refresh" }),
          { status: 200 }
        )
      }
      if (call === 1) {
        return new Response("unauthorized", { status: 401 })
      }
      return new Response(
        JSON.stringify({ id: 1, loginId: "u", nickname: "n", desiredPosition: "p" }),
        { status: 200 }
      )
    }) as typeof fetch

    const result = await getUserProfile()

    expect(result.loginId).toBe("u")
    expect(getAccessToken()).toBe("new-access")
  })

  it("dedupes concurrent 401s into a single reissue call", async () => {
    setTokens("expired-access", "refresh-token")
    let reissueCalls = 0
    let profileCalls = 0
    globalThis.fetch = vi.fn(async (url) => {
      if (typeof url === "string" && url.includes("/auth/reissue")) {
        reissueCalls++
        return new Response(
          JSON.stringify({ accessToken: "new-access", refreshToken: "new-refresh" }),
          { status: 200 }
        )
      }
      profileCalls++
      // 두 요청의 최초 시도(1, 2번째)는 401, 재발급 후 재시도는 성공.
      if (profileCalls <= 2) {
        return new Response("unauthorized", { status: 401 })
      }
      return new Response(
        JSON.stringify({ id: 1, loginId: "u", nickname: "n", desiredPosition: "p" }),
        { status: 200 }
      )
    }) as typeof fetch

    const [a, b] = await Promise.all([getUserProfile(), getUserProfile()])

    expect(a.loginId).toBe("u")
    expect(b.loginId).toBe("u")
    expect(reissueCalls).toBe(1)
  })

  it("clears the token and redirects to /login when reissue fails on a 401", async () => {
    setTokens("expired-access", "refresh-token")
    globalThis.fetch = vi.fn(
      async () => new Response("unauthorized", { status: 401 })
    ) as typeof fetch

    await expect(getUserProfile()).rejects.toThrow("인증이 만료되었습니다")

    expect(getAccessToken()).toBeNull()
    expect(
      (globalThis as unknown as { window: { location: { href: string } } })
        .window.location.href
    ).toBe("/login")
  })
})
