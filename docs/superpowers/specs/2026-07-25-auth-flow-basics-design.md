# 인증 흐름 3종 (보호 라우트 / 로그아웃 / 401 처리) — 설계

## 배경
로그인/회원가입 폼(`login()`/`signup()` 실제 호출)은 백엔드 명세가 아직 확정되지 않아 필드가 바뀔 수 있어
이번 범위에서 제외한다. 대신 토큰 유무·HTTP 상태 코드만으로 판단 가능해 명세와 무관하게 지금 만들 수
있는 3개 조각만 구현한다: 보호 라우트, 로그아웃, 401 공통 처리.

## 1. ProtectedRoute
```tsx
// src/components/ProtectedRoute.tsx
import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { getToken } from "@/lib/api"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (!getToken()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
```
- 토큰이 없으면 `/login`으로 리다이렉트하며 `state: { from: location }`으로 원래 가려던 경로를 남긴다.
- 이 `state.from`을 실제로 읽어 로그인 성공 후 복귀시키는 로직은 `LoginPage` 폼 구현 시점(별도 항목)의 몫 —
  이번 스펙은 상태를 "남겨두는" 쪽까지만 다룬다.

## 2. App.tsx 변경
- `<Routes>`에서 `/login`, `/signup`을 제외한 5개 라우트(`/materials/new`, `/questions`,
  `/record/:questionId`, `/result/:answerId`, `/history`)를 `<ProtectedRoute>`로 감싼다.
- 네비게이션: `getToken()`이 있으면 "로그아웃" 버튼(클릭 시 `clearToken()` 호출 후 `/login`으로
  `useNavigate()` 이동), 없으면 기존 "로그인"/"회원가입" `<Link>` 그대로.
- 나머지 데모 링크(자료입력/질문리스트/녹화/결과/히스토리)는 그대로 유지 — 로그인 안 된 상태에서
  클릭하면 `ProtectedRoute`가 알아서 `/login`으로 보낸다.

## 3. apiFetch 401 처리
`src/lib/api.ts`의 `apiFetch` 내부, 기존 `if (!res.ok)` 체크 앞에 추가:
```ts
if (res.status === 401) {
  clearToken()
  window.location.href = "/login"
  throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.")
}
```
`window.location.href`로 전체 페이지 이동을 택한 이유: `apiFetch`는 React 컴포넌트/훅이 아니라
`useNavigate`를 직접 쓸 수 없고, 401은 드물게 발생하는 예외 상황이라 SPA 매끄러움보다 구현 단순성을
우선한다.

## 에러 처리
- 401 이후의 `throw`는 호출부(`await getAnswer(...)` 등)의 기존 `.catch`/에러 상태 처리 경로를 그대로
  타지만, 이미 페이지 이동이 시작된 뒤라 실질적으로 화면에 노출되지는 않는다(전체 새로고침이 곧 발생).

## 테스트
- `src/lib/api.test.ts`: 기존 `globalThis.localStorage` 모킹과 동일한 패턴으로 `globalThis.window`를
  최소 스텁(`{ location: { href: "" } }`)으로 주입해, 401 응답 시 토큰이 지워지고
  `window.location.href`가 `"/login"`으로 바뀌는지 검증한다.
- `ProtectedRoute`/`App.tsx`는 페이지 컴포넌트라 기존 컨벤션대로(vitest 환경이 node) 자동 테스트
  대상 밖 — 브라우저에서 수동으로 라우팅 동작을 확인한다.

## 스코프 밖
- `LoginPage`/`SignupPage` 실제 폼, `login()`/`signup()` 호출, `location.state.from` 소비.
- 로그인 상태를 앱 전역에서 실시간으로 반영하는 인증 컨텍스트(현재는 라우트 이동 시점에만
  `getToken()`을 다시 읽는 수준 — 같은 페이지에 머무르는 동안 토큰이 사라지는 극단적 케이스는
  다루지 않음).
