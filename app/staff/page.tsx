import { requireAuth, getStaffStore } from "@/lib/auth";
import { STORES } from "@/lib/coupon";
import { staffLogout } from "./actions";
import Scanner from "./Scanner";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await requireAuth("staff");
  const storeId = await getStaffStore();
  const store = STORES.find((s) => s.id === storeId);

  return (
    <main className="min-h-screen bg-[#fff7e0] p-6">
      <div className="max-w-sm mx-auto space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-[#111]">쿠폰 사용 처리</h1>
            <p className="mt-1.5">
              <span className="nb-tag bg-[#4ad7d4] text-[#111] font-extrabold">{store?.name ?? "매장 미지정"}</span>
            </p>
          </div>
          <form action={staffLogout}>
            <button className="text-sm font-bold text-[#111] hover:underline">로그아웃</button>
          </form>
        </header>

        <Scanner />
      </div>
    </main>
  );
}
