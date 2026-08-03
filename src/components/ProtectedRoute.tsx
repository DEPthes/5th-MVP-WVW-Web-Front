import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { getAccessToken } from "@/lib/api"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (!getAccessToken()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
