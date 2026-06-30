export const SUBMISSION_FILE_ACCEPT =
  ".pdf,.ppt,.pptx,.doc,.docx,.hwp,.hwpx,.zip,.mp4,.mov,.avi,.png,.jpg,.jpeg";

export function createSubmissionFileMeta(file, index = 0) {
  const extension = getFileExtension(file.name);

  return {
    id: `FILE-${Date.now()}-${index}-${slugifyFileName(file.name)}`,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    extension,
    lastModified: file.lastModified,
    uploadStatus: "ready",
    storageKey: null,
    checksum: null
  };
}

export function getSubmissionFileCount(submission) {
  if (Array.isArray(submission.attachments) && submission.attachments.length > 0) {
    return submission.attachments.length;
  }

  return Number(submission.files || 0);
}

export function getSubmissionFileSummary(submission) {
  const attachments = Array.isArray(submission.attachments) ? submission.attachments : [];

  if (!attachments.length) {
    const count = getSubmissionFileCount(submission);
    return count ? "파일 메타데이터 없음" : "파일 없음";
  }

  const [firstFile, ...rest] = attachments;
  return rest.length ? `${firstFile.name} 외 ${rest.length}개` : firstFile.name;
}

export function formatFileSize(size) {
  const bytes = Number(size || 0);

  if (bytes < 1024) {
    return `${bytes}B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function buildSubmissionUploadPayload({ contestId, submissionId, files }) {
  return {
    endpoint: `/api/contests/${contestId}/submissions/${submissionId}/files`,
    method: "POST",
    fieldName: "files",
    accept: SUBMISSION_FILE_ACCEPT,
    files,
    metadata: files.map(createSubmissionFileMeta)
  };
}

function getFileExtension(fileName = "") {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.at(-1).toLowerCase() : "";
}

function slugifyFileName(fileName) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
