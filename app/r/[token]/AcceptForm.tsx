"use client";

import { useActionState } from "react";
import { acceptReferral } from "./actions";

export default function AcceptForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptReferral, null);

  if (state?.ok) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">🎉</div>
        <p className="font-extrabold text-black">쿠폰이 발급되었어요!</p>
        <p className="text-sm font-bold text-black">아래 버튼을 눌러 쿠폰을 확인하세요.</p>
        <a
          href={state.couponUrl}
          className="nb-btn nb-btn-primary block"
        >
          내 쿠폰 보기
        </a>
        <p className="text-xs font-bold text-black">추천해주신 분께도 보상이 발급되었습니다.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm font-bold text-black text-center">
        전화번호를 입력하면 위 혜택 쿠폰을 바로 받을 수 있어요.
      </p>
      <input type="hidden" name="token" value={token} />
      <input
        name="phone"
        type="tel"
        placeholder="010-0000-0000"
        className="nb-input w-full text-center"
      />
      {state?.error && <p className="text-sm text-[#ff5d8f] font-bold text-center">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="nb-btn nb-btn-primary w-full"
      >
        {pending ? "발급 중…" : "쿠폰 받기"}
      </button>
    </form>
  );
}
