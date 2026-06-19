import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 bg-[#fff7e0]">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-black">쿠폰 발행기</h1>
        <p className="mt-2 font-bold text-black">매장용 1회용 쿠폰 발급 · 사용 관리</p>
      </div>
      <div className="grid gap-4 w-full max-w-sm">
        <Link
          href="/admin"
          className="nb-btn nb-btn-dark text-center py-4 text-lg"
        >
          관리자 — 발행 / 현황
        </Link>
        <Link
          href="/staff"
          className="nb-btn nb-btn-secondary text-center py-4 text-lg"
        >
          직원 — 쿠폰 사용 처리
        </Link>
      </div>
      <p className="text-xs font-bold text-black">© 매장 쿠폰 시스템</p>
    </main>
  );
}
