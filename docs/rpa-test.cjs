/* RPA 전수 기능 점검 — Puppeteer로 실제 UI를 구동하며 검사 */
const puppeteer = require("puppeteer-core");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.RPA_BASE || "http://localhost:3000";
const PW = "0000";
const R = [];
const pass = (n, d = "") => { R.push({ n, ok: true, d }); console.log("PASS ✓", n, d); };
const fail = (n, d = "") => { R.push({ n, ok: false, d }); console.log("FAIL ✗", n, d); };

async function setVal(page, sel, val) {
  await page.waitForSelector(sel, { timeout: 10000 });
  // React 제어 입력까지 onChange가 발화되도록 네이티브 setter 사용
  await page.$eval(sel, (el, v) => {
    const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, val);
}
async function clickText(page, sel, text) {
  const h = await page.evaluateHandle((sel, text) => {
    const els = [...document.querySelectorAll(sel)];
    return els.find((e) => e.textContent.replace(/\s+/g, " ").includes(text)) || null;
  }, sel, text);
  const el = h.asElement();
  if (!el) throw new Error(`클릭 대상 없음: ${sel} "${text}"`);
  await el.click();
  return el;
}
async function bodyText(page) { return page.evaluate(() => document.body.innerText); }
async function waitText(page, text, t = 9000) {
  await page.waitForFunction((x) => document.body.innerText.includes(x), { timeout: t }, text);
}

async function adminLogin(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2" });
  // 잘못된 비번
  await setVal(page, '[name=password]', "wrongpw");
  await page.click('button[type=submit]');
  try { await waitText(page, "올바르지 않습니다", 5000); pass("관리자 로그인: 잘못된 비번 거부"); }
  catch { fail("관리자 로그인: 잘못된 비번 거부", "에러 메시지 안 뜸"); }
  // 올바른 비번
  await setVal(page, '[name=password]', PW);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click('button[type=submit]')]);
  if (page.url().endsWith("/admin")) pass("관리자 로그인: 정상 로그인");
  else fail("관리자 로그인: 정상 로그인", "리다이렉트 실패 url=" + page.url());
}

async function createCampaign(page, o) {
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle2" });
  await page.select('[name=kind]', o.kind || "normal");
  await setVal(page, '[name=name]', o.name);
  await setVal(page, '[name=benefit]', o.benefit);
  if (o.kind === "review") { await setVal(page, '[name=reviewUrl]', o.reviewUrl || "https://example.com/review"); }
  if (o.kind === "referral") { await setVal(page, '[name=referrerReward]', o.referrerReward || "음료 2잔 무료"); }
  await setVal(page, '[name=quantity]', String(o.quantity ?? 0));
  if (o.minPeople && o.minPeople > 1) {
    await clickText(page, "button", "사용 조건 설정");
    await setVal(page, '[name=minPeople]', String(o.minPeople));
  }
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), clickText(page, 'button[type=submit]', "발행")]);
  const m = page.url().match(/\/admin\/campaign\/([^/?]+)/);
  if (m) { pass(`캠페인 발행: ${o.name}`, `id=${m[1].slice(0,8)}…`); return m[1]; }
  fail(`캠페인 발행: ${o.name}`, "상세로 이동 안 함 url=" + page.url());
  return null;
}

async function firstTokenOfCampaign(page, id) {
  await page.goto(`${BASE}/admin/campaign/${id}`, { waitUntil: "networkidle2" });
  const href = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/c/"]');
    return a ? a.getAttribute("href") : null;
  });
  return href ? href.replace("/c/", "") : null;
}

async function staffLogin(page) {
  await page.goto(`${BASE}/staff/login`, { waitUntil: "networkidle2" });
  await clickText(page, "button", "1호점");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), clickText(page, "button", "들어가기")]);
  if (page.url().endsWith("/staff")) pass("직원 입장: 호점 선택→입장");
  else fail("직원 입장", "url=" + page.url());
}

