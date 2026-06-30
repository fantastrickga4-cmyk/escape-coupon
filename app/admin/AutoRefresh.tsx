"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// 일정 간격으로 서버 컴포넌트를 갱신해 실시간 현황을 보여준다.
// 단, 사용자가 폼에 입력 중이거나(특히 한글 IME 조합 중) 탭이 숨겨져 있으면
// 새로고침을 건너뛴다 — 입력 중 router.refresh()가 끼어들면 조합 중인
// 글자가 날아가 "입력이 안 들어간다"처럼 보이기 때문.
export default function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  const composing = useRef(false);

  useEffect(() => {
    const onStart = () => (composing.current = true);
    const onEnd = () => (composing.current = false);
    document.addEventListener("compositionstart", onStart);
    document.addEventListener("compositionend", onEnd);

    const isTyping = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (el as HTMLElement).isContentEditable
      );
    };

    const t = setInterval(() => {
      if (composing.current || isTyping() || document.hidden) return;
      router.refresh();
    }, seconds * 1000);

    return () => {
      clearInterval(t);
      document.removeEventListener("compositionstart", onStart);
      document.removeEventListener("compositionend", onEnd);
    };
  }, [router, seconds]);

  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#111]">
      <span className="w-2.5 h-2.5 rounded-full bg-[#4ad7d4] border-2 border-black animate-pulse" />
      실시간
    </span>
  );
}
