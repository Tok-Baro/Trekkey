export const EVIDENCE_TYPES = [
  { value: "QUALIFICATION", label: "자격증", recordType: "OTHER" },
  { value: "LANGUAGE_SCORE", label: "어학 성적", recordType: "TOPIK" },
  { value: "CONTEST_AWARD", label: "공모전 상장", recordType: "OTHER" },
  { value: "THESIS", label: "졸업논문", recordType: "THESIS" },
  { value: "GRADUATION_WORK", label: "졸업작품·캡스톤", recordType: "GRADUATION_WORK" },
  { value: "GRADUATION_EXAM", label: "졸업시험", recordType: "GRADUATION_EXAM" },
  { value: "RESEARCH_PLAN", label: "연구활동계획서", recordType: "RESEARCH_PLAN" },
  { value: "COMPLETION", label: "수료증", recordType: "OTHER" },
  { value: "ENROLLMENT", label: "재학·등록 서류", recordType: "OTHER" },
  { value: "EMPLOYMENT", label: "경력 증명", recordType: "OTHER" },
  { value: "OTHER", label: "기타", recordType: "OTHER" }
];

export const EVIDENCE_STATUS = {
  UNDER_REVIEW: { label: "검수 대기", tone: "warning" },
  AWAITING_SECOND_REVIEW: { label: "2차 검수 대기", tone: "warning" },
  VERIFIED: { label: "검증 완료", tone: "success" },
  REJECTED: { label: "반려", tone: "danger" },
  INCONCLUSIVE: { label: "추가 확인 필요", tone: "warning" }
};

export function evidenceStatus(status) {
  return EVIDENCE_STATUS[status] ?? { label: status || "알 수 없음", tone: "neutral" };
}

export function evidenceTypeLabel(type) {
  return EVIDENCE_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function saveBlob({ blob, fileName }) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "evidence";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
