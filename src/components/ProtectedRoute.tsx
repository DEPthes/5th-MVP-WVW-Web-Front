import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { getToken } from "@/lib/api"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (!getToken()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
