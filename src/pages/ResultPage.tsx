import { useState } from "react"
import { useParams } from "react-router-dom"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { getAnswer } from "@/lib/api"
import { usePolling } from "@/hooks/usePolling"
import type { AnswerRecord } from "@/types"

const TERMINAL_STATUSES = new Set(["DONE", "FAILED"])

export function ResultPage() {
  const { answerId } = useParams<{ answerId: string }>()
  const [retryKey, setRetryKey] = useState(0)

  const { data: answer, error } = usePolling<AnswerRecord>(
    () => getAnswer(answerId!),
    (record) => TERMINAL_STATUSES.has(record.status),
    { enabled: Boolean(answerId), intervalMs: 3000, retryKey }
  )

  const isPending = !error && (!answer || answer.status === "PENDING")
  const isFailed = !error && answer?.status === "FAILED"

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10 text-center">
        {(error || isFailed) && (
          <>
            <div className="flex size-[88px] items-center justify-center rounded-full bg-destructive">
              <X size={44} strokeWidth={3} className="text-white" />
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-heading font-bold text-foreground">
                답변을 변환하지 못했습니다.
              </p>
              <p className="text-2xl text-contents-tertiary">
                다시 시도하거나 현재 질문 답변을 다시 녹음해 주세요
              </p>
            </div>
            <Button
              className="h-[60px] w-[284px] text-label"
              onClick={() => setRetryKey((prev) => prev + 1)}
            >
              다시 시도
            </Button>
          </>
        )}

        {isPending && (
          <>
            <div className="size-[88px] animate-spin rounded-full border-[6px] border-border border-t-primary" />
            <div className="flex flex-col gap-6">
              <p className="text-heading font-bold text-foreground">
                답변을 분석하고 있습니다.
              </p>
              <p className="text-2xl text-contents-tertiary">
                저장된 질문과 답변을 바탕으로 피드백을 준비합니다.
              </p>
            </div>
          </>
        )}

        {answer?.status === "DONE" && (
          <div className="flex w-full max-w-[640px] flex-col gap-2 text-left">
            <p>{answer.feedbackText}</p>
            <p className="text-sm text-muted-foreground">
              답변 시간: {answer.durationSeconds}초
            </p>
            {answer.transcriptText && (
              <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
                <span className="text-sm font-medium">
                  질문다시보기 (답변 스크립트)
                </span>
                <p className="text-sm text-muted-foreground">
                  {answer.transcriptText}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
