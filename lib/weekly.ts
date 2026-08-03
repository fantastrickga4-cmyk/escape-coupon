// 매주 정기 발행하는 쿠폰 2종의 설정.
// 발행(/api/weekly)과 발송 화면(/admin/weekly)이 이 파일을 공유한다.
// 문구·기한·보관기간을 바꾸려면 여기만 고치면 된다.

export type WeeklyPreset = {
  key: string; // 발행 시 종류를 지정하는 값 (kinds: ["lockdown"])
  label: string; // 관리자 목록·발송 화면에 쓰는 짧은 이름
  keyring: string; // 문자 문구에 들어가는 키링 이름
  benefit: string; // 고객 쿠폰 화면에 뜨는 혜택 문구
};

export const WEEKLY_PRESETS: WeeklyPreset[] = [
  {
    key: "lockdown",
    label: "락다운 시티 키링",
    keyring: "락다운 시티",
    benefit: "판타스트릭 테마 중 택1 5,000원 할인 + 키링(락다운 시티)",
  },
  {
    key: "eternity",
    label: "시간의 영속성 키링",
    keyring: "시간의 영속성",
    benefit: "판타스트릭 테마 중 택1 5,000원 할인 + 키링(시간의 영속성)",
  },
];

// 고객 쿠폰 화면(/c/[token])에 보이는 제목. 관리용 캠페인명은 주차·종류가 드러나야 해서 따로 둔다.
export const WEEKLY_TITLE = "FANTASTRICK 리뷰 참여 감사 쿠폰";

// 문자에서 키링 이름 앞에 공통으로 붙는 할인 문구
const DISCOUNT_TEXT = "판타스트릭 테마 중 택1 5,000원 할인";

// 문자 말미 안내 — 수령처와 기한 주의. 문구만 고치면 발송 화면에 바로 반영된다.
export const PICKUP_NOTICE = "키링은 FANTASTRICK TGC점에서 수령 가능합니다.";
export const EXPIRY_NOTICE = "쿠폰 사용기한은 1달입니다 기한을 꼭 확인해주세요!";

// 고객 쿠폰 화면(/c/[token]) 하단에 띄울 안내. 화면엔 유효기간이 따로 표시되므로 날짜는 넣지 않는다.
export const WEEKLY_NOTICE = `${PICKUP_NOTICE}\n${EXPIRY_NOTICE}`;

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

export function formatPhone(p: string) {
  if (p.length === 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  return p;
}

const MARKS = ["①", "②", "③", "④"];

export type MessageItem = { keyring: string; link: string };

// 받는 사람 한 명에게 나갈 문자 한 통.
// 여러 장을 받는 사람은 통을 나누지 않고 링크를 번호로 나열한다.
export function buildMessage(
  name: string | null | undefined,
  items: MessageItem[],
  expiresAt: Date | string | null | undefined,
) {
  const who = name ? `${name}님` : "고객님";
  const tail = `※ ${PICKUP_NOTICE}\n※ ${EXPIRY_NOTICE} (~ ${fmtKSTDate(expiresAt)})`;

  if (items.length === 1) {
    return `${who}, 리뷰 감사합니다!\n${DISCOUNT_TEXT} + 키링(${items[0].keyring}) 쿠폰이 도착했어요.\n\n${items[0].link}\n\n${tail}`;
  }

  const list = items
    .map((it, i) => `${MARKS[i] ?? `${i + 1}.`} 키링(${it.keyring})\n${it.link}`)
    .join("\n\n");
  return `${who}, 리뷰 감사합니다!\n${DISCOUNT_TEXT} 쿠폰 ${items.length}장이 도착했어요.\n\n${list}\n\n${tail}`;
}

// 캠페인명(관리용)에서 키링 종류를 되찾는다. 발송 화면이 쿠폰→키링명을 알아내는 데 쓴다.
export function presetByCampaignName(name: string) {
  return WEEKLY_PRESETS.find((p) => name.endsWith(p.label)) ?? null;
}
