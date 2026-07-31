import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
import { generateQuestions } from "@/lib/api"
import type { QuestionSet } from "@/types"

export function QuestionListPage() {
  const { interviewId } = useParams<{ interviewId: string }>()
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!interviewId) return
    generateQuestions(interviewId)
      .then(setQuestionSet)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "질문 생성에 실패했습니다.")
      )
  }, [interviewId])

  return (
    <div className="flex flex-col gap-4">
      <h1>질문 리스트</h1>

      {error && <ErrorState message={error} />}

      {!error && !questionSet && (
        <LoadingState message="질문을 생성하는 중입니다..." />
      )}

      {questionSet && (
        <ul className="flex flex-col gap-3">
          {questionSet.questions.map((question, index) => (
            <li key={question.id} className="flex items-center justify-between gap-4">
              <span>{question.text}</span>
              <Link
                to={`/record/${question.id}/start`}
                state={{
                  questions: questionSet.questions,
                  currentIndex: index,
                  interviewId,
                }}
                className="shrink-0 underline"
              >
                답변 시작
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
