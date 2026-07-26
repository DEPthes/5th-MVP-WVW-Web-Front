import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { deleteSession, listSessions } from "@/lib/api"
import type { PracticeSessionSummary } from "@/types"

function formatDate(iso: string) {
  const date = new Date(iso)
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

export function HomePage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<PracticeSessionSummary[]>([])
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    // ponytail: listSessions() API 대기 중 — 실패해도 빈 목록으로 진행
    listSessions()
      .then(setSessions)
      .catch(() => {})
  }, [])

  function openDeleteDialog(id: string) {
    setDeleteTargetId(id)
    dialogRef.current?.showModal()
  }

  function confirmDelete() {
    if (!deleteTargetId) return
    deleteSession(deleteTargetId)
      .then(() => {
        setSessions((prev) => prev.filter((s) => s.id !== deleteTargetId))
        dialogRef.current?.close()
      })
      .catch(() => {
        // 삭제 실패 시 모달을 유지해 재시도할 수 있게 둔다
      })
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1>면접 목록</h1>
        <p className="text-sm text-muted-foreground">
          아직 진행한 모의면접이 없습니다. 첫 모의면접을 시작해보세요.
        </p>
        <Link to="/interviews/new" className="underline">
          모의면접 시작하기
        </Link>
      </div>
    )
  }

  const completedCount = sessions.filter((s) => s.status === "COMPLETED").length

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1>면접 목록</h1>
        <p className="text-sm text-muted-foreground">전체 면접 / 총 {sessions.length}건</p>
      </div>

      <div className="flex gap-2 text-sm">
        <span className="rounded-full border border-border px-3 py-1">
          전체 {sessions.length}건
        </span>
        <span className="rounded-full border border-border px-3 py-1">
          완료 {completedCount}건
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {session.companyName}, {session.jobRole}, {session.careerYears} 채용 면접
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(session.createdAt)} ·{" "}
                {session.status === "COMPLETED" ? "완료" : "오류"}
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" onClick={() => navigate(`/sessions/${session.id}`)}>
                피드백
              </Button>
              <Button variant="outline" onClick={() => openDeleteDialog(session.id)}>
                삭제
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="rounded-lg border border-border p-4 backdrop:bg-black/50"
      >
        <p className="text-sm">정말 삭제하시겠습니까?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          삭제된 면접 기록은 복구할 수 없습니다.
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" onClick={() => dialogRef.current?.close()}>
            취소
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            삭제
          </Button>
        </div>
      </dialog>
    </div>
  )
}
