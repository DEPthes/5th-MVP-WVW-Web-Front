import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { generateQuestions } from "@/lib/api"

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

export function QuestionListPage() {
  const { interviewId } = useParams<{ interviewId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { durationMinutes } =
    (location.state as { durationMinutes?: number } | null) ?? {}
  const [error, setError] = useState<string | null>(null)

  function load() {
    if (!interviewId) return
    setError(null)
    generateQuestions(interviewId)
      .then((questionSet) => {
        const first = questionSet.questions[0]
        if (!first) return
        navigate(`/record/${first.id}/start`, {
          state: {
            questions: questionSet.questions,
            currentIndex: 0,
            interviewId,
          },
        })
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "면접 세션을 생성하지 못했습니다.")
      )
  }

  useEffect(load, [interviewId])

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
