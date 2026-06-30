// 클립보드 복사 — 비보안 컨텍스트(HTTP)·인앱 브라우저 대비 폴백 포함.
// navigator.clipboard는 HTTPS/localhost 같은 보안 컨텍스트에서만 동작하고,
// 카톡 등 인앱 브라우저에서 막히는 경우가 있어 execCommand 폴백을 둔다.
export async function copyText(text: string): Promise<boolean> {
  // 1순위: 표준 Clipboard API (보안 컨텍스트에서만 존재)
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 권한 거부·포커스 상실 등 → 폴백으로 진행
    }
  }

  // 2순위: 숨은 textarea + execCommand("copy") 폴백
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length); // iOS 대응
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
