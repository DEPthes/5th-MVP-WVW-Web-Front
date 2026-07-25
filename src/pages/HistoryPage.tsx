import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { AnswerRecord, PracticeSession } from "@/types"

// ponytail: listSessions() API 대기 중이라 실제 데이터 대신 목업으로 그래프 골격만 구현. API 연동 시 이 목업만 교체.
const MOCK_SESSIONS: PracticeSession[] = [
  {
    id: "session-1",
    materialId: "material-1",
    createdAt: "2026-07-20T10:00:00Z",
    answers: [
      mockAnswer("answer-1", "q-1", 0.62, 0.31, 0.55),
      mockAnswer("answer-2", "q-2", 0.7, 0.25, 0.6),
    ],
  },
  {
    id: "session-2",
    materialId: "material-1",
    createdAt: "2026-07-23T10:00:00Z",
    answers: [
      mockAnswer("answer-3", "q-3", 0.75, 0.2, 0.62),
      mockAnswer("answer-4", "q-4", 0.8, 0.15, 0.65),
    ],
  },
]

function mockAnswer(
  id: string,
  questionId: string,
  likabilityScore: number,
  tensionScore: number,
  neutralScore: number
): AnswerRecord {
  return {
    id,
    questionId,
    videoUrl: "",
    transcriptText: null,
    feedbackText: null,
    durationSeconds: 60,
    status: "DONE",
    facialMetrics: {
      eyeContactRatio: 0.8,
      blinkRate: 15,
      likabilityScore,
      tensionScore,
      neutralScore,
    },
    voiceMetrics: {
      fillerWordCount: 3,
      quietRatio: 0.1,
      trembleRatio: 0.1,
    },
  }
}

function toChartData(sessions: PracticeSession[]) {
  return sessions.flatMap((session) =>
    session.answers.map((answer, index) => ({
      label: `${session.createdAt.slice(0, 10)} #${index + 1}`,
      likability: Math.round(answer.facialMetrics.likabilityScore * 100),
      tension: Math.round(answer.facialMetrics.tensionScore * 100),
    }))
  )
}

export function HistoryPage() {
  const chartData = toChartData(MOCK_SESSIONS)

  return (
    <div className="flex flex-col gap-4">
      <h1>히스토리</h1>
      <p className="text-sm text-muted-foreground">
        (목업 데이터 — 세션 목록 API 연동 전 그래프 골격)
      </p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis unit="%" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="likability" name="호감도" stroke="#2563eb" />
            <Line type="monotone" dataKey="tension" name="긴장도" stroke="#dc2626" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