async function staffRedeem(page, token) {
  await page.goto(`${BASE}/staff`, { waitUntil: "networkidle2" });
  await setVal(page, 'input[placeholder*="코드 직접 입력"]', token);
  await clickText(page, "form button", "확인");
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("response", (r) => { if (r.status() >= 500) errs.push(`HTTP ${r.status()} ${r.url()}`); });

  try {
    // 0. 홈
    await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
    (await bodyText(page)).includes("쿠폰 발행기") ? pass("홈 화면 렌더") : fail("홈 화면 렌더");

    // 1. 관리자 로그인
    await adminLogin(page);

    // 2. 테마 관리
    await page.goto(`${BASE}/admin/themes`, { waitUntil: "networkidle2" });
    await setVal(page, '[name=name]', "RPA테마A");
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }).catch(()=>{}), clickText(page, "button", "추가")]);
    await page.goto(`${BASE}/admin/themes`, { waitUntil: "networkidle2" });
    (await bodyText(page)).includes("RPA테마A") ? pass("테마 추가") : fail("테마 추가", "목록에 없음");

    // 3. 캠페인 4종 발행
    const cBasic = await createCampaign(page, { kind: "normal", name: "RPA기본", benefit: "RPA기본혜택", quantity: 2 });
    const cGroup = await createCampaign(page, { kind: "normal", name: "RPA단체", benefit: "RPA단체혜택", quantity: 1, minPeople: 4 });
    const cReview = await createCampaign(page, { kind: "review", name: "RPA리뷰", benefit: "RPA리뷰혜택", quantity: 1, reviewUrl: "https://example.com/r" });
    const cRefer = await createCampaign(page, { kind: "referral", name: "RPA추천", benefit: "친구1만원", quantity: 0, referrerReward: "추천인보상2천" });

    // 4. 문자 발송 플로우 (+ 테마 제외)
    await page.goto(`${BASE}/admin/send`, { waitUntil: "networkidle2" });
    await page.select('[name=campaignId]', cBasic);
    const hasExclude = await page.$('[name=excludeTheme]');
    if (hasExclude) await page.select('[name=excludeTheme]', "RPA테마A");
    await setVal(page, '[name=phones]', "010-1111-2222\n010-3333-4444");
    await clickText(page, 'button[type=submit]', "발송 목록 만들기");
    try {
      await waitText(page, "발송 목록", 9000);
      const rows = await page.evaluate(() => document.querySelectorAll('a[href^="sms:"]').length);
      rows >= 2 ? pass("문자 발송 목록 생성", `${rows}건 + 문자버튼`) : fail("문자 발송 목록 생성", `행 ${rows}`);
    } catch (e) { fail("문자 발송 목록 생성", String(e.message)); }
    // 발송된 쿠폰(테마제외) 토큰 확보
    const themeToken = await page.evaluate(() => {
      const t = [...document.querySelectorAll('*')].map(e=>e.textContent).find(()=>false);
      const link = [...document.querySelectorAll('.truncate, div')].map(e=>e.textContent).find(s=>s&&s.includes("/c/"));
      if (link){ const m = link.match(/\/c\/([A-Za-z0-9_-]+)/); return m?m[1]:null;} return null;
    });

    // 5. 친구 추천 플로우
    await page.goto(`${BASE}/admin/refer`, { waitUntil: "networkidle2" });
    await page.select('[name=campaignId]', cRefer);
    await setVal(page, '[name=referrerPhone]', "010-5555-6666");
    await clickText(page, 'button[type=submit]', "추천 링크 생성");
    let referLink = null;
    try {
      await waitText(page, "추천 링크 (추천인", 9000);
      referLink = await page.evaluate(() => {
        const s = [...document.querySelectorAll("div")].map(e=>e.textContent).find(t=>t&&t.includes("/r/"));
        if (!s) return null; const m = s.match(/\/r\/([A-Za-z0-9_-]+)/); return m?m[1]:null;
      });
      referLink ? pass("추천 링크 생성", referLink.slice(0,8)+"…") : fail("추천 링크 생성", "링크 추출 실패");
    } catch (e) { fail("추천 링크 생성", String(e.message)); }

    // 6. 친구 수락 (양측 쿠폰)
    let refereeToken = null;
    if (referLink) {
      await page.goto(`${BASE}/r/${referLink}`, { waitUntil: "networkidle2" });
      await setVal(page, '[name=phone]', "010-7777-8888");
      await clickText(page, 'button[type=submit]', "쿠폰 받기");
      try {
        await waitText(page, "발급되었어요", 9000);
        refereeToken = await page.evaluate(() => { const a=document.querySelector('a[href*="/c/"]'); if(!a)return null; const m=a.href.match(/\/c\/([A-Za-z0-9_-]+)/); return m?m[1]:null; });
        pass("친구 추천 수락: 쿠폰 발급");
      } catch (e) { fail("친구 추천 수락", String(e.message)); }
    }

    // 7. 고객 쿠폰 화면 (QR)
    const basicToken = await firstTokenOfCampaign(page, cBasic);
    if (basicToken) {
      await page.goto(`${BASE}/c/${basicToken}`, { waitUntil: "networkidle2" });
      const hasQR = await page.evaluate(() => !!document.querySelector('img[alt="쿠폰 QR"]'));
      hasQR ? pass("고객 쿠폰: QR 렌더") : fail("고객 쿠폰: QR 렌더");
    } else fail("고객 쿠폰: 토큰 확보", "기본 캠페인 쿠폰 없음");

    // 8. 리뷰 쿠폰: 리뷰 CTA 표시
    const reviewToken = await firstTokenOfCampaign(page, cReview);
    if (reviewToken) {
      await page.goto(`${BASE}/c/${reviewToken}`, { waitUntil: "networkidle2" });
      (await bodyText(page)).includes("리뷰 작성") ? pass("리뷰 쿠폰: 리뷰 버튼 표시") : fail("리뷰 쿠폰: 리뷰 버튼 표시");
    }

    // 9. 직원 입장
    await staffLogin(page);

    // 10. 직원 사용처리 — 기본 쿠폰 성공
    if (basicToken) {
      await staffRedeem(page, basicToken);
      try { await waitText(page, "사용 처리 완료", 9000); pass("직원 사용처리: 기본 쿠폰 성공"); }
      catch (e) { fail("직원 사용처리: 기본 쿠폰 성공", String(e.message)); }
      // 중복 사용 차단
      await staffRedeem(page, basicToken);
      try { await waitText(page, "이미 사용", 9000); pass("직원 사용처리: 중복 사용 차단"); }
      catch (e) { fail("직원 사용처리: 중복 사용 차단", String(e.message)); }
    }

    // 11. 단체 쿠폰 — 인원 입력 단계 노출
    const groupToken = await firstTokenOfCampaign(page, cGroup);
    if (groupToken) {
      await staffRedeem(page, groupToken);
      try {
        await waitText(page, "인원수", 9000); pass("단체 쿠폰: 인원 입력 단계 노출");
        // 인원 입력 후 처리 (네이티브 setter로 React 상태 갱신)
        await page.$eval('input[type=number]', (el)=>{
          const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
          s.call(el,"5"); el.dispatchEvent(new Event("input",{bubbles:true}));
        });
        await clickText(page, "button", "사용 처리하기");
        await waitText(page, "사용 처리 완료", 9000); pass("단체 쿠폰: 인원 입력 후 처리 성공");
      } catch (e) { fail("단체 쿠폰: 인원 처리", String(e.message)); }
    }

    // 12. 테마제외 쿠폰 — 테마 선택 단계 노출
    if (themeToken) {
      await staffRedeem(page, themeToken);
      try { await waitText(page, "플레이하는 테마", 9000); pass("테마제외 쿠폰: 테마 선택 단계 노출"); }
      catch (e) { fail("테마제외 쿠폰: 테마 선택 단계 노출", String(e.message)); }
    } else fail("테마제외 쿠폰: 토큰 확보", "발송 토큰 추출 실패");

    // 13. 사용 취소 → 재사용 가능
    if (basicToken) {
      await page.goto(`${BASE}/admin`, { waitUntil: "networkidle2" });
      try {
        const clicked = await page.evaluate(() => {
          const btns = [...document.querySelectorAll("form button")].filter(b => b.textContent.includes("취소"));
          for (const b of btns) {
            const row = b.closest("form") && b.closest("form").parentElement;
            if (row && row.textContent.includes("RPA기본혜택")) { b.click(); return true; }
          }
          return false;
        });
        await new Promise(r=>setTimeout(r,1500));
        if (clicked) {
          await staffRedeem(page, basicToken);
          await waitText(page, "사용 처리 완료", 9000);
          pass("사용 취소: 취소 후 재사용 가능");
        } else fail("사용 취소", "취소 버튼 못 찾음");
      } catch (e) { fail("사용 취소", String(e.message)); }
    }

    // JS 에러/5xx 체크
    errs.length === 0 ? pass("콘솔/서버 오류 없음") : fail("콘솔/서버 오류", errs.slice(0,5).join(" | "));

    // 정리: 생성한 테스트 데이터 삭제 (캠페인 cascade + 테마)
    try {
      for (const id of [cBasic, cGroup, cReview, cRefer].filter(Boolean)) {
        await page.goto(`${BASE}/admin/campaign/${id}`, { waitUntil: "networkidle2" });
        await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }).catch(()=>{}), clickText(page, "button", "캠페인 삭제")]);
      }
      await page.goto(`${BASE}/admin/themes`, { waitUntil: "networkidle2" });
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll("form button")].filter(b => b.textContent.includes("삭제"));
        for (const b of btns) { const row = b.closest("form") && b.closest("form").parentElement; if (row && row.textContent.includes("RPA테마A")) { b.click(); return; } }
      });
      await new Promise(r => setTimeout(r, 1500));
      pass("테스트 데이터 정리");
    } catch (e) { fail("테스트 데이터 정리", String(e.message)); }

  } catch (e) {
    fail("치명적 오류", String(e.stack || e.message));
  } finally {
    const okN = R.filter(r=>r.ok).length, no = R.filter(r=>!r.ok).length;
    console.log("\n================ RPA 점검 결과 ================");
    R.forEach(r => console.log((r.ok?"✓":"✗")+" "+r.n+(r.d?"  — "+r.d:"")));
    console.log(`\n합계: ${okN} 통과 / ${no} 실패 (총 ${R.length})`);
    await browser.close();
    process.exit(no>0?1:0);
  }
})();
