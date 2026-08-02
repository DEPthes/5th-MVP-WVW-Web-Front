import { Link, useNavigate, useParams } from "react-router-dom"
import { Minus, Plus, User } from "lucide-react"
import { Button } from "@/components/ui/button"

type EvaluationPoint = {
  label: string
  description: string
}

// ponytail: SessionDetailPage와 같은 이유로 자리표시자 데이터 사용 (백엔드 확정 전).
const DEMO_EVALUATION = {
  applicantName: "홍길동",
  companyName: "네이버",
  jobRole: "서비스 기획",
  overallScore: 78,
  overallDescription: "활동 흐름이 직무와 가깝게 설계된 지원자",
  strengths: [
    {
      label: "맥락 적응력",
      description:
        "사용자가 질문에 답할 때 얼마나 달라질 수 있는지에 대해 언급하며 상대적 외부 맥락을 고려함",
    },
    {
      label: "직무 연계성",
      description:
        "지원 직무와 관련된 경험을 구체적인 수치와 결과 중심으로 풀어내어 신뢰도 높은 답변을 구성함",
    },
  ] satisfies EvaluationPoint[],
  weaknesses: [
    {
      label: "답변 구조화",
      description:
        "사용자가 질문에 답할 때 얼마나 달라질 수 있는지에 대해 언급하며 상대적 외부 맥락을 고려함",
    },
    {
      label: "핵심 요약력",
      description:
        "답변이 길어질수록 핵심 메시지가 흐려지는 경향이 있으며, 문장 내 요점 전달 훈련이 필요함",
    },
    {
      label: "상대적 맥락 인식",
      description:
        "답변이 길어질수록 핵심 메시지가 흐려지는 경향이 있으며, 문장 내 요점 전달 훈련이 필요함",
    },
  ] satisfies EvaluationPoint[],
}

export function InterviewEvaluationPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const evaluation = DEMO_EVALUATION

  return (
    <div className="rounded-[20px] border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.06),0_16px_40px_rgba(53,99,233,0.08)]">
      <div className="flex items-center gap-5 border-b border-border px-8 py-6">
        <div className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-[#C5D4FB] bg-[#F0F4FF]">
          <User size={19} className="text-primary" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            {evaluation.applicantName}
          </p>
          <p className="text-[13px] text-contents-tertiary">
            {evaluation.companyName}, {evaluation.jobRole}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8 px-8 py-8">
      <div>
        <p className="text-xs text-contents-tertiary">종합점수</p>
        <div className="mt-1 flex items-end gap-4">
          <span className="text-[52px] font-bold tracking-[-2.08px] text-primary">
            {evaluation.overallScore}점
          </span>
          <span className="border-b border-contents-tertiary pb-1.5 text-sm text-contents-secondary">
            {evaluation.overallDescription}
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
          {evaluation.strengths.map((point) => (
            <div
              key={point.label}
              className="rounded-[12px] border border-positive/25 bg-positive/6 px-5 py-3.5"
            >
              <p className="text-[15px]">
                <span className="font-bold text-positive">{point.label}</span>
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
          {evaluation.weaknesses.map((point) => (
            <div
              key={point.label}
              className="rounded-[12px] border border-destructive/20 bg-destructive/6 px-5 py-3.5"
            >
              <p className="text-[15px]">
                <span className="font-bold text-destructive">{point.label}</span>
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
