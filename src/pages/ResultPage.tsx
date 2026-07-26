import { useParams } from "react-router-dom"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
import { getAnswer } from "@/lib/api"
import { usePolling } from "@/hooks/usePolling"
import type { AnswerRecord } from "@/types"

const TERMINAL_STATUSES = new Set(["DONE", "FAILED"])

export function ResultPage() {
  const { answerId } = useParams<{ answerId: string }>()

  const { data: answer, error } = usePolling<AnswerRecord>(
    () => getAnswer(answerId!),
    (record) => TERMINAL_STATUSES.has(record.status),
    { enabled: Boolean(answerId), intervalMs: 3000 }
  )

  return (
    <div className="flex flex-col gap-4">
      <h1>결과 / 피드백</h1>

      {error && <ErrorState message={error} />}

      {!error && (!answer || answer.status === "PENDING") && (
        <LoadingState message="답변을 분석하는 중입니다..." />
      )}

      {answer?.status === "FAILED" && (
        <ErrorState message="분석에 실패했습니다. 다시 시도해주세요." />
      )}

      {answer?.status === "DONE" && (
        <div className="flex flex-col gap-2">
          <p>{answer.feedbackText}</p>
          <p className="text-sm text-muted-foreground">답변 시간: {answer.durationSeconds}초</p>
          {answer.transcriptText && (
            <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <span className="text-sm font-medium">질문다시보기 (답변 스크립트)</span>
              <p className="text-sm text-muted-foreground">{answer.transcriptText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
