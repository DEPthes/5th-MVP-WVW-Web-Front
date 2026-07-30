import { Link, useLocation } from "react-router-dom"
import { Home, Mic, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { to: "/", label: "홈", icon: Home, match: (path: string) => path === "/" },
  {
    to: "/interviews/new",
    label: "AI 모의 면접",
    icon: Mic,
    match: (path: string) =>
      path.startsWith("/interviews") ||
      path.startsWith("/questions") ||
      path.startsWith("/record") ||
      path.startsWith("/result") ||
      path.startsWith("/sessions"),
  },
] as const

export function Sidebar() {
  const location = useLocation()
  const isSettingsActive = location.pathname === "/settings"

  return (
    <aside className="flex h-full w-[226px] shrink-0 flex-col border-r border-border bg-muted/40">
      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, match }) => {
          const active = match(location.pathname)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex h-[42px] items-center gap-2.5 rounded-[10px] px-4 text-sm",
                active
                  ? "border border-border bg-background text-foreground shadow-sm"
                  : "border border-transparent text-contents-secondary"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />

      <div className="border-t border-border p-3 pb-5">
        <Link
          to="/settings"
          className={cn(
            "flex h-[42px] items-center gap-2.5 rounded-[10px] px-4 text-sm",
            isSettingsActive
              ? "border border-border bg-background text-foreground shadow-sm"
              : "border border-transparent text-contents-secondary"
          )}
        >
          <Settings size={16} />
          설정
        </Link>
        <div className="flex flex-col gap-0.5 px-3.5 pt-3 text-xs font-light text-contents-tertiary">
          <span>AI 음성 모의면접 서비스, 떠떠블</span>
          <span>이용약관 | 개인정보처리방침</span>
          <span>v1.0.0 (현재 서비스 버전)</span>
        </div>
      </div>
    </aside>
  )
}
