import { useRef } from "react"

// ponytail: 실제 약관 문구/문의 이메일 확정 전 자리표시자. 확정되면 텍스트만 교체.
const TERMS_TEXT = "이용약관 내용은 준비 중입니다."
const PRIVACY_TEXT = "개인정보처리방침 내용은 준비 중입니다."
const CONTACT_EMAIL = "support@example.com"

export function Footer() {
  const termsRef = useRef<HTMLDialogElement>(null)
  const privacyRef = useRef<HTMLDialogElement>(null)

  return (
    <footer className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
      <span>&copy; {new Date().getFullYear()} 모면완</span>
      <button
        type="button"
        className="underline"
        onClick={() => termsRef.current?.showModal()}
      >
        이용약관
      </button>
      <button
        type="button"
        className="underline"
        onClick={() => privacyRef.current?.showModal()}
      >
        개인정보처리방침
      </button>
      <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
        문의: {CONTACT_EMAIL}
      </a>

      <dialog
        ref={termsRef}
        className="rounded-lg border border-border p-4 backdrop:bg-black/50"
      >
        <p className="text-sm text-foreground">{TERMS_TEXT}</p>
        <button
          type="button"
          className="mt-3 underline"
          onClick={() => termsRef.current?.close()}
        >
          닫기
        </button>
      </dialog>

      <dialog
        ref={privacyRef}
        className="rounded-lg border border-border p-4 backdrop:bg-black/50"
      >
        <p className="text-sm text-foreground">{PRIVACY_TEXT}</p>
        <button
          type="button"
          className="mt-3 underline"
          onClick={() => privacyRef.current?.close()}
        >
          닫기
        </button>
      </dialog>
    </footer>
  )
}
