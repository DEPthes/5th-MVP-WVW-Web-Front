import { useParams } from "react-router-dom"
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && (!answer || answer.status === "PENDING") && (
        <p className="text-sm text-muted-foreground">
          답변을 분석하는 중입니다...
        </p>
      )}

      {answer?.status === "FAILED" && (
        <p className="text-sm text-destructive">
          분석에 실패했습니다. 다시 시도해주세요.
        </p>
      )}

      {answer?.status === "DONE" && (
        <div className="flex flex-col gap-2">
          <p>{answer.feedbackText}</p>
          <p className="text-sm text-muted-foreground">
            아이컨택 비율: {(answer.facialMetrics.eyeContactRatio * 100).toFixed(0)}% ·
            표정 변화 횟수: {answer.facialMetrics.expressionChanges} · 답변 시간:{" "}
            {answer.durationSeconds}초
          </p>
          <video controls src={answer.videoUrl} className="w-80 rounded-lg" />
        </div>
      )}
    </div>
  )
}
