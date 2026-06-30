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
    checksum: null,
    downloadUrl: null,
    objectUrl: createLocalObjectUrl(file)
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

export function downloadSubmissionFiles(submission) {
  const fileCount = getSubmissionFileCount(submission);

  if (!fileCount) {
    return {
      ok: false,
      message: "다운로드할 제출 파일이 없습니다."
    };
  }

  if (submission.bundleDownloadUrl) {
    triggerDownload(submission.bundleDownloadUrl, `${getSubmissionDownloadBaseName(submission)}.zip`);
    return {
      ok: true,
      message: "제출물 묶음 다운로드를 시작했습니다."
    };
  }

  const attachments = getNormalizedAttachments(submission);
  const downloadableFiles = attachments.filter((file) => getAttachmentDownloadUrl(file));

  if (downloadableFiles.length > 0) {
    downloadableFiles.forEach((file, index) => {
      window.setTimeout(() => {
        triggerDownload(getAttachmentDownloadUrl(file), file.name || `${getSubmissionDownloadBaseName(submission)}-${index + 1}`);
      }, index * 120);
    });

    if (downloadableFiles.length === fileCount) {
      return {
        ok: true,
        message: fileCount > 1 ? `${fileCount}개 파일 다운로드를 시작했습니다.` : "제출 파일 다운로드를 시작했습니다."
      };
    }
  }

  downloadSubmissionManifest(submission, attachments);
  return {
    ok: true,
    message: downloadableFiles.length
      ? "다운로드 가능한 파일을 받고, 나머지는 다운로드 요청 파일로 저장했습니다."
      : "백엔드 파일 연결 전이라 다운로드 요청 파일을 저장했습니다."
  };
}

export function getSubmissionDownloadBaseName(submission) {
  return slugifyFileName(`${submission.id || "submission"}-${submission.team || "team"}-${submission.title || "files"}`) || "submission-files";
}

function getFileExtension(fileName = "") {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.at(-1).toLowerCase() : "";
}

function createLocalObjectUrl(file) {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return null;
  }

  return URL.createObjectURL(file);
}

function getNormalizedAttachments(submission) {
  const attachments = Array.isArray(submission.attachments) ? submission.attachments : [];

  if (attachments.length > 0) {
    return attachments;
  }

  return Array.from({ length: getSubmissionFileCount(submission) }, (_, index) => ({
    id: `${submission.id || "SUBMISSION"}-FILE-${index + 1}`,
    name: `${getSubmissionDownloadBaseName(submission)}-${index + 1}`,
    size: 0,
    type: "application/octet-stream",
    uploadStatus: "metadata-missing",
    storageKey: null,
    downloadUrl: null
  }));
}

function getAttachmentDownloadUrl(file) {
  return file.downloadUrl || file.url || file.objectUrl || null;
}

function downloadSubmissionManifest(submission, attachments) {
  const payload = {
    type: "trekkey-submission-download-request",
    submissionId: submission.id,
    contestId: submission.contestId,
    team: submission.team,
    title: submission.title,
    files: attachments.map((file, index) => ({
      id: file.id || `${submission.id}-FILE-${index + 1}`,
      name: file.name || `file-${index + 1}`,
      size: file.size || 0,
      type: file.type || "application/octet-stream",
      extension: file.extension || getFileExtension(file.name),
      uploadStatus: file.uploadStatus || submission.uploadStatus || "metadata-only",
      storageKey: file.storageKey || null,
      checksum: file.checksum || null,
      downloadUrl: file.downloadUrl || null
    })),
    expectedBackendEndpoint: `/api/contests/${submission.contestId}/submissions/${submission.id}/files/download`
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  triggerDownload(url, `${getSubmissionDownloadBaseName(submission)}-download-request.json`);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function triggerDownload(url, fileName) {
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function slugifyFileName(fileName) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
