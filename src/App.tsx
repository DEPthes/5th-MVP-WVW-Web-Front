import { Link, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { MaterialInputPage } from '@/pages/MaterialInputPage'
import { QuestionListPage } from '@/pages/QuestionListPage'
import { RecordPage } from '@/pages/RecordPage'
import { ResultPage } from '@/pages/ResultPage'
import { HistoryPage } from '@/pages/HistoryPage'

const NAV_LINKS = [
  { to: '/login', label: '로그인' },
  { to: '/signup', label: '회원가입' },
  { to: '/materials/new', label: '자료입력' },
  { to: '/questions', label: '질문리스트' },
  { to: '/record/demo-question-id', label: '녹화' },
  { to: '/result/demo-answer-id', label: '결과' },
  { to: '/history', label: '히스토리' },
]

function App() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <nav className="mb-6 flex flex-wrap gap-4 text-sm underline">
        {NAV_LINKS.map((link) => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </nav>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/materials/new" element={<MaterialInputPage />} />
        <Route path="/questions" element={<QuestionListPage />} />
        <Route path="/record/:questionId" element={<RecordPage />} />
        <Route path="/result/:answerId" element={<ResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </div>
  )
}

export default App
