import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { Minus, Plus, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
import { getInterviewDetail, getUserProfile } from "@/lib/api"
import type { OverallFeedback } from "@/types"

type EvaluationNavState = { feedback?: OverallFeedback }

export function InterviewEvaluationPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { feedback: navFeedback } =
    (location.state as EvaluationNavState | null) ?? {}

  const [applicantName, setApplicantName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobPosition, setJobPosition] = useState("")
  const [feedback, setFeedback] = useState<OverallFeedback | null>(navFeedback ?? null)
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading")
  const [loadError, setLoadError] = useState<string | null>(null)

  function load() {
    if (!sessionId) return
    setStatus("loading")
    setLoadError(null)
    Promise.all([getUserProfile(), getInterviewDetail(Number(sessionId))])
      .then(([profile, detail]) => {
        setApplicantName(profile.nickname)
        setCompanyName(detail.companyName)
        setJobPosition(detail.jobPosition)
        setFeedback((prev) => prev ?? detail.overallFeedback)
        setStatus("loaded")
      })
      .catch((err) => {
        setStatus("error")
        setLoadError(
          err instanceof Error ? err.message : "면접 결과를 불러오지 못했습니다."
        )
      })
  }

  useEffect(load, [sessionId])

  if (status === "loading" && !feedback) {
    return <LoadingState message="면접 결과를 불러오는 중..." />
  }
  if (status === "error" && !feedback) {
    return <ErrorState message={loadError!} retry={load} />
  }
  if (!feedback) return null

  const strengths = feedback.feedbackPoints.filter((p) => p.type === "STRENGTH")
  const weaknesses = feedback.feedbackPoints.filter((p) => p.type === "WEAKNESS")

  return (
    <div className="rounded-[20px] border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.06),0_16px_40px_rgba(53,99,233,0.08)]">
      <div className="flex items-center gap-5 border-b border-border px-8 py-6">
        <div className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-[#C5D4FB] bg-[#F0F4FF]">
          <User size={19} className="text-primary" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">{applicantName}</p>
          <p className="text-[13px] text-contents-tertiary">
            {companyName}, {jobPosition}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8 px-8 py-8">
      <div>
        <p className="text-xs text-contents-tertiary">종합점수</p>
        <div className="mt-1 flex items-end gap-4">
          <span className="text-[52px] font-bold tracking-[-2.08px] text-primary">
            {feedback.totalScore}점
          </span>
          <span className="border-b border-contents-tertiary pb-1.5 text-sm text-contents-secondary">
            {feedback.overallSummary}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-contents-tertiary">/ 100점</p>
      </div>

      <div className="h-px w-full bg-border" />

      <div>
        <div className="flex items-center gap-2">
          <Plus size={18} className="text-positive" />
          <span className="text-base font-bold text-contents-secondary">강점</span>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {strengths.map((point) => (
            <div
              key={point.title}
              className="rounded-[12px] border border-positive/25 bg-positive/6 px-5 py-3.5"
            >
              <p className="text-[15px]">
                <span className="font-bold text-positive">{point.title}</span>
                <span className="text-foreground">: </span>
                <span className="text-contents-secondary">{point.description}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-border" />

      <div>
        <div className="flex items-center gap-2">
          <Minus size={18} className="text-destructive" />
          <span className="text-base font-bold text-foreground">약점</span>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {weaknesses.map((point) => (
            <div
              key={point.title}
              className="rounded-[12px] border border-destructive/20 bg-destructive/6 px-5 py-3.5"
            >
              <p className="text-[15px]">
                <span className="font-bold text-destructive">{point.title}</span>
                <span className="text-foreground">: </span>
                <span className="text-contents-secondary">{point.description}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-border" />

      <div className="flex justify-end gap-6">
        <Link to={`/sessions/${sessionId}/review`}>
          <Button>질문 다시보기</Button>
        </Link>
        <Button
          variant="outline"
          className="border-contents-secondary"
          onClick={() => navigate("/")}
        >
          홈으로 이동
        </Button>
      </div>
      </div>
    </div>
  )
}
