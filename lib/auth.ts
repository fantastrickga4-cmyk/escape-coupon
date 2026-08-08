import { cookies } from "next/headers";
import { createHash } from "crypto";
import { redirect } from "next/navigation";

// 관리자 비밀번호를 쿠키에 직접 담지 않도록 해시 토큰을 사용
function adminToken(password: string) {
  return createHash("sha256").update(`admin:${password}`).digest("hex");
}

const ADMIN_PW = process.env.ADMIN_PASSWORD ?? "admin1234";

// 직원 세션은 사실상 만료되지 않게 둔다 — 비밀번호 없이 호점만 고르는 입장이라
// 만료돼봐야 얻는 게 없고, 손님 앞에서 스캔이 막히는 손해만 크다.
const STAFF_MAX_AGE = 60 * 60 * 24 * 365; // 1년

export function checkPassword(role: "admin", password: string) {
  return role === "admin" && password === ADMIN_PW;
}

// 관리자: 비밀번호 기반 / 직원: 호점 선택만으로 입장(비밀번호 없음)
export async function setSession(role: "admin" | "staff", password?: string, storeId?: number) {
  const c = await cookies();
  if (role === "admin") {
    c.set("admin_auth", adminToken(password ?? ""), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12시간
    });
  } else if (storeId) {
    c.set("staff_store", String(storeId), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: STAFF_MAX_AGE,
    });
  }
}

// 사용처리 때마다 직원 쿠키 수명을 연장한다(라우트 핸들러에서만 호출 가능).
export async function touchStaffSession() {
  const c = await cookies();
  const id = c.get("staff_store")?.value;
  if (!id) return;
  c.set("staff_store", id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: STAFF_MAX_AGE,
  });
}

export async function clearSession(role: "admin" | "staff") {
  const c = await cookies();
  if (role === "admin") c.delete("admin_auth");
  else c.delete("staff_store");
}

export async function isAuthed(role: "admin" | "staff") {
  const c = await cookies();
  if (role === "admin") {
    return c.get("admin_auth")?.value === adminToken(ADMIN_PW);
  }
  // 직원은 유효한 호점(1/2/3)이 선택돼 있으면 인증된 것으로 본다
  const id = Number(c.get("staff_store")?.value);
  return [1, 2, 3].includes(id);
}

// 페이지 진입 시 인증 확인 — 미인증이면 로그인/호점선택으로 보냄
export async function requireAuth(role: "admin" | "staff") {
  if (!(await isAuthed(role))) redirect(`/${role}/login`);
}

export async function getStaffStore() {
  const c = await cookies();
  const id = c.get("staff_store")?.value;
  return id ? Number(id) : null;
}
