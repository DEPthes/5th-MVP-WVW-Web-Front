import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// ponytail: 커스텀 text-heading/label/body/caption 폰트 크기 토큰을 twMerge가
// 인식하지 못해 text-primary-foreground 같은 색상 클래스와 같은 그룹으로 취급,
// 뒤에 오는 쪽이 이기면서 색상 클래스가 조용히 삭제되는 버그가 있었음 — 스케일 등록으로 해결.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["heading", "label", "body", "caption"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
