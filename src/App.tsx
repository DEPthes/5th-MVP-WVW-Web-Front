import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { HomePage } from '@/pages/HomePage'
import { InterviewSetupPage } from '@/pages/InterviewSetupPage'
import { QuestionListPage } from '@/pages/QuestionListPage'
import { InterviewStartPage } from '@/pages/InterviewStartPage'
import { RecordPage } from '@/pages/RecordPage'
import { ResultPage } from '@/pages/ResultPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Footer } from '@/components/Footer'
import { clearToken, getToken } from '@/lib/api'

const NAV_LINKS = [
  { to: '/', label: '홈' },
  { to: '/interviews/new', label: '면접설정' },
  { to: '/questions/demo-interview-id', label: '질문리스트' },
  { to: '/record/demo-question-id/start', label: '녹화' },
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
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interviews/new"
          element={
            <ProtectedRoute>
              <InterviewSetupPage />
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
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Footer />
    </div>
  )
}

export default App
