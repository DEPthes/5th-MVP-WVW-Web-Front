import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { deleteSession, listSessions } from "@/lib/api"
import type { PracticeSessionSummary } from "@/types"

function formatDate(iso: string) {
  const date = new Date(iso)
  const days = ["일", "월", "화", "수", "목", "금", "토"]
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`
}

function groupByDate(sessions: PracticeSessionSummary[]) {
  const groups = new Map<string, PracticeSessionSummary[]>()
  for (const session of sessions) {
    const key = formatDate(session.createdAt)
    const group = groups.get(key)
    if (group) {
      group.push(session)
    } else {
      groups.set(key, [session])
    }
  }
  return groups
}

export function HomePage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<PracticeSessionSummary[]>([])
  const [filter, setFilter] = useState<"all" | "completed">("all")
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

  const completedCount = sessions.filter((s) => s.status === "COMPLETED").length
  const visibleSessions =
    filter === "completed"
      ? sessions.filter((s) => s.status === "COMPLETED")
      : sessions
  const groups = groupByDate(visibleSessions)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading font-bold text-foreground">면접 목록</h1>
        <p className="mt-1 text-sm text-contents-tertiary">
          전체 면접 / 총 {sessions.length}건
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-contents-tertiary">
            아직 진행한 모의면접이 없습니다. 첫 모의면접을 시작해보세요.
          </p>
          <Link to="/interviews/new" className="text-primary underline underline-offset-4">
            모의면접 시작하기
          </Link>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "h-9 rounded-full border px-5 text-sm",
                filter === "all"
                  ? "border-primary bg-primary/6 font-semibold text-primary"
                  : "border-input text-contents-secondary"
              )}
            >
              전체 {sessions.length}건
            </button>
            <button
              type="button"
              onClick={() => setFilter("completed")}
              className={cn(
                "h-9 rounded-full border px-5 text-sm",
                filter === "completed"
                  ? "border-primary bg-primary/6 font-semibold text-primary"
                  : "border-input text-contents-secondary"
              )}
            >
              완료 {completedCount}건
            </button>
          </div>

          <div className="flex flex-col gap-10">
            {[...groups.entries()].map(([date, group]) => (
              <div key={date} className="flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-label font-semibold text-contents-secondary">
                    {date}
                  </span>
                  <span className="flex h-[22px] items-center rounded-full bg-primary px-2.5 text-xs font-semibold text-primary-foreground">
                    {group.length}건
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <ul className="flex flex-col gap-4">
                  {group.map((session) => (
                    <li
                      key={session.id}
                      className="flex items-center gap-5 rounded-[20px] border border-border bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06),0_16px_40px_rgba(53,99,233,0.05)]"
                    >
                      <div className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px] border border-primary/15 bg-primary/6">
                        <Building2 size={22} className="text-primary" />
                      </div>

                      <div className="flex flex-1 flex-col gap-2">
                        <span className="text-label font-semibold text-foreground">
                          {session.companyName} · {session.jobRole} ·{" "}
                          {session.careerYears} 채용 면접
                        </span>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-6 items-center rounded-full px-2.5 text-xs font-semibold",
                              session.status === "COMPLETED"
                                ? "bg-positive/12 text-positive"
                                : "bg-destructive/12 text-destructive"
                            )}
                          >
                            {session.status === "COMPLETED" ? "완료" : "오류"}
                          </span>
                          <span className="text-xs font-light text-contents-tertiary">
                            종합 면접 · 10분
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/sessions/${session.id}`)}
                        >
                          피드백
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(session.id)}
                        >
                          삭제
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

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
