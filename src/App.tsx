import { lazy, Suspense } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import { LoadingState } from '@/components/LoadingState'
import { logoutAndClearToken } from '@/lib/api'

const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const SignupPage = lazy(() =>
  import('@/pages/SignupPage').then((m) => ({ default: m.SignupPage }))
)
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const InterviewSetupPage = lazy(() =>
  import('@/pages/InterviewSetupPage').then((m) => ({ default: m.InterviewSetupPage }))
)
const QuestionListPage = lazy(() =>
  import('@/pages/QuestionListPage').then((m) => ({ default: m.QuestionListPage }))
)
const InterviewStartPage = lazy(() =>
  import('@/pages/InterviewStartPage').then((m) => ({ default: m.InterviewStartPage }))
)
const RecordPage = lazy(() => import('@/pages/RecordPage').then((m) => ({ default: m.RecordPage })))
const SessionDetailPage = lazy(() =>
  import('@/pages/SessionDetailPage').then((m) => ({ default: m.SessionDetailPage }))
)
const QuestionReviewPage = lazy(() =>
  import('@/pages/QuestionReviewPage').then((m) => ({ default: m.QuestionReviewPage }))
)
const InterviewEvaluationPage = lazy(() =>
  import('@/pages/InterviewEvaluationPage').then((m) => ({ default: m.InterviewEvaluationPage }))
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
)

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingState message="불러오는 중..." />
    </div>
  )
}

function App() {
  const navigate = useNavigate()

  const handleLogout = () => {
    logoutAndClearToken().finally(() => navigate('/login'))
  }

  return (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout onLogout={handleLogout}>
              <HomePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/interviews/new"
        element={
          <ProtectedRoute>
            <AppLayout onLogout={handleLogout}>
              <InterviewSetupPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/questions/new"
        element={
          <ProtectedRoute>
            <QuestionListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/record/:questionId/start"
        element={
          <ProtectedRoute>
            <InterviewStartPage />
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
        path="/sessions/:sessionId"
        element={
          <ProtectedRoute>
            <AppLayout onLogout={handleLogout}>
              <SessionDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/:sessionId/evaluation"
        element={
          <ProtectedRoute>
            <AppLayout onLogout={handleLogout}>
              <InterviewEvaluationPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/:sessionId/review"
        element={
          <ProtectedRoute>
            <QuestionReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout onLogout={handleLogout}>
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  )
}

export default App
