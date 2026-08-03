// 매주 정기 발행하는 쿠폰 2종의 설정.
// 발행은 /api/weekly 라우트가 이 파일만 보고 처리한다(관리자 화면 입력 없음).
// 문구·기한·보관기간을 바꾸려면 여기만 고치면 된다.

export type WeeklyPreset = {
  key: string; // 호출 시 종류를 지정하는 값 (kinds: ["lockdown"])
  label: string; // 캠페인명·문자에 들어갈 짧은 이름
  benefit: string; // 고객 쿠폰 화면에 뜨는 혜택 문구
};

export const WEEKLY_PRESETS: WeeklyPreset[] = [
  {
    key: "lockdown",
    label: "락다운 시티 키링",
    benefit: "판타스트릭 테마 중 택1 5,000원 할인 + 키링(락다운 시티)",
  },
  {
    key: "eternity",
    label: "시간의 영속성 키링",
    benefit: "판타스트릭 테마 중 택1 5,000원 할인 + 키링(시간의 영속성)",
  },
];

// 문자 첫 줄 — 쿠폰 2종의 공통 혜택을 한 번만 알린다(종류별로 반복하지 않기 위해)
export const WEEKLY_HEADLINE = "[판타스트릭] 이번 주 쿠폰이 도착했어요!\n테마 중 택1 5,000원 할인 + 키링 증정";

// 쿠폰 사용기한 — 발급일로부터 1개월
export const VALID_MONTHS = 1;

// 보관 정책 — 만료일이 이만큼 지난 캠페인은 쿠폰과 함께 삭제한다(요약만 Log에 남김)
export const RETENTION_WEEKS = 4;

// 서버 타임존과 무관하게 KST 달력값을 읽기 위한 변환.
// 반환된 Date의 UTC 필드(getUTCFullYear 등)가 곧 KST의 연·월·일이 된다.
function toKST(d: Date) {
  return new Date(d.getTime() + 9 * 3600_000);
}

// KST 기준 y년 m월 day일 23:59:59에 해당하는 실제 시각(UTC 14:59:59).
// 화면은 toLocaleDateString(ko-KR)로 날짜만 찍으므로 UTC 서버에서도 같은 날짜로 표시된다.
function kstEndOfDay(y: number, m: number, day: number) {
  return new Date(Date.UTC(y, m, day, 23 - 9, 59, 59));
}

// 이번 주 월요일(KST)을 YYYY-MM-DD로. 같은 주에 두 번 실행해도 같은 캠페인을 쓰게 하는 키.
export function weekKey(now = new Date()) {
  const k = toKST(now);
  const backToMonday = (k.getUTCDay() + 6) % 7; // 0=일요일이므로 월요일까지 되돌릴 일수
  const mon = new Date(k.getTime() - backToMonday * 86400_000);
  const m = String(mon.getUTCMonth() + 1).padStart(2, "0");
  const d = String(mon.getUTCDate()).padStart(2, "0");
  return `${mon.getUTCFullYear()}-${m}-${d}`;
}

// 발급일로부터 1개월 뒤 23:59:59(KST).
// 말일 넘침(1/31 → 3/3)은 그 달 말일로 자른다.
export function expiryFrom(now = new Date()) {
  const k = toKST(now);
  const y = k.getUTCFullYear();
  const m = k.getUTCMonth();
  const target = m + VALID_MONTHS;
  const lastDay = new Date(Date.UTC(y, target + 1, 0)).getUTCDate();
  return kstEndOfDay(y, target, Math.min(k.getUTCDate(), lastDay));
}

// 이 시각보다 만료일이 오래된 캠페인이 정리 대상
export function retentionCutoff(now = new Date()) {
  return new Date(now.getTime() - RETENTION_WEEKS * 7 * 86400_000);
}

export function campaignName(preset: WeeklyPreset, week: string) {
  return `${week}주 · ${preset.label}`;
}

export function fmtKSTDate(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}
