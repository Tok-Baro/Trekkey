import { getSubmissionFileCount, getSubmissionFileSummary } from "./submissionFiles.js";

export function exportSubmissionsCsv({ contest, submissions }) {
  if (!submissions.length) {
    return { ok: false, message: "내보낼 제출물이 없습니다." };
  }

  const rows = [
    ["대회명", contest.title],
    ["대회ID", contest.id],
    [],
    ["제출번호", "팀", "제출물명", "파일 수", "파일 요약", "접수시각", "무결성", "심사 상태", "업로드 상태"],
    ...submissions.map((submission) => [
      submission.id,
      submission.team,
      submission.title,
      getSubmissionFileCount(submission),
      getSubmissionFileSummary(submission),
      submission.submittedAt,
      submission.hashReady ? "해시 생성" : "대기",
      submission.review,
      submission.uploadStatus || ""
    ])
  ];

  downloadCsv(`${contest.id}-submissions.csv`, rows);
  return { ok: true, message: `${submissions.length}건의 제출물 CSV를 다운로드했습니다.` };
}

export function exportAwardsCsv({ contest, awardCandidates }) {
  if (!awardCandidates.length) {
    return { ok: false, message: "내보낼 수상 후보가 없습니다." };
  }

  const rows = [
    ["대회명", contest.title],
    ["대회ID", contest.id],
    [],
    ["순위", "상격", "팀", "점수", "인원", "상태", "상장번호"],
    ...awardCandidates.map((candidate) => [
      candidate.rank,
      candidate.prize,
      candidate.team,
      candidate.score,
      candidate.members,
      candidate.status,
      candidate.certificateNo
    ])
  ];

  downloadCsv(`${contest.id}-awards.csv`, rows);
  return { ok: true, message: `${awardCandidates.length}건의 수상 명단 CSV를 다운로드했습니다.` };
}

export function downloadJson(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  triggerDownload(blob, sanitizeFileName(fileName));
}

export function downloadCsv(fileName, rows) {
  const csv = `\uFEFF${rows.map((row) => row.map(toCsvCell).join(",")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, sanitizeFileName(fileName));
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toCsvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function sanitizeFileName(fileName) {
  return fileName
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}
