import { Route, Routes, useNavigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { HomePage } from '@/pages/HomePage'
import { InterviewSetupPage } from '@/pages/InterviewSetupPage'
import { QuestionListPage } from '@/pages/QuestionListPage'
import { InterviewStartPage } from '@/pages/InterviewStartPage'
import { RecordPage } from '@/pages/RecordPage'
import { ResultPage } from '@/pages/ResultPage'
import { SessionDetailPage } from '@/pages/SessionDetailPage'
import { QuestionReviewPage } from '@/pages/QuestionReviewPage'
import { InterviewEvaluationPage } from '@/pages/InterviewEvaluationPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import { clearToken } from '@/lib/api'

function App() {
  const navigate = useNavigate()

  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }

  return (
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
        path="/questions/:interviewId"
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
        path="/result/:answerId"
        element={
          <ProtectedRoute>
            <ResultPage />
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
    </Routes>
  )
}

export default App
