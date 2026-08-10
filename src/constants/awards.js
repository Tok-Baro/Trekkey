export const AWARD_TYPE_OPTIONS = [
  { value: "GRAND_PRIZE", label: "대상" },
  { value: "EXCELLENCE", label: "최우수상" },
  { value: "MERIT", label: "우수상" },
  { value: "ENCOURAGEMENT", label: "장려상" },
  { value: "HONORABLE_MENTION", label: "입선" },
  { value: "SPECIAL", label: "특별상" },
  { value: "PRESIDENT_AWARD", label: "총장상" },
  { value: "CUSTOM", label: "직접 입력" }
];

const labelByType = Object.fromEntries(
  AWARD_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

const typeByLabel = Object.fromEntries(
  AWARD_TYPE_OPTIONS
    .filter((option) => option.value !== "CUSTOM")
    .map((option) => [option.label, option.value])
);

export function inferAwardType(prize) {
  return typeByLabel[String(prize ?? "").trim()] ?? "CUSTOM";
}

export function resolveAwardPrize(awardType, customPrize = "") {
  return awardType === "CUSTOM"
    ? String(customPrize).trim()
    : labelByType[awardType] ?? String(customPrize).trim();
}

export function getDefaultAwardType(rank) {
  return [
    "GRAND_PRIZE",
    "EXCELLENCE",
    "MERIT",
    "ENCOURAGEMENT",
    "HONORABLE_MENTION"
  ][Number(rank) - 1] ?? "CUSTOM";
}

export function markJointRanks(awards) {
  const counts = awards.reduce((result, award) => {
    const key = `${award.contestId ?? award.contestPublicId}:${award.rank ?? award.awardRankNo}`;
    result.set(key, (result.get(key) ?? 0) + 1);
    return result;
  }, new Map());

  return awards.map((award) => {
    const key = `${award.contestId ?? award.contestPublicId}:${award.rank ?? award.awardRankNo}`;
    return { ...award, jointRank: (counts.get(key) ?? 0) > 1 };
  });
}

export function formatAwardRank(award) {
  const rank = Number(award?.rank ?? award?.awardRankNo);
  if (!Number.isFinite(rank)) {
    return "-";
  }
  return `${award?.jointRank ? "공동 " : ""}${rank}위`;
}
