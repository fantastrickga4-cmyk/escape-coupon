// KST(한국시간) 기준 날짜 계산 — 서버가 UTC로 도는 환경에서 한국 달력대로 동작해야 하는 것들.

// 서버 타임존과 무관하게 KST 달력값을 읽기 위한 변환.
// 반환된 Date의 UTC 필드(getUTCFullYear 등)가 곧 KST의 연·월·일이 된다.
export function toKST(d: Date) {
  return new Date(d.getTime() + 9 * 3600_000);
}

// KST 기준 y년 m월 day일 23:59:59에 해당하는 실제 시각(UTC 14:59:59).
// 화면은 toLocaleDateString(ko-KR)로 날짜만 찍으므로 UTC 서버에서도 같은 날짜로 표시된다.
export function kstEndOfDay(y: number, m: number, day: number) {
  return new Date(Date.UTC(y, m, day, 23 - 9, 59, 59));
}

export function fmtKSTDate(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

export function formatPhone(p: string) {
  if (p.length === 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  return p;
}
