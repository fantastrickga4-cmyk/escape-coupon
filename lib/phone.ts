// 배열로 받은 번호 — 원소 하나가 번호 하나다.
// "010 9897 6928", "010-9897-6928"처럼 안에 공백·하이픈이 있어도 쪼개지 않고 숫자만 남긴다.
export function normalizePhones(list: string[]): string[] {
  const parts = list
    .map((p) => p.replace(/[^0-9]/g, ""))
    .filter((p) => p.length >= 9 && p.length <= 11);
  return Array.from(new Set(parts)); // 중복 제거
}

// 한 덩어리 문자열 — 줄바꿈·쉼표·공백을 번호 구분자로 본다(화면에 붙여넣는 입력용).
// 번호 안에 공백이 들어간 형태는 여기서 쪼개지므로, 그런 입력은 normalizePhones를 쓴다.
export function parsePhones(raw: string): string[] {
  return normalizePhones(raw.split(/[\s,;]+/));
}
