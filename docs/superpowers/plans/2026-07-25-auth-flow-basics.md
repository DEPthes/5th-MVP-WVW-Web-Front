# 인증 흐름 3종 (보호 라우트 / 로그아웃 / 401 처리) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 토큰 유무·HTTP 상태 코드만으로 판단 가능한 인증 관련 3개 조각(보호 라우트, 로그아웃, 401 공통 처리)을 구현한다.

**Architecture:** `apiFetch`에 401 가로채기 추가, 새 `ProtectedRoute` 컴포넌트로 5개 라우트를 감싸고, `App.tsx` 네비게이션에 로그인 상태에 따른 로그아웃/로그인 링크 토글을 추가한다.

**Tech Stack:** React Router(`Navigate`, `useLocation`, `useNavigate`), 기존 `src/lib/api.ts`의 `getToken`/`setToken`/`clearToken`. 새 의존성 없음.

## Global Constraints

- 새 npm 의존성 추가 금지.
- `LoginPage`/`SignupPage` 실제 폼(`login()`/`signup()` 호출)은 이 플랜 범위 밖.
- 각 태스크 종료 시 `npx tsc -b`와 `npm test`가 모두 통과해야 한다.
- 페이지/라우팅 컴포넌트(`App.tsx`, `ProtectedRoute`)는 기존 컨벤션대로 자동 테스트 대상 밖(vitest 환경이 node).

---

### Task 1: apiFetch 401 처리

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/lib/api.test.ts`

**Interfaces:**
- Produces: `apiFetch`가 401 응답 시 `clearToken()` 호출 + `window.location.href = "/login"` + `Error("인증이 만료되었습니다. 다시 로그인해주세요.")` throw.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/api.test.ts` 상단 import를 다음으로 교체:

```ts
import { clearToken, getAnswer, getToken, setToken, uploadAnswer } from "@/lib/api"
```

`globalThis.localStorage` 스텁 블록 아래에 `window` 스텁 추가:

```ts
;(globalThis as unknown as { window: { location: { href: string } } }).window = {
  location: { href: "" },
}
```

`describe("apiFetch", ...)` 블록 안, 기존 테스트들 사이에 추가:

```ts
  it("clears the token and redirects to /login on a 401 response", async () => {
    setToken("abc123")
    globalThis.fetch = vi.fn(
      async () => new Response("unauthorized", { status: 401 })
    ) as typeof fetch

    await expect(getAnswer("1")).rejects.toThrow("인증이 만료되었습니다")

    expect(getToken()).toBeNull()
    expect(
      (globalThis as unknown as { window: { location: { href: string } } })
        .window.location.href
    ).toBe("/login")
  })
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/api.test.ts`
Expected: FAIL — 401이 `!res.ok` 분기로 빠져 `"API error 401: unauthorized"` 메시지가 나오고, 토큰/리다이렉트 검증도 실패.

- [ ] **Step 3: 최소 구현**

`src/lib/api.ts`의 `apiFetch` 함수에서 `if (!res.ok)` 체크 바로 앞에 추가:

```ts
  if (res.status === 401) {
    clearToken()
    window.location.href = "/login"
    throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.")
  }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/api.test.ts`
Expected: PASS (기존 테스트 포함 전부)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api.ts src/lib/api.test.ts
git commit -m "feat: apiFetch에 401 응답 시 토큰 삭제 및 로그인 페이지 리다이렉트 추가"
```

---

### Task 2: ProtectedRoute 컴포넌트

**Files:**
- Create: `src/components/ProtectedRoute.tsx`

**Interfaces:**
- Produces: `ProtectedRoute({ children }: { children: ReactNode })` — 토큰 없으면 `/login`으로 리다이렉트(`state: { from: location }` 포함), 있으면 `children`을 그대로 렌더.

- [ ] **Step 1: 컴포넌트 작성**

`src/components/ProtectedRoute.tsx`:

```tsx
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

- [ ] **Step 2: 타입 체크 통과 확인**

Run: `npx tsc -b`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add src/components/ProtectedRoute.tsx
git commit -m "feat: ProtectedRoute 컴포넌트 추가"
```

---

### Task 3: App.tsx 라우트 보호 및 로그아웃 버튼

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 2의 `ProtectedRoute`, 기존 `getToken`/`clearToken` (`src/lib/api.ts`).

- [ ] **Step 1: App.tsx 전체 교체**

`src/App.tsx`를 다음으로 교체:

```tsx
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { MaterialInputPage } from '@/pages/MaterialInputPage'
import { QuestionListPage } from '@/pages/QuestionListPage'
import { RecordPage } from '@/pages/RecordPage'
import { ResultPage } from '@/pages/ResultPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { clearToken, getToken } from '@/lib/api'

const NAV_LINKS = [
  { to: '/materials/new', label: '자료입력' },
  { to: '/questions', label: '질문리스트' },
  { to: '/record/demo-question-id', label: '녹화' },
  { to: '/result/demo-answer-id', label: '결과' },
  { to: '/history', label: '히스토리' },
]

function App() {
  const navigate = useNavigate()
  const isAuthenticated = Boolean(getToken())

  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <nav className="mb-6 flex flex-wrap gap-4 text-sm underline">
        {isAuthenticated ? (
          <button onClick={handleLogout} className="underline">
            로그아웃
          </button>
        ) : (
          <>
            <Link to="/login">로그인</Link>
            <Link to="/signup">회원가입</Link>
          </>
        )}
        {NAV_LINKS.map((link) => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </nav>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/materials/new"
          element={
            <ProtectedRoute>
              <MaterialInputPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/questions"
          element={
            <ProtectedRoute>
              <QuestionListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/record/:questionId"
          element={
            <ProtectedRoute>
              <RecordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/result/:answerId"
          element={
            <ProtectedRoute>
              <ResultPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}

export default App
```

- [ ] **Step 2: 타입 체크 및 전체 테스트 통과 확인**

Run: `npx tsc -b && npm test`
Expected: 둘 다 PASS

- [ ] **Step 3: 브라우저에서 수동 확인**

`npm run dev` 실행 후:
- `getToken()`이 `null`인 상태에서 `/materials/new` 등 보호된 경로로 직접 접근 시 `/login`으로 리다이렉트되는지 확인.
- 브라우저 콘솔에서 `localStorage.setItem("moamyeonwan_token", "test")` 실행 후 페이지 이동 시 "로그아웃" 버튼이 보이는지, 클릭 시 토큰이 지워지고 `/login`으로 이동하는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/App.tsx
git commit -m "feat: 보호 라우트 적용 및 네비게이션에 로그아웃 버튼 추가"
```
