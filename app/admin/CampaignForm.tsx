"use client";

import { useActionState, useState } from "react";
import { createCampaign } from "./actions";

const DAYS = [
  { v: "1", l: "월" },
  { v: "2", l: "화" },
  { v: "3", l: "수" },
  { v: "4", l: "목" },
  { v: "5", l: "금" },
  { v: "6", l: "토" },
  { v: "0", l: "일" },
];

export default function CampaignForm() {
  const [state, action, pending] = useActionState(createCampaign, null);
  const [kind, setKind] = useState("normal");
  const [advanced, setAdvanced] = useState(false);

  const field = "nb-input";

  return (
    <form action={action} className="nb-card p-6 space-y-4">
      <h2 className="font-extrabold text-[#111]">새 캠페인 발행</h2>

      <div className="space-y-1">
        <label className="text-sm font-bold text-slate-700">쿠폰 유형</label>
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
          <option value="normal">일반 쿠폰</option>
          <option value="review">리뷰 작성 보상</option>
          <option value="referral">친구 추천</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-600">캠페인명</label>
        <input name="name" placeholder="예: 평일 낮 특가" className={field} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-bold text-slate-700">
          {kind === "referral" ? "친구(추천받은 사람) 혜택" : "혜택 내용"}
        </label>
        <input name="benefit" placeholder="예: 다른 테마 20% 할인" className={field} />
      </div>

      {kind === "review" && (
        <div className="space-y-1">
          <label className="text-sm text-slate-600">리뷰 작성 링크 (네이버/구글 등)</label>
          <input name="reviewUrl" placeholder="https://..." className={field} />
        </div>
      )}
      {kind === "referral" && (
        <div className="space-y-1">
          <label className="text-sm text-slate-600">추천인 보상</label>
          <input name="referrerReward" placeholder="예: 음료 2잔 무료" className={field} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm text-slate-600">유효기간 (선택)</label>
          <input type="date" name="expiresAt" className={field} />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600">미리 발급할 수량</label>
          <input type="number" name="quantity" defaultValue={kind === "normal" ? 1 : 0} min={0} max={2000} className={field} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        className="nb-btn nb-btn-sm nb-btn-yellow"
      >
        {advanced ? "▾ 사용 조건 접기" : "▸ 사용 조건 설정 (요일·시간·인원)"}
      </button>

      {advanced && (
        <div className="space-y-4 border-2 border-black rounded-xl bg-[#fff7e0] p-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">사용 가능 요일 (선택 안 하면 매일)</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <label key={d.v} className="nb-tag cursor-pointer gap-1 bg-white">
                  <input type="checkbox" name="days" value={d.v} className="accent-[#ff5d8f]" />
                  {d.l}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">시작 시각 (0~23)</label>
              <input type="number" name="fromHour" min={0} max={23} placeholder="예: 14" className={field} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">종료 시각 (0~23)</label>
              <input type="number" name="toHour" min={0} max={23} placeholder="예: 17" className={field} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">최소 인원 (단체 할인용, 기본 1)</label>
            <input type="number" name="minPeople" defaultValue={1} min={1} max={50} className={field} />
          </div>
        </div>
      )}

      {state?.error && <p className="text-sm font-bold text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="nb-btn nb-btn-primary w-full"
      >
        {pending ? "발행 중…" : "발행하기"}
      </button>
    </form>
  );
}
