import { Link } from "react-router-dom"

// ponytail: listSessions() API 대기 중이라 항상 빈 상태로 표시. 연동되면 최근 면접 최대 3건 렌더링.
export function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1>홈</h1>
      <p className="text-sm text-muted-foreground">
        아직 진행한 모의면접이 없습니다. 첫 모의면접을 시작해보세요.
      </p>
      <Link to="/interviews/new" className="underline">
        모의면접 시작하기
      </Link>
    </div>
  )
}
