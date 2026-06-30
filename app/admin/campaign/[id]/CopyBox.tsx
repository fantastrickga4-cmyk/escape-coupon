"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";

export default function CopyBox({ links }: { links: string[] }) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const text = links.join("\n");

  async function copy() {
    const ok = await copyText(text);
    setCopied(ok ? "ok" : "fail");
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-[#111]">배포용 링크 ({links.length}개)</h2>
        <button
          onClick={copy}
          className="nb-btn nb-btn-sm nb-btn-dark"
        >
          {copied === "ok" ? "복사됨!" : copied === "fail" ? "복사 실패" : "전체 복사"}
        </button>
      </div>
      <textarea
        readOnly
        value={text}
        className="nb-input h-40 text-xs font-mono text-slate-700"
      />
    </div>
  );
}
