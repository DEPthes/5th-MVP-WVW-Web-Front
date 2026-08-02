import { Button } from "@/components/ui/button"

export function ErrorState({
  message,
  retry,
}: {
  message: string
  retry?: () => void
}) {
  return (
    <div role="alert" className="flex items-center gap-2">
      <p className="text-sm text-destructive">{message}</p>
      {retry && (
        <Button variant="outline" onClick={retry}>
          다시 시도
        </Button>
      )}
    </div>
  )
}
