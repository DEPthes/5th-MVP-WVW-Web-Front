import { useEffect, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { Header } from "@/components/Header"
import { ReviewQAList, type ReviewItem } from "@/components/ReviewQAList"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
import { getInterviewDetail } from "@/lib/api"

type QuestionReviewNavState = { reviews?: ReviewItem[] }

export function QuestionReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const location = useLocation()
  const { reviews: navReviews } =
    (location.state as QuestionReviewNavState | null) ?? {}

  const [reviews, setReviews] = useState<ReviewItem[] | null>(navReviews ?? null)
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    navReviews ? "loaded" : "loading"
  )
  const [error, setError] = useState<string | null>(null)

  function load() {
    if (!sessionId) return
    setStatus("loading")
    setError(null)
    getInterviewDetail(Number(sessionId))
      .then((detail) => {
        setReviews(
          detail.qaList.map((qa) => ({
            question: qa.questionContent,
            answer: qa.transcript ?? "",
            failed: !qa.transcript,
          }))
        )
        setStatus("loaded")
      })
      .catch((err) => {
        setStatus("error")
        setError(err instanceof Error ? err.message : "면접 결과를 불러오지 못했습니다.")
      })
  }

  useEffect(() => {
    if (navReviews) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- route state로 이미 받았으면 다시 불러오지 않는다
  }, [sessionId])

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
            {status === "loading" && <LoadingState message="불러오는 중..." />}
            {status === "error" && (
              <ErrorState message={error!} retry={load} />
            )}
            {reviews && <ReviewQAList reviews={reviews} />}
          </div>
        </div>
      </div>
    </div>
  )
}
