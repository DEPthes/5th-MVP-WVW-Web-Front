import { describe, expect, it } from "vitest"
import { countFillerWords } from "@/lib/fillerWords"

describe("countFillerWords", () => {
  it("counts filler words as whole tokens, ignoring content words that merely start with one", () => {
    // "그래서"는 "그"로 시작하지만 통째로 다른 토큰이라 세지 않는다
    expect(
      countFillerWords("음 그래서 어 제 생각에는 그 이렇게 저기 하고 싶습니다")
    ).toBe(4) // 음, 어, 그, 저기
  })

  it("returns 0 when there are no filler words", () => {
    expect(countFillerWords("이 프로젝트는 3개월 동안 진행했습니다")).toBe(0)
  })

  it("counts repeated occurrences of the same filler word", () => {
    expect(countFillerWords("음 음 음 좋습니다")).toBe(3)
  })
})
