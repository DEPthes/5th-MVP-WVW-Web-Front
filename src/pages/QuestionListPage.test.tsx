// @vitest-environment jsdom
import { StrictMode } from "react"
import { render, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

const createInterviewSession = vi.fn()
vi.mock("@/lib/api", () => ({
  createInterviewSession: (...args: unknown[]) => createInterviewSession(...args),
}))

import { QuestionListPage } from "@/pages/QuestionListPage"

const setupState = {
  applicationProfileId: 1,
  interviewType: "GENERAL",
  durationMinutes: 10,
}

describe("QuestionListPage", () => {
  it("creates the interview session only once even under StrictMode's double effect invocation", async () => {
    createInterviewSession.mockResolvedValue({
      sessionId: 1,
      questions: [{ questionId: 1, content: "질문" }],
    })

    render(
      <StrictMode>
        <MemoryRouter
          initialEntries={[{ pathname: "/questions/new", state: setupState }]}
        >
          <QuestionListPage />
        </MemoryRouter>
      </StrictMode>
    )

    await waitFor(() => expect(createInterviewSession).toHaveBeenCalled())
    // StrictMode가 effect를 mount→cleanup→mount로 두 번 실행해도 세션 생성 API는 1회만 나가야 한다.
    expect(createInterviewSession).toHaveBeenCalledTimes(1)
  })
})
