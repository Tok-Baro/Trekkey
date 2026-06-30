import React, { useMemo, useState } from "react";
import { Check, Gavel, Send, ShieldCheck } from "lucide-react";
import { EmptyState, ScoreItem } from "../../components/common/CommonUi.jsx";
import { reviewCriteria } from "../../lib/review.js";

export function ReviewerPage({ contestId, contests, judgingAssignments, submissions, onSubmitReview }) {
  const contest = contests.find((item) => item.id === contestId);
  const contestJudges = judgingAssignments.filter((judge) => judge.contestId === contestId);
  const contestSubmissions = submissions.filter((submission) => submission.contestId === contestId);
  const [judgeName, setJudgeName] = useState("");
  const [activeJudgeName, setActiveJudgeName] = useState("");
  const [scores, setScores] = useState({});
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const activeJudge = contestJudges.find((judge) => judge.name === activeJudgeName);
  const assignedSubmissions = useMemo(() => {
    if (!activeJudge) {
      return [];
    }

    const pendingCount = Math.max(activeJudge.assigned - activeJudge.completed, 0);
    return contestSubmissions.slice(0, pendingCount || Math.min(activeJudge.assigned, contestSubmissions.length));
  }, [activeJudge, contestSubmissions]);

  if (!contest) {
    return (
      <main className="reviewer-shell">
        <section className="reviewer-card reviewer-empty">
          <ShieldCheck size={34} aria-hidden="true" />
          <h1>심사 링크를 찾을 수 없습니다</h1>
          <p>관리자가 전달한 최신 링크 또는 QR을 다시 확인하세요.</p>
        </section>
      </main>
    );
  }

  const startReview = (event) => {
    event.preventDefault();
    const trimmedName = judgeName.trim();
    const matchedJudge = contestJudges.find((judge) => judge.name === trimmedName);

    if (!matchedJudge) {
      setMessage("등록된 심사위원 이름과 일치하지 않습니다.");
      return;
    }

    const pendingCount = Math.max(matchedJudge.assigned - matchedJudge.completed, 0);
    const initialTargets = contestSubmissions.slice(0, pendingCount || Math.min(matchedJudge.assigned, contestSubmissions.length));
    const initialScores = initialTargets.reduce((acc, submission) => {
      acc[submission.id] = reviewCriteria.reduce((criteriaAcc, item) => {
        criteriaAcc[item.id] = "";
        return criteriaAcc;
      }, {});
      return acc;
    }, {});

    setScores(initialScores);
    setActiveJudgeName(trimmedName);
    setMessage("");
  };

  const updateScore = (submissionId, criterionId, value) => {
    const criterion = reviewCriteria.find((item) => item.id === criterionId);
    const numericValue = value === "" ? "" : Math.max(0, Math.min(criterion?.max ?? 100, Number(value)));
    setScores((current) => ({
      ...current,
      [submissionId]: {
        ...current[submissionId],
        [criterionId]: numericValue
      }
    }));
  };

  const getSubmissionTotal = (submissionId) =>
    reviewCriteria.reduce((sum, item) => sum + Number(scores[submissionId]?.[item.id] || 0), 0);

  const submitReview = (event) => {
    event.preventDefault();
    const hasMissingScore = assignedSubmissions.some((submission) =>
      reviewCriteria.some((item) => scores[submission.id]?.[item.id] === "")
    );

    if (hasMissingScore) {
      setMessage("모든 평가 항목의 점수를 입력해야 제출할 수 있습니다.");
      return;
    }

    const averageScore = assignedSubmissions.length
      ? Number(
          (
            assignedSubmissions.reduce((sum, submission) => sum + getSubmissionTotal(submission.id), 0) /
            assignedSubmissions.length
          ).toFixed(1)
        )
      : activeJudge.avgScore;
    const records = assignedSubmissions.map((submission) => ({
      contestId,
      judgeName: activeJudge.name,
      submissionId: submission.id,
      scores: reviewCriteria.reduce((acc, criterion) => {
        acc[criterion.id] = Number(scores[submission.id]?.[criterion.id] || 0);
        return acc;
      }, {}),
      submittedAt: "방금 전"
    }));

    onSubmitReview({
      contestId,
      judgeName: activeJudge.name,
      reviewedCount: activeJudge.completed + assignedSubmissions.length,
      averageScore,
      records
    });
    setIsSubmitted(true);
    setMessage("");
  };

  return (
    <main className="reviewer-shell">
      <section className="reviewer-hero">
        <div className="reviewer-brand">
          <div className="brand-mark">
            <Gavel size={22} aria-hidden="true" />
          </div>
          <div>
            <strong>Trekkey Review</strong>
            <span>심사위원 전용 페이지</span>
          </div>
        </div>
        <div>
          <h1>{contest.title}</h1>
          <p>
            {contest.department} · 제출 마감 {contest.submissionDue}
          </p>
        </div>
      </section>

      {!activeJudge && (
        <section className="reviewer-card reviewer-login">
          <div>
            <span className="section-kicker">본인 확인</span>
            <h2>심사위원 이름을 입력하세요</h2>
            <p>관리자가 등록한 이름과 일치하면 배정된 제출물 평가 화면이 열립니다.</p>
          </div>
          <form className="reviewer-login-form" onSubmit={startReview}>
            <label>
              <span>이름</span>
              <input value={judgeName} onChange={(event) => setJudgeName(event.target.value)} placeholder="예: 강예린" />
            </label>
            {message && <p className="form-message">{message}</p>}
            <button className="primary-button" type="submit">
              <Gavel size={17} />
              심사 시작
            </button>
          </form>
        </section>
      )}

      {activeJudge && isSubmitted && (
        <section className="reviewer-card reviewer-empty">
          <Check size={36} aria-hidden="true" />
          <h2>심사 제출 완료</h2>
          <p>{activeJudge.name} 심사위원의 평가 결과가 접수되었습니다.</p>
        </section>
      )}

      {activeJudge && !isSubmitted && (
        <form className="review-workspace" onSubmit={submitReview}>
          <aside className="reviewer-card review-sidebar">
            <div className="judge-avatar">{activeJudge.name.slice(0, 1)}</div>
            <div>
              <strong>{activeJudge.name}</strong>
              <span>{activeJudge.role}</span>
            </div>
            <dl className="reviewer-meta">
              <div>
                <dt>배정</dt>
                <dd>{activeJudge.assigned}건</dd>
              </div>
              <div>
                <dt>완료</dt>
                <dd>{activeJudge.completed}건</dd>
              </div>
              <div>
                <dt>이번 심사</dt>
                <dd>{assignedSubmissions.length}건</dd>
              </div>
            </dl>
            <div className="score-list">
              {reviewCriteria.map((item) => (
                <ScoreItem key={item.id} label={item.label} value={item.max} />
              ))}
            </div>
          </aside>

          <section className="review-main">
            <div className="review-main-head">
              <div>
                <span className="section-kicker">평가 대상</span>
                <h2>제출물 심사</h2>
              </div>
              <button className="primary-button" type="submit">
                <Send size={17} />
                심사 제출
              </button>
            </div>
            {message && <p className="form-message">{message}</p>}
            <div className="review-submission-list">
              {assignedSubmissions.map((submission) => (
                <article className="review-submission" key={submission.id}>
                  <div className="review-submission-head">
                    <div>
                      <strong>{submission.title}</strong>
                      <span>
                        {submission.team} · {submission.id} · 파일 {submission.files}개
                      </span>
                    </div>
                    <b>{getSubmissionTotal(submission.id)}점</b>
                  </div>
                  <div className="score-input-grid">
                    {reviewCriteria.map((item) => (
                      <label key={item.id}>
                        <span>{item.label}</span>
                        <input
                          type="number"
                          min="0"
                          max={item.max}
                          value={scores[submission.id]?.[item.id] ?? ""}
                          onChange={(event) => updateScore(submission.id, item.id, event.target.value)}
                          placeholder={`${item.max}`}
                        />
                      </label>
                    ))}
                  </div>
                </article>
              ))}
              {assignedSubmissions.length === 0 && (
                <EmptyState title="심사할 제출물이 없습니다" description="관리자가 제출물 배정을 완료하면 이 영역에 표시됩니다." />
              )}
            </div>
          </section>
        </form>
      )}
    </main>
  );
}
