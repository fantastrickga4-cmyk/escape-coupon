"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { staffLogin } from "../actions";
import { STORES } from "@/lib/coupon";

export default function StaffLogin() {
  const [state, action, pending] = useActionState(staffLogin, null);
  const [storeId, setStoreId] = useState(0);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#fff7e0] p-6">
      <form action={action} className="w-full max-w-sm nb-card p-8 space-y-5">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-black">
          ← 홈으로
        </Link>
        <h1 className="text-xl font-extrabold text-black">호점을 선택하세요</h1>
        <p className="text-sm font-bold text-black">선택한 호점으로 쿠폰 사용이 기록됩니다.</p>

        <div className="grid grid-cols-3 gap-2">
          {STORES.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => setStoreId(s.id)}
              className={`nb-btn nb-btn-sm ${
                storeId === s.id
                  ? "nb-btn-primary"
                  : "nb-btn-white"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <input type="hidden" name="storeId" value={storeId} />
        {state?.error && <p className="text-sm text-[#ff5d8f] font-bold">{state.error}</p>}
        <button
          type="submit"
          disabled={pending || storeId === 0}
          className="nb-btn nb-btn-secondary w-full"
        >
          {pending ? "이동 중…" : "들어가기"}
        </button>
      </form>
    </main>
  );
}
