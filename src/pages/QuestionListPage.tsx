import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { createInterviewSession } from "@/lib/api"

function DurationBadge({ minutes }: { minutes?: number }) {
  if (!minutes) return null
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-[#C5D4FB] bg-[#F0F4FF] px-4 py-1.5">
      <Clock size={16} className="text-primary" />
      <span className="text-lg font-bold tracking-[0.72px] text-primary">
        {String(minutes).padStart(2, "0")}:00
      </span>
    </div>
  )
}

type SetupNavState = {
  applicationProfileId?: number
  interviewType?: string
  durationMinutes?: number
}

export function QuestionListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { applicationProfileId, interviewType, durationMinutes } =
    (location.state as SetupNavState | null) ?? {}
  const [error, setError] = useState<string | null>(null)
  // StrictMode 이중 실행이나 컴포넌트 재마운트로 effect가 다시 돌아도
  // 세션 생성은 최초 1회만 나가도록 막는다. "다시 시도" 버튼은 이 ref와
  // 무관하게 load()를 직접 호출하므로 정상 동작한다.
  const startedRef = useRef(false)

  function load() {
    if (!applicationProfileId || !interviewType || !durationMinutes) {
      // 면접 조건 설정을 거치지 않고 직접 들어온 경우(새로고침 등) — 설정 화면으로 되돌린다.
      navigate("/interviews/new", { replace: true })
      return
    }
    setError(null)
    createInterviewSession({ applicationProfileId, interviewType, durationMinutes })
      .then((session) => {
        const first = session.questions[0]
        if (!first) return
        navigate(`/record/${first.questionId}/start`, {
          state: {
            questions: session.questions.map((q) => ({
              id: String(q.questionId),
              text: q.content,
            })),
            currentIndex: 0,
            interviewId: String(session.sessionId),
            durationMinutes,
          },
        })
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "면접 세션을 생성하지 못했습니다.")
      )
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 최초 1회만 실행
  }, [applicationProfileId, interviewType, durationMinutes])

  return (
    <div className="flex min-h-screen flex-col">
      <Header right={<DurationBadge minutes={durationMinutes} />} />
      <div className="mx-auto flex w-full max-w-[678px] flex-1 flex-col items-center justify-center gap-8 py-10 text-center">
        {error ? (
          <>
            <div className="flex size-[88px] items-center justify-center rounded-full bg-destructive">
              <X size={44} strokeWidth={3} className="text-white" />
            </div>
            <p className="text-heading font-bold text-foreground">{error}</p>
            <Button className="h-[60px] w-[284px] text-label" onClick={load}>
              다시 시도
            </Button>
          </>
        ) : (
          <>
            <div className="size-[88px] animate-spin rounded-full border-[6px] border-border border-t-primary" />
            <div className="flex flex-col gap-6">
              <p className="text-heading font-bold text-foreground">
                면접 질문을 준비하고 있습니다.
              </p>
              <p className="text-2xl text-contents-tertiary">
                기업 / 직무 / 경력 정보를 바탕으로 질문 세트와 출제 순서를 저장합니다.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
