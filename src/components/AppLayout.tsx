import type { ReactNode } from "react"
import { Header } from "@/components/Header"
import { Sidebar } from "@/components/Sidebar"
import { Footer } from "@/components/Footer"

export function AppLayout({
  children,
  onLogout,
}: {
  children: ReactNode
  onLogout: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header onLogout={onLogout} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          {children}
          <Footer />
        </main>
      </div>
    </div>
  )
}
