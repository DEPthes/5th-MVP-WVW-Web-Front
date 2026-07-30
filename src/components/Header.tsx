import type { ReactNode } from "react"
import logo from "@/assets/logo.png"
import { Button } from "@/components/ui/button"

export function Header({
  onLogout,
  title,
  subtitle,
  right,
}: {
  onLogout?: () => void
  title?: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <img src={logo} alt="모면완" className="h-10 w-auto" />
      {title && (
        <span className="absolute left-1/2 -translate-x-1/2 text-label font-semibold text-foreground">
          {title}
        </span>
      )}
      {subtitle && (
        <span className="absolute left-1/2 -translate-x-1/2 text-sm text-contents-tertiary">
          {subtitle}
        </span>
      )}
      {right}
      {!right && onLogout && (
        <Button variant="outline" size="sm" onClick={onLogout}>
          로그아웃
        </Button>
      )}
    </header>
  )
}
