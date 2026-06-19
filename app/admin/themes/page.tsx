import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { addTheme, deleteTheme } from "./actions";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  await requireAuth("admin");
  const themes = await prisma.theme.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="min-h-screen bg-[#fff7e0] p-6">
      <div className="max-w-xl mx-auto space-y-5">
        <Link href="/admin" className="text-sm font-bold text-slate-700 hover:text-black">
          ← 대시보드
        </Link>
        <header>
          <h1 className="text-2xl font-extrabold text-black">테마(방) 관리</h1>
          <p className="text-sm text-slate-600 mt-1">
            등록한 테마는 쿠폰 사용 시 "이번에 플레이한 테마" 선택과 "다른 테마 유도" 쿠폰에 사용됩니다.
          </p>
        </header>

        <form action={addTheme} className="nb-card p-5 flex gap-2">
          <input
            name="name"
            placeholder="테마 이름 (예: 공포의 저택)"
            className="nb-input flex-1"
          />
          <button className="nb-btn nb-btn-primary">추가</button>
        </form>

        <section className="nb-card p-5">
          {themes.length === 0 ? (
            <p className="text-sm text-slate-600">아직 등록한 테마가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {themes.map((t) => (
                <div key={t.id} className="nb-card-sm flex items-center justify-between p-3">
                  <span className="font-extrabold text-black">{t.name}</span>
                  <form action={deleteTheme}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="text-sm font-bold text-red-600">삭제</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
