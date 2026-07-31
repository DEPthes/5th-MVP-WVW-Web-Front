import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReviewQAList, type ReviewItem } from "@/components/ReviewQAList"

type SkillScore = {
  label: string
  score: number
  max: number
}

// ponytail: 세션 종합 피드백 데이터 모델(사고력/실행력/협업력/성장력, 질문별 답변)이
// 백엔드 확정 전이라 화면설계서 기준 자리표시자 데이터로 대체. 실제 세션 API
// (GET /interviews/{sessionId}/detail 형태로 예상)가 연결되면 이 자리를 교체한다.
const DEMO_SESSION = {
  companyName: "네이버",
  jobRole: "서비스 기획",
  careerYears: "신입",
  date: "2026. 07. 22",
  overallScore: 78,
  overallDescription: "활동 흐름이 직무와 가깝게 설계된 지원자",
  skills: [
    { label: "사고력", score: 8, max: 100 },
    { label: "실행력", score: 8, max: 100 },
    { label: "협업력", score: 8, max: 100 },
    { label: "성장력", score: 8, max: 100 },
  ] satisfies SkillScore[],
  reviews: [
    {
      question: "본인이 지원한 직무에서 가장 중요하다고 생각하는 역량은 무엇인가요?",
      answer:
        "저는 서비스 기획 직무에서 가장 중요한 역량은 사용자 중심의 사고라고 생각합니다. 실제로 이전 프로젝트에서 사용자 인터뷰와 데이터 분석을 통해 핵심 문제를 정의하고, 이를 바탕으로 기능 우선순위를 결정하여 전환율을 22% 개선한 경험이 있습니다.",
    },
    {
      question: "팀 내 갈등 상황이 발생했을 때 어떻게 해결했던 경험을 말씀해 주세요.",
      answer:
        "디자이너와 개발자 간의 구현 가능성에 대한 의견 충돌이 있었습니다. 저는 양측의 입장을 먼저 듣고 우선순위 기준을 함께 정리해 절충안을 도출했습니다.",
      failed: true,
    },
    {
      question: "5년 후 본인의 커리어 목표는 무엇인가요?",
      answer:
        "5년 후에는 프로덕트 전략을 주도할 수 있는 시니어 기획자로 성장하고 싶습니다.",
    },
  ] satisfies ReviewItem[],
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
  const [tab, setTab] = useState<"feedback" | "review">("feedback")
  const session = DEMO_SESSION

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
          {session.companyName}, {session.jobRole}, {session.careerYears} 채용 면접
        </h1>
        <p className="mt-3 text-sm text-contents-tertiary">{session.date}</p>
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
                {session.overallScore}점
              </span>
              <span className="pb-1.5 text-sm text-contents-tertiary">
                / 100점
              </span>
              <span className="border-b border-contents-tertiary pb-1.5 text-sm text-contents-secondary">
                {session.overallDescription}
              </span>
            </div>

            <div className="mt-7 h-px w-full bg-border" />

            <div className="mt-7 flex flex-col gap-5">
              {session.skills.map((skill) => (
                <SkillBar key={skill.label} {...skill} />
              ))}
            </div>
          </div>
        ) : (
          <div className="pt-8">
            <ReviewQAList
              reviews={session.reviews}
              onSelect={() => navigate(`/sessions/${sessionId}/review`)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
