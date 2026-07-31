import { Play, User } from "lucide-react"
import { cn } from "@/lib/utils"

export type ReviewItem = {
  question: string
  answer: string
  failed?: boolean
}

export function ReviewQAList({
  reviews,
  onSelect,
}: {
  reviews: ReviewItem[]
  onSelect?: (index: number) => void
}) {
  return (
    <div className="flex flex-col">
      {reviews.map((review, index) => (
        <div
          key={index}
          onClick={onSelect ? () => onSelect(index) : undefined}
          className={cn(
            "flex flex-col gap-4 pb-8",
            onSelect && "cursor-pointer",
            index < reviews.length - 1 && "mb-8 border-b border-border"
          )}
        >
          <span className="text-xs font-semibold tracking-[0.48px] text-primary">
            Q{index + 1}
          </span>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
              <User size={18} className="text-contents-tertiary" />
            </div>
            <div className="flex-1 rounded-tl-[4px] rounded-tr-[16px] rounded-bl-[16px] rounded-br-[16px] border border-border bg-[#F9FAFB] px-[18px] py-[14px]">
              <p className="text-sm text-foreground">{review.question}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 pl-6">
            <div className="relative flex-1 rounded-tl-[16px] rounded-tr-[16px] rounded-bl-[16px] rounded-br-[4px] border border-primary/15 bg-primary/6 px-[18px] py-[14px]">
              <p className="text-sm text-contents-secondary">{review.answer}</p>
              {!review.failed && (
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute -bottom-2 right-4 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_2px_4px_rgba(53,99,233,0.35)]"
                  aria-label="답변 음성 재생"
                >
                  <Play size={14} fill="currentColor" />
                </button>
              )}
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10">
              <User size={18} className="text-primary" />
            </div>
          </div>

          {review.failed && (
            <div className="ml-6 flex items-center justify-between rounded-[10px] border border-border bg-background px-5 py-3.5">
              <div>
                <p className="text-[15px] font-semibold text-foreground">
                  답변을 분석하지 못했습니다.
                </p>
                <p className="mt-1 text-sm text-contents-tertiary">
                  답변 피드백이 원활하게 분석되지 않았습니다. 다시 시도해주세요
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="h-8 shrink-0 rounded-[8px] border border-input px-4 text-sm text-contents-secondary"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
