// ponytail: listSessions() API 대기 중. 표정/음성 지표 기반 그래프는 카메라 제외 결정으로 폐기.
// API 확정 후 기획서의 "면접 목록 목록"(날짜·기업·직무·요약평가, 정렬, 삭제)으로 재구현.
export function HistoryPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1>히스토리</h1>
      <p className="text-sm text-muted-foreground">
        면접 목록 API 연동 대기 중입니다.
      </p>
    </div>
  )
}
