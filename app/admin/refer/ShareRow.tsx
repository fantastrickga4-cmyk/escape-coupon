"use client";

import { useEffect, useState } from "react";
import { copyText } from "@/lib/clipboard";

// 추천인에게 링크/쿠폰을 문자/복사로 전달하는 공용 행
export default function ShareRow({
  phone,
  label,
  message,
  sub,
}: {
  phone: string;
  label: string;
  message: string;
  sub: string;
}) {
  const [isIOS, setIsIOS] = useState(false);
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent));
  }, []);

  const sms = `sms:${phone}${isIOS ? "&" : "?"}body=${encodeURIComponent(message)}`;

  async function copy() {
    const ok = await copyText(message);
    setCopied(ok ? "ok" : "fail");
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="nb-card-sm flex items-center gap-2 p-3">
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-black">{label}</div>
        <div className="text-xs text-slate-500 truncate">{sub}</div>
      </div>
      <button onClick={copy} className="nb-btn nb-btn-sm nb-btn-yellow shrink-0">
        {copied === "ok" ? "복사됨" : copied === "fail" ? "복사 실패" : "복사"}
      </button>
      <a href={sms} className="nb-btn nb-btn-sm nb-btn-secondary shrink-0">
        문자
      </a>
    </div>
  );
}
