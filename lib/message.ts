// 캠페인 성격에 맞는 문자 본문을 고른다.
// 주간·생일 쿠폰은 전용 문구를 쓰고, 그 밖의 캠페인은 기본 문구로 나간다.

import { fmtKSTDate } from "@/lib/kst";
import { buildMessage, presetByCampaignName } from "@/lib/weekly";
import { buildBirthdayMessage, monthFromCampaignName } from "@/lib/birthday";

export type DispatchItem = { label: string; link: string };

export function messageForCampaign(
  campaign: { name: string; benefit: string },
  name: string | null,
  items: DispatchItem[],
  expiresAt: Date | string | null | undefined,
) {
  const month = monthFromCampaignName(campaign.name);
  if (month) return buildBirthdayMessage(name, items[0].link, month, expiresAt);

  if (presetByCampaignName(campaign.name)) {
    return buildMessage(name, items.map((it) => ({ keyring: it.label, link: it.link })), expiresAt);
  }

  const who = name ? `${name}님, ` : "";
  const links = items.map((it) => it.link).join("\n");
  return `${who}${campaign.benefit} 쿠폰이 도착했어요!\n\n${links}\n\n사용기한 ~ ${fmtKSTDate(expiresAt)}`;
}
