import React, { useEffect, useMemo, useState } from "react";
import { Check, Download, Gavel, Send, ShieldCheck } from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  downloadReviewFile,
  getReviewSheet,
  submitAssignmentReview,
  verifyReviewAccess
} from "../../api/reviewBackendApi.js";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { AppFooter } from "../../components/common/AppFooter.jsx";
import { EmptyState } from "../../components/common/CommonUi.jsx";
import {
  getReviewAccessTokenFromHash,
  getReviewUrlWithoutToken,
  REVIEW_ACCESS_SESSION_KEY
} from "../../lib/reviewerAccess.js";

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR");
}

function formatFileSize(sizeBytes) {
  const size = Number(sizeBytes) || 0;
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "review-file";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isPendingAssignment(status) {
  return status === "ASSIGNED" || status === "PENDING";
}

function readSessionToken() {
  try {
    return window.sessionStorage.getItem(REVIEW_ACCESS_SESSION_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function storeSessionToken(token) {
  try {
    window.sessionStorage.setItem(REVIEW_ACCESS_SESSION_KEY, token);
    return true;
  } catch {
    return false;
  }
}

function clearSessionToken() {
  try {
    window.sessionStorage.removeItem(REVIEW_ACCESS_SESSION_KEY);
  } catch {
    // 저장소를 사용할 수 없는 브라우저에서도 현재 화면의 오류 처리는 계속한다.
  }
}

export function ServerReviewerPage() {
  const location = useLocation();
  const linkToken = useMemo(
    () => getReviewAccessTokenFromHash(location.hash),
    [location.hash]
  );
  const [sessionToken, setSessionToken] = useState(readSessionToken);
  const token = linkToken || sessionToken;
  const [access, setAccess] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState({});
  const [assignmentErrors, setAssignmentErrors] = useState({});
  const [submittingById, setSubmittingById] = useState({});
  const [downloadingById, setDownloadingById] = useState({});
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!linkToken || !storeSessionToken(linkToken)) {
      return;
    }

    setSessionToken(linkToken);
    window.history.replaceState(
      window.history.state,
      "",
      getReviewUrlWithoutToken(location.pathname, location.search)
    );
  }, [linkToken, location.pathname, location.search]);

  useEffect(() => {
    let isActive = true;

    setAccess(null);
    setSheet(null);
    setScores({});
    setComments({});
    setAssignmentErrors({});
    setLoadError("");

    if (!token) {
      setIsLoading(false);
      setLoadError("평가위원 1회용 로그인 링크에 접근 코드가 없습니다.");
      return undefined;
    }

    setIsLoading(true);
    const load = async () => {
      try {
        const verifiedAccess = await verifyReviewAccess(token);
        const reviewSheet = await getReviewSheet(token);
        if (isActive) {
          setAccess(verifiedAccess);
          setSheet(reviewSheet);
        }
      } catch (error) {
        if (isActive) {
          if (error?.status === 401 || error?.code === "REVIEW_LINK_INVALID") {
            clearSessionToken();
            setSessionToken("");
          }
          setLoadError(getApiErrorMessage(error, "1회용 로그인 링크를 확인하지 못했습니다."));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [token]);

  const updateScore = (assignmentId, criterionId, value) => {
    setScores((current) => ({
      ...current,
      [assignmentId]: {
        ...current[assignmentId],
        [criterionId]: value
      }
    }));
  };

  const submitReview = async (event, round, assignment) => {
    event.preventDefault();
    const assignmentScores = scores[assignment.assignmentId] ?? {};
    const hasMissingScore = round.criteria.some(
      (criterion) => assignmentScores[criterion.id] === undefined || assignmentScores[criterion.id] === ""
    );

    if (hasMissingScore) {
      setAssignmentErrors((current) => ({
        ...current,
        [assignment.assignmentId]: "모든 평가 기준의 점수를 입력해 주세요."
      }));
      return;
    }

    const requestedScores = round.criteria.map((criterion) => ({
      criterionId: criterion.id,
      score: Number(assignmentScores[criterion.id])
    }));
    const hasInvalidScore = requestedScores.some(({ criterionId, score }) => {
      const criterion = round.criteria.find((item) => item.id === criterionId);
      return !Number.isFinite(score) || score < 0 || score > criterion.maxScore;
    });

    if (hasInvalidScore) {
      setAssignmentErrors((current) => ({
        ...current,
        [assignment.assignmentId]: "평가 점수는 각 기준의 배점 범위 안에서 입력해 주세요."
      }));
      return;
    }

    setSubmittingById((current) => ({ ...current, [assignment.assignmentId]: true }));
    setAssignmentErrors((current) => ({ ...current, [assignment.assignmentId]: "" }));
    try {
      const result = await submitAssignmentReview(assignment.assignmentId, {
        token,
        scores: requestedScores,
        comment: comments[assignment.assignmentId]?.trim() ?? ""
      });
      setSheet((current) => ({
        ...current,
        rounds: current.rounds.map((currentRound) => ({
          ...currentRound,
          assignments: currentRound.assignments.map((currentAssignment) =>
            currentAssignment.assignmentId === assignment.assignmentId
              ? {
                  ...currentAssignment,
                  status: "COMPLETED",
                  completedAt: result.submittedAt
                }
              : currentAssignment
          )
        }))
      }));
    } catch (error) {
      setAssignmentErrors((current) => ({
        ...current,
        [assignment.assignmentId]: getApiErrorMessage(error, "심사 결과를 제출하지 못했습니다.")
      }));
    } finally {
      setSubmittingById((current) => ({ ...current, [assignment.assignmentId]: false }));
    }
  };

  const downloadFile = async (file) => {
    setDownloadingById((current) => ({ ...current, [file.fileId]: true }));
    setAssignmentErrors((current) => ({ ...current, file: "" }));
    try {
      const blob = await downloadReviewFile(file.fileId, token);
      saveBlob(blob, file.originalName);
    } catch (error) {
      setAssignmentErrors((current) => ({
        ...current,
        file: getApiErrorMessage(error, "심사 파일을 다운로드하지 못했습니다.")
      }));
    } finally {
      setDownloadingById((current) => ({ ...current, [file.fileId]: false }));
    }
  };

  if (isLoading) {
    return (
      <main className="reviewer-shell">
        <section className="reviewer-card reviewer-empty">
          <Gavel size={34} aria-hidden="true" />
          <h1>심사 평가표를 불러오는 중입니다</h1>
        </section>
        <AppFooter variant="review" />
      </main>
    );
  }

  if (loadError || !sheet) {
    return (
      <main className="reviewer-shell">
        <section className="reviewer-card reviewer-empty">
          <ShieldCheck size={34} aria-hidden="true" />
          <h1>1회용 로그인 링크를 확인할 수 없습니다</h1>
          <p>{loadError || "관리자가 전달한 최신 평가위원 링크를 다시 확인해 주세요."}</p>
        </section>
        <AppFooter variant="review" />
      </main>
    );
  }

  const reviewer = sheet ?? access;

  return (
    <main className="reviewer-shell">
      <section className="reviewer-hero">
        <div className="reviewer-brand">
          <div className="brand-mark">
            <Gavel size={22} aria-hidden="true" />
          </div>
          <div>
            <strong>Trekkey Review</strong>
            <span>계정 없는 평가위원 전용 페이지</span>
          </div>
        </div>
        <div>
          <h1>{reviewer.contestTitle}</h1>
          <p>{reviewer.judgeName} · {reviewer.roleLabel || "심사위원"} · 만료 {formatDateTime(reviewer.tokenExpiresAt)}</p>
        </div>
      </section>

      {assignmentErrors.file && <p className="form-message">{assignmentErrors.file}</p>}

      <section className="review-main">
        {sheet.rounds?.map((round) => (
          <section className="reviewer-card" key={round.reviewRoundId}>
            <div className="review-main-head">
              <div>
                <span className="section-kicker">{round.roundNo}차 심사</span>
                <h2>{round.roundName}</h2>
                <p>{formatDateTime(round.startsAt)} ~ {formatDateTime(round.endsAt)}</p>
              </div>
              <div className="score-list">
                {round.criteria.map((criterion) => (
                  <span key={criterion.id}>{criterion.label} {criterion.maxScore}점</span>
                ))}
              </div>
            </div>

            <div className="review-submission-list">
              {round.assignments.map((assignment) => {
                const isPending = isPendingAssignment(assignment.status);
                const assignmentScores = scores[assignment.assignmentId] ?? {};
                const totalScore = round.criteria.reduce(
                  (sum, criterion) => sum + Number(assignmentScores[criterion.id] || 0),
                  0
                );

                return (
                  <form
                    className="review-submission"
                    key={assignment.assignmentId}
                    onSubmit={(event) => submitReview(event, round, assignment)}
                  >
                    <div className="review-submission-head">
                      <div>
                        <strong>{assignment.submissionTitle}</strong>
                        <span>{assignment.submissionPublicId} · 마감 {formatDateTime(assignment.dueAt)}</span>
                      </div>
                      {assignment.status === "COMPLETED" ? (
                        <b><Check size={16} aria-hidden="true" /> 심사 완료</b>
                      ) : (
                        <b>{isPending ? `${totalScore}점` : "배정 취소"}</b>
                      )}
                    </div>

                    {assignment.files?.length > 0 && (
                      <div className="score-list">
                        {assignment.files.map((file) => (
                          <button
                            className="secondary-button"
                            key={file.fileId}
                            type="button"
                            disabled={Boolean(downloadingById[file.fileId])}
                            onClick={() => downloadFile(file)}
                          >
                            <Download size={15} aria-hidden="true" />
                            {downloadingById[file.fileId] ? "다운로드 중..." : `${file.originalName} (${formatFileSize(file.sizeBytes)})`}
                          </button>
                        ))}
                      </div>
                    )}

                    {isPending && (
                      <>
                        <div className="score-input-grid">
                          {round.criteria.map((criterion) => (
                            <label key={criterion.id}>
                              <span>{criterion.label} / {criterion.maxScore}점</span>
                              <input
                                type="number"
                                min="0"
                                max={criterion.maxScore}
                                step="0.01"
                                value={assignmentScores[criterion.id] ?? ""}
                                onChange={(event) => updateScore(
                                  assignment.assignmentId,
                                  criterion.id,
                                  event.target.value
                                )}
                                required
                              />
                            </label>
                          ))}
                        </div>
                        <label>
                          <span>심사 의견</span>
                          <textarea
                            value={comments[assignment.assignmentId] ?? ""}
                            onChange={(event) => setComments((current) => ({
                              ...current,
                              [assignment.assignmentId]: event.target.value
                            }))}
                            placeholder="심사 의견을 입력해 주세요."
                          />
                        </label>
                        {assignmentErrors[assignment.assignmentId] && (
                          <p className="form-message">{assignmentErrors[assignment.assignmentId]}</p>
                        )}
                        <button
                          className="primary-button"
                          type="submit"
                          disabled={Boolean(submittingById[assignment.assignmentId])}
                        >
                          <Send size={17} aria-hidden="true" />
                          {submittingById[assignment.assignmentId] ? "제출 중..." : "심사 제출"}
                        </button>
                      </>
                    )}

                    {assignment.status === "COMPLETED" && (
                      <p className="form-message">제출 {formatDateTime(assignment.completedAt)}</p>
                    )}
                  </form>
                );
              })}
              {round.assignments.length === 0 && (
                <EmptyState title="배정된 제출물이 없습니다" description="관리자가 심사 대상을 배정하면 이 영역에 표시됩니다." />
              )}
            </div>
          </section>
        ))}

        {(!sheet.rounds || sheet.rounds.length === 0) && (
          <section className="reviewer-card">
            <EmptyState title="진행 중인 심사가 없습니다" description="배정된 심사가 열리면 평가표가 표시됩니다." />
          </section>
        )}
      </section>
      <AppFooter variant="review" />
    </main>
  );
}
