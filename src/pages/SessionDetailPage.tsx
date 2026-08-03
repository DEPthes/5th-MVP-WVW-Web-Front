import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { getInterviewDetail } from "@/lib/api"
import { CAREER_LEVEL_LABELS } from "@/lib/careerLevels"
import { ReviewQAList, type ReviewItem } from "@/components/ReviewQAList"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
import type { InterviewSessionDetail } from "@/types"

type SkillScore = {
  label: string
  score: number
  max: number
}

type SessionDetailNavState = { createdAt?: string }

function toReviews(detail: InterviewSessionDetail): ReviewItem[] {
  return detail.qaList.map((qa) => ({
    question: qa.questionContent,
    answer: qa.transcript ?? "",
    failed: !qa.transcript,
  }))
}

function toSkills(detail: InterviewSessionDetail): SkillScore[] {
  const c = detail.overallFeedback.competencies
  return [
    { label: "사고력", score: c.thinkingScore, max: 100 },
    { label: "실행력", score: c.executionScore, max: 100 },
    { label: "협업력", score: c.collaborationScore, max: 100 },
    { label: "성장력", score: c.growthScore, max: 100 },
    { label: "정착력", score: c.adaptabilityScore, max: 100 },
  ]
}

function SkillBar({ label, score, max }: SkillScore) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-12 shrink-0 text-sm font-semibold text-foreground">
        {label}
      </span>
      <div className="h-7 flex-1 overflow-hidden rounded-[6px] bg-[#EEF2FF]">
        <div
          className="h-7 rounded-[6px] bg-gradient-to-r from-primary to-[#6B9FFF]"
          style={{ width: `${Math.min(100, (score / max) * 100)}%` }}
        />
      </div>
      <span className="w-[52px] shrink-0 text-right text-[13px] text-contents-tertiary">
        {score}/{max}
      </span>
    </div>
  )
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { createdAt } = (location.state as SessionDetailNavState | null) ?? {}
  const [tab, setTab] = useState<"feedback" | "review">("feedback")
  const [detail, setDetail] = useState<InterviewSessionDetail | null>(null)
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  function load() {
    if (!sessionId) return
    setStatus("loading")
    setError(null)
    getInterviewDetail(Number(sessionId))
      .then((data) => {
        setDetail(data)
        setStatus("loaded")
      })
      .catch((err) => {
        setStatus("error")
        setError(err instanceof Error ? err.message : "면접 결과를 불러오지 못했습니다.")
      })
  }

  useEffect(load, [sessionId])

  if (status === "loading") {
    return <LoadingState message="면접 결과를 불러오는 중..." />
  }
  if (status === "error" || !detail) {
    return <ErrorState message={error ?? "면접 결과를 불러오지 못했습니다."} retry={load} />
  }

  const reviews = toReviews(detail)
  const skills = toSkills(detail)
  const careerLabel = CAREER_LEVEL_LABELS[detail.careerLevel]

  return (
    <div className="flex flex-col gap-1">
      <Link
        to="/"
        className="flex w-fit items-center gap-1 text-sm text-contents-secondary hover:text-foreground"
      >
        <ChevronLeft size={16} />
        면접 목록으로
      </Link>
      <div className="mt-3 h-px w-full bg-border" />

      <div className="pt-6">
        <h1 className="text-heading font-bold text-foreground">
          {detail.companyName}, {detail.jobPosition}, {careerLabel} 채용 면접
        </h1>
        {createdAt && (
          <p className="mt-3 text-sm text-contents-tertiary">
            {new Date(createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>

      <div className="mt-9 rounded-[20px] border border-border bg-card px-10 pb-10 pt-8 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_12px_16px_rgba(0,0,0,0.07)]">
        <h2 className="text-label font-semibold text-foreground">면접 결과</h2>
        <div className="mt-5 h-px w-full bg-border" />

        <div className="mt-6 flex h-[37px] gap-1 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("feedback")}
            className={cn(
              "border-b-2 px-1 pb-3.5 text-sm",
              tab === "feedback"
                ? "border-foreground font-semibold text-foreground"
                : "border-transparent text-contents-tertiary"
            )}
          >
            피드백
          </button>
          <button
            type="button"
            onClick={() => setTab("review")}
            className={cn(
              "border-b-2 px-1 pb-3.5 text-sm",
              tab === "review"
                ? "border-foreground font-semibold text-foreground"
                : "border-transparent text-contents-tertiary"
            )}
          >
            질문별 다시보기
          </button>
        </div>

        {tab === "feedback" ? (
          <div className="pt-8">
            <p className="text-xs text-contents-tertiary">종합점수</p>
            <div className="mt-1 flex items-end gap-4">
              <span className="text-[56px] font-bold tracking-[-2.24px] text-foreground">
                {detail.overallFeedback.totalScore}점
              </span>
              <span className="pb-1.5 text-sm text-contents-tertiary">
                / 100점
              </span>
              <span className="border-b border-contents-tertiary pb-1.5 text-sm text-contents-secondary">
                {detail.overallFeedback.overallSummary}
              </span>
            </div>

            <div className="mt-7 h-px w-full bg-border" />

            <div className="mt-7 flex flex-col gap-5">
              {skills.map((skill) => (
                <SkillBar key={skill.label} {...skill} />
              ))}
            </div>
          </div>
        ) : (
          <div className="pt-8">
            <ReviewQAList
              reviews={reviews}
              onSelect={() =>
                navigate(`/sessions/${sessionId}/review`, { state: { reviews } })
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
