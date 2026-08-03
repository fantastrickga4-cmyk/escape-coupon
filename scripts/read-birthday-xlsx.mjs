// 동의서 엑셀(동의서검색_*.xlsx)에서 생일자 명단을 뽑아 /api/birthday 페이로드로 출력한다.
// 라이브러리 없이 xlsx(zip)를 직접 읽는다.
//
//   node scripts/read-birthday-xlsx.mjs 1호점.xlsx 2호점.xlsx 3호점.xlsx > people.json
//   node scripts/read-birthday-xlsx.mjs --month 2026-08 *.xlsx
//
// 규칙: 마케팅동의가 "예"인 사람만, 생일(월-일)이 대상 월과 같은 사람만.
// 같은 번호가 여러 호점에 겹치면 한 명으로 합친다.

import { readFileSync, mkdtempSync, rmSync } from "fs";
import { execFileSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";

const args = process.argv.slice(2);
let month = null;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--month") month = args[++i];
  else files.push(args[i]);
}
if (files.length === 0) {
  console.error("사용법: node scripts/read-birthday-xlsx.mjs [--month YYYY-MM] <파일.xlsx> ...");
  process.exit(1);
}
// 기본은 KST 기준 이번 달
if (!month) {
  const k = new Date(Date.now() + 9 * 3600_000);
  month = `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}`;
}
const mm = month.split("-")[1];

function unesc(s) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, "&");
}

// xlsx는 zip이라 풀어서 XML을 읽는다(파워셸/유닉스 어디서든 쓰도록 unzip 사용)
function readSheet(file) {
  const dir = mkdtempSync(join(tmpdir(), "xlsx-"));
  try {
    execFileSync("unzip", ["-o", file, "-d", dir], { stdio: "ignore" });
    let strings = [];
    try {
      const ss = readFileSync(join(dir, "xl/sharedStrings.xml"), "utf8");
      strings = [...ss.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
        [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => unesc(t[1])).join(""),
      );
    } catch {
      /* 공유문자열이 없는 파일도 있다 */
    }
    const sheet = readFileSync(join(dir, "xl/worksheets/sheet1.xml"), "utf8");
    const rows = [];
    for (const rm of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = {};
      for (const cm of rm[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
        const [, col, attrs, inner] = cm;
        const inlineT = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
        const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        cells[col] = inlineT != null ? unesc(inlineT) : v == null ? "" : /t="s"/.test(attrs) ? strings[+v] : v;
      }
      rows.push(cells);
    }
    return rows;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const byPhone = new Map();
const skipped = { 미동의: 0, 다른달: 0, 번호없음: 0 };

for (const file of files) {
  const rows = readSheet(file);
  if (rows.length === 0) continue;
  // 첫 행이 헤더 — 이름/전화번호/마케팅동의/생일 컬럼 위치를 이름으로 찾는다
  const header = rows[0];
  const col = (want) => Object.keys(header).find((k) => String(header[k]).includes(want));
  const cName = col("이름");
  const cPhone = col("전화번호");
  const cAgree = col("마케팅동의");
  const cBirth = col("생일");

  for (const r of rows.slice(1)) {
    const phone = String(r[cPhone] ?? "").replace(/[^0-9]/g, "");
    const name = String(r[cName] ?? "").trim();
    const agree = String(r[cAgree] ?? "").trim();
    const birth = String(r[cBirth] ?? "").trim(); // "08-09"

    if (phone.length < 9 || phone.length > 11) { skipped.번호없음++; continue; }
    if (agree && agree !== "예") { skipped.미동의++; continue; }
    if (birth && birth.split("-")[0] !== mm) { skipped.다른달++; continue; }

    if (!byPhone.has(phone)) byPhone.set(phone, { name: name || null, phone, birth });
  }
}

const people = [...byPhone.values()];
console.error(
  `[${month}] 대상 ${people.length}명 · 제외: 미동의 ${skipped.미동의} / 다른달 ${skipped.다른달} / 번호이상 ${skipped.번호없음}`,
);
console.log(JSON.stringify({ month, people: people.map(({ name, phone }) => ({ name, phone })) }, null, 2));
