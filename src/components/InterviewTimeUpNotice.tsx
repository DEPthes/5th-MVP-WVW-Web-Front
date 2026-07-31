import { Header } from "@/components/Header"

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

// ponytail: 전체 면접 경과 시간을 질문 간에도 추적하는 전역 타이머가 아직 없어서
// (백엔드 세션 API 연동 전) 이 화면은 아직 어디서도 트리거되지 않는 컴포넌트로만 존재한다.
// 세션 기반 API(POST /interviews, .../complete)가 연결되면 RecordPage에서
// 누적 경과 시간이 durationMinutes를 넘을 때 렌더링하면 된다.
export function InterviewTimeUpNotice({
  progressRatio,
  totalElapsedSeconds,
}: {
  progressRatio: number
  totalElapsedSeconds: number
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-[750px] flex-1 flex-col items-center justify-center gap-16 py-10">
        <div className="flex w-full flex-col items-center gap-8 rounded-[20px] border border-secondary bg-card px-14 py-10 shadow-[0_4px_10px_rgba(0,0,0,0.06)]">
          <div className="flex w-full flex-col items-center gap-6">
            <p className="text-center text-[32px] font-bold text-foreground">
              전체 면접 시간이 종료됐습니다.
            </p>
            <div className="h-8 w-full overflow-hidden rounded-full bg-[#DBE9F3]">
              <div
                className="h-8 rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, progressRatio * 100))}%` }}
              />
            </div>
          </div>
          <div className="flex w-[316px] flex-col items-center gap-3 text-center">
            <p className="text-sm text-contents-secondary">
              현재 녹음을 종료하고 마지막 답변을 텍스트로 변환합니다.
            </p>
            <p className="text-xs font-light text-contents-tertiary">
              처리가 완료되면 답변 분석 화면으로 자동 이동합니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[15px] font-medium text-foreground">
            전체 면접 시간
          </span>
          <span className="text-[32px] font-bold tracking-[0.64px] text-foreground">
            {formatElapsed(totalElapsedSeconds)}
          </span>
        </div>
      </div>
    </div>
  )
}
