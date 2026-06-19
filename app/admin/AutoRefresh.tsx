"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 일정 간격으로 서버 컴포넌트를 갱신해 실시간 현황을 보여준다
export default function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#111]">
      <span className="w-2.5 h-2.5 rounded-full bg-[#4ad7d4] border-2 border-black animate-pulse" />
      실시간
    </span>
  );
}
