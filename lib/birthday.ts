// 매달 발행하는 생일축하 쿠폰 설정.
// 주간 쿠폰과 만료 규칙이 다르다 — 발급일+1개월이 아니라 "해당월 마지막 날"까지.

import { fmtKSTDate, kstEndOfDay, toKST } from "@/lib/kst";

// 고객 쿠폰 화면에 뜨는 혜택 문구 (직원이 보고 처리하는 기준)
export const BIRTHDAY_BENEFIT = "FANTASTRICK 테마 중 택1 (5,000원) 할인쿠폰";

// 생일 캠페인 이름은 "2026-08 생일축하 쿠폰" 꼴. 이 접두사로 월을 되찾는다.
const NAME_RE = /^(\d{4}-\d{2}) 생일축하 쿠폰$/;

// KST 기준 이번 달 "YYYY-MM"
export function monthKey(now = new Date()) {
  const k = toKST(now);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parts(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { y, m: m - 1 };
}

// 해당월 마지막 날 23:59:59(KST)
export function monthEnd(month: string) {
  const { y, m } = parts(month);
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return kstEndOfDay(y, m, lastDay);
}

// "2026-08" → "8"
export function monthLabel(month: string) {
  return String(parts(month).m + 1);
}

export function birthdayCampaignName(month: string) {
  return `${month} 생일축하 쿠폰`;
}

// 캠페인명이 생일 캠페인이면 해당 월("2026-08")을, 아니면 null
export function monthFromCampaignName(name: string) {
  return name.match(NAME_RE)?.[1] ?? null;
}

// 고객 쿠폰 화면 상단 제목
export function birthdayTitle(month: string) {
  return `FANTASTRICK ${monthLabel(month)}월달 생일축하 쿠폰을 보내드립니다!`;
}

// 안내 3줄. 쿠폰 화면엔 유효기간이 따로 표시되므로 여기엔 날짜를 넣지 않는다.
export function birthdayNoticeLines(month: string) {
  return [
    `본 쿠폰은 FANTASTRICK 동의서 작성 시 마케팅 동의를 하신 분들 중 ${monthLabel(month)}월달 생일자 대상으로 발송된 쿠폰입니다.`,
    "매장에서 쿠폰을 직원에게 보여주시면 사용 가능합니다.",
    "해당월 마지막 날까지 사용 가능하시니 기한을 꼭 확인해주시기 바랍니다.",
  ];
}

export function birthdayNotice(month: string) {
  return birthdayNoticeLines(month).join("\n");
}

// 받는 사람 한 명에게 나갈 문자 한 통.
// 문자에는 화면과 달리 실제 만료일을 붙여 기한을 분명히 한다.
export function buildBirthdayMessage(
  name: string | null | undefined,
  link: string,
  month: string,
  expiresAt: Date | string | null | undefined,
) {
  const who = name ? `${name}님` : "고객님";
  const notices = birthdayNoticeLines(month);
  notices[notices.length - 1] += ` (~ ${fmtKSTDate(expiresAt)})`;

  return [
    birthdayTitle(month),
    "",
    `${who}의 생일을 FANTASTRICK이 축하드립니다!`,
    "",
    "생일을 기념하여 한달동안 사용할 수 있는 쿠폰을 보내드립니다. FANTASTRICK에서 즐거운 순간을 경험하고 행복한 생일을 보내시기 바랍니다. 감사합니다",
    "",
    link,
    "",
    ...notices.map((n) => `* ${n}`),
  ].join("\n");
}
