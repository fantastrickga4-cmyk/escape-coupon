"use client";

import { useActionState, useEffect, useState } from "react";
import { copyText } from "@/lib/clipboard";
import { prepareBatch, type SendResult, type SendRow } from "./actions";

type Campaign = { id: string; name: string; benefit: string };

export default function BatchSender({ campaigns, themes }: { campaigns: Campaign[]; themes: string[] }) {
  const [state, action, pending] = useActionState<SendResult, FormData>(prepareBatch, {});
  const [isIOS, setIsIOS] = useState(false);
  const [idx, setIdx] = useState(0); // 일괄발송 진행 위치(다음 보낼 사람)
  const rows = state?.rows ?? [];

  useEffect(() => {
    setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent));
  }, []);

  // 새 발송 목록이 만들어지면 진행 위치 초기화
  useEffect(() => {
    setIdx(0);
  }, [state]);

  // 플랫폼별 SMS 딥링크 (iOS는 &body=, Android는 ?body=)
  function smsHref(phone: string, message: string) {
    const sep = isIOS ? "&" : "?";
    return `sms:${phone}${sep}body=${encodeURIComponent(message)}`;
  }

  return (
    <div className="space-y-5">
      <form action={action} className="nb-card p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">캠페인</label>
          <select
            name="campaignId"
            className="nb-input"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.benefit}
              </option>
            ))}
          </select>
        </div>

        {themes.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">
              이미 플레이한 테마 (선택) — "다른 테마 유도" 쿠폰
            </label>
            <select name="excludeTheme" defaultValue="" className="nb-input">
              <option value="">제한 없음 (모든 테마 사용 가능)</option>
              {themes.map((t) => (
                <option key={t} value={t}>
                  {t} 제외 (이 테마는 사용 불가)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">인사말 (선택)</label>
          <textarea
            name="greeting"
            rows={10}
            defaultValue="안녕하세요, 고객님!"
            className="nb-input resize-y"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">받는 번호 (줄바꿈/쉼표로 여러 개)</label>
          <textarea
            name="phones"
            placeholder={"010-1234-5678\n010-2222-3333\n01055556666"}
            className="nb-input h-32 text-sm font-mono"
          />
        </div>

        {state?.error && <p className="text-sm font-bold text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="nb-btn nb-btn-primary w-full"
        >
          {pending ? "준비 중…" : "발송 목록 만들기"}
        </button>
      </form>

      {rows.length > 0 && (
        <section className="nb-card p-6 space-y-3">
          <h2 className="font-extrabold text-black">
            발송 목록 (<span className="font-extrabold">{rows.length}</span>명)
          </h2>

          {/* 일괄발송 — 누를 때마다 다음 사람 문자앱이 자동으로 열림 */}
          {idx < rows.length ? (
            <a
              href={smsHref(rows[idx].phone, rows[idx].message)}
              onClick={() => setIdx((i) => i + 1)}
              className="nb-btn nb-btn-primary w-full"
            >
              📨 일괄발송 — {idx + 1}/{rows.length} · {formatPhone(rows[idx].phone)}에게 보내기
            </a>
          ) : (
            <div className="w-full text-center border-2 border-black rounded-xl bg-[#4ad7d4] py-3 font-extrabold text-black">
              ✅ {rows.length}명 전체 발송 완료
            </div>
          )}
          <p className="text-xs text-slate-600">
            버튼을 누르면 문자앱이 채워진 채 열립니다. 전송 후 돌아와 같은 버튼을 다시 누르면 다음 사람으로 넘어가요.
            {idx > 0 && (
              <button type="button" onClick={() => setIdx(0)} className="ml-1 underline font-bold">
                처음부터
              </button>
            )}
          </p>

          <div className="space-y-2 pt-1">
            {rows.map((r, i) => (
              <Row
                key={r.token}
                row={r}
                href={smsHref(r.phone, r.message)}
                done={i < idx}
                current={i === idx}
              />
            ))}
          </div>
          <p className="text-xs text-slate-600 pt-2">
            ※ 개별로 보내려면 각 줄의 [문자 보내기]를 누르세요. PC에서는 [복사]로 내용을 복사해 사용하세요.
          </p>
        </section>
      )}
    </div>
  );
}

function Row({ row, href, done, current }: { row: SendRow; href: string; done?: boolean; current?: boolean }) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  async function copy() {
    const ok = await copyText(row.message);
    setCopied(ok ? "ok" : "fail");
    setTimeout(() => setCopied(null), 1500);
  }
  return (
    <div
      className={`nb-card-sm flex items-center gap-2 p-3 ${done ? "opacity-50" : ""} ${
        current ? "border-[#ff5d8f]" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-black">
          {done ? "✓ " : ""}
          {formatPhone(row.phone)}
        </div>
        <div className="text-xs text-slate-500 truncate">{row.link}</div>
      </div>
      <button
        onClick={copy}
        className="nb-btn nb-btn-sm nb-btn-yellow shrink-0"
      >
        {copied === "ok" ? "복사됨" : copied === "fail" ? "복사 실패" : "복사"}
      </button>
      <a
        href={href}
        className="nb-btn nb-btn-sm nb-btn-secondary shrink-0"
      >
        문자 보내기
      </a>
    </div>
  );
}

function formatPhone(p: string) {
  if (p.length === 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  return p;
}
