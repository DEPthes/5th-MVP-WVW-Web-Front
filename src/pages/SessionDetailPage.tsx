// ponytail: 세션 단위 종합 피드백 데이터 모델(사고력/실행력/협업력/성장력 등)이
// 백엔드 확정 전까지 보류 상태라 자리표시자만 둔다. 결정되면 화면설계서(홈2/홈3.png) 기준으로 구현.
export function SessionDetailPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1>면접 상세</h1>
      <p className="text-sm text-muted-foreground">
        세션 단위 종합 피드백 데이터 모델이 확정되면 구현됩니다.
      </p>
    </div>
  )
}
