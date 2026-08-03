// "010-1234-5678", "01012345678", 줄바꿈/쉼표/공백 혼합 입력을 번호 배열로 정리
export function parsePhones(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((p) => p.replace(/[^0-9]/g, ""))
    .filter((p) => p.length >= 9 && p.length <= 11);
  return Array.from(new Set(parts)); // 중복 제거
}
