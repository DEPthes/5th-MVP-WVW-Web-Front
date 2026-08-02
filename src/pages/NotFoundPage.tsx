import { Link } from "react-router-dom"
import { Home } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col items-center gap-1 text-foreground">
        <p className="text-[80px] font-bold">404</p>
        <p className="text-heading font-semibold">Not Found</p>
      </div>
      <div className="flex flex-col items-center gap-8">
        <p className="text-base text-contents-tertiary">
          요청하신 페이지를 찾을 수 없어요.
          <br />
          주소를 다시 확인하거나 아래 버튼을 눌러 홈으로 돌아가세요.
        </p>
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: "default" }),
            "h-auto gap-2 px-8 py-4 text-[15px] shadow-[0_4px_8px_rgba(53,99,233,0.25)]"
          )}
        >
          <Home size={20} />
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
