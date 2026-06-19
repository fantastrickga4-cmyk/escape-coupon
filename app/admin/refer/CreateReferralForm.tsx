"use client";

import { useActionState } from "react";
import { createReferral } from "./actions";

type Campaign = { id: string; name: string; benefit: string };

export default function CreateReferralForm({ campaigns }: { campaigns: Campaign[] }) {
  const [state, action, pending] = useActionState(createReferral, null);
  const field = "nb-input";

  return (
    <form action={action} className="nb-card p-6 space-y-4">
      <h2 className="font-extrabold text-black">추천 링크 만들기</h2>
      <div className="space-y-1">
        <label className="text-sm font-bold text-slate-700">추천 캠페인</label>
        <select name="campaignId" className={field}>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.benefit}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-bold text-slate-700">추천인 전화번호 (보상 받을 분)</label>
        <input name="referrerPhone" placeholder="010-0000-0000" className={field} />
      </div>
      {state?.error && <p className="text-sm font-bold text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm font-bold text-emerald-600">추천 링크가 생성되었습니다. 아래 목록에서 전달하세요.</p>}
      <button
        type="submit"
        disabled={pending}
        className="nb-btn nb-btn-primary w-full"
      >
        {pending ? "생성 중…" : "추천 링크 생성"}
      </button>
    </form>
  );
}
