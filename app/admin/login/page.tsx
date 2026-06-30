"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminLogin } from "../actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(adminLogin, null);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#fff7e0] p-6">
      <form action={action} className="w-full max-w-sm nb-card p-8 space-y-5">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-black">
          ← 홈으로
        </Link>
        <h1 className="text-xl font-extrabold text-black">관리자 로그인</h1>
        <input
          type="password"
          name="password"
          placeholder="관리자 비밀번호"
          autoFocus
          className="nb-input w-full"
        />
        {state?.error && <p className="text-sm text-[#ff5d8f] font-bold">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="nb-btn nb-btn-primary w-full"
        >
          {pending ? "확인 중…" : "로그인"}
        </button>
      </form>
    </main>
  );
}
