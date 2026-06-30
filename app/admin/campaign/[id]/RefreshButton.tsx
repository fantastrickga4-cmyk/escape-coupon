"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 발송/열람 현황을 최신으로 다시 불러오는 버튼
export default function RefreshButton() {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  function refresh() {
    setSpinning(true);
    router.refresh();
    setTimeout(() => setSpinning(false), 800);
  }

  return (
    <button onClick={refresh} className="nb-btn nb-btn-sm nb-btn-secondary">
      {spinning ? "새로고침 중…" : "🔄 현황 새로고침"}
    </button>
  );
}
