import { Link, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { Header } from "@/components/Header"
import { ReviewQAList } from "@/components/ReviewQAList"

// ponytail: SessionDetailPage와 같은 자리표시자 데이터 사용 (백엔드 확정 전).
const DEMO_REVIEWS = [
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
    answer: "5년 후에는 프로덕트 전략을 주도할 수 있는 시니어 기획자로 성장하고 싶습니다.",
  },
]

export function QuestionReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>()

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-[750px] flex-1 flex-col py-12">
        <h1 className="text-[28px] font-bold tracking-[-0.84px] text-foreground">
          질문 다시보기
        </h1>

        <div className="mt-5 rounded-[20px] border border-border bg-card">
          <div className="flex flex-col gap-5 border-b border-border p-7">
            <Link
              to={`/sessions/${sessionId}`}
              className="flex w-fit items-center gap-2 text-sm text-contents-secondary hover:text-foreground"
            >
              <ChevronLeft size={16} />
              돌아가기
            </Link>
          </div>
          <div className="p-7">
            <ReviewQAList reviews={DEMO_REVIEWS} />
          </div>
        </div>
      </div>
    </div>
  )
}
