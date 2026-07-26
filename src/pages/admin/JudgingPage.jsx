import React, { useEffect, useMemo, useState } from "react";
import { Bell, ClipboardCheck, FileCheck2, ListChecks, Plus, QrCode, Settings2 } from "lucide-react";
import { ContestScopeBar, EmptyState, PanelHeader, ProgressBar, ProgressRing } from "../../components/common/CommonUi.jsx";
import {
  getRoundScoreCriteria,
  isRecordInRound,
  normalizeEvaluationRounds,
  passRuleLabels,
  roundTargetLabels
} from "../../lib/review.js";

export function JudgingPage({
  contests,
  judgingAssignments,
  submissions = [],
  reviewScores = [],
  selectedContest,
  selectedContestId,
  setSelectedContestId,
  openModal,
  onBatchAssign,
  onSendReminder,
  onCalculateResults
}) {
  const rounds = useMemo(
    () => normalizeEvaluationRounds(selectedContest.evaluationRounds, selectedContestId),
    [selectedContest.evaluationRounds, selectedContestId]
  );
  const [activeRoundId, setActiveRoundId] = useState(rounds[0]?.id);
  const activeRound = rounds.find((round) => round.id === activeRoundId) ?? rounds[0];
  const scoreCriteria = useMemo(() => getRoundScoreCriteria(activeRound), [activeRound]);
  const contestSubmissions = submissions.filter((submission) => submission.contestId === selectedContestId);
  const contestReviewScores = reviewScores.filter(
    (record) => record.contestId === selectedContestId && isRecordInRound(record, activeRound, selectedContest)
  );
  const contestJudges = judgingAssignments.filter(
    (judge) => judge.contestId === selectedContestId && isRecordInRound(judge, activeRound, selectedContest)
  );
  const totalAssigned = contestJudges.reduce((sum, judge) => sum + judge.assigned, 0);
  const totalCompleted = contestJudges.reduce((sum, judge) => sum + judge.completed, 0);
  const completionRate = totalAssigned ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  useEffect(() => {
    setActiveRoundId(rounds[0]?.id);
  }, [rounds[0]?.id, selectedContestId]);

  return (
    <div className="page-grid split-grid">
      <ContestScopeBar
        contests={contests}
        selectedContest={selectedContest}
        selectedContestId={selectedContestId}
        setSelectedContestId={setSelectedContestId}
      />

      <section className="panel wide round-panel">
        <PanelHeader
          eyebrow="평가 방식"
          title="평가 라운드"
          action={
            <button className="secondary-button" type="button" onClick={() => openModal("contest", { contest: selectedContest, initialStepId: "evaluation" })}>
              <Settings2 size={17} />
              라운드 설정
            </button>
          }
        />
        <div className="round-tabs" role="tablist" aria-label="평가 라운드 선택">
          {rounds.map((round) => (
            <button
              className={round.id === activeRound.id ? "active" : ""}
              key={round.id}
              type="button"
              role="tab"
              aria-selected={round.id === activeRound.id}
              onClick={() => setActiveRoundId(round.id)}
            >
              <strong>{round.name}</strong>
              <span>{round.status}</span>
            </button>
          ))}
        </div>
        <div className="round-summary-grid" aria-label={`${activeRound.name} 운영 요약`}>
          <RoundSummaryItem label="평가 대상" value={roundTargetLabels[activeRound.targetType] ?? "전체 제출팀"} meta={`${contestSubmissions.length}개 제출물 기준`} />
          <RoundSummaryItem label="통과 방식" value={passRuleLabels[activeRound.passRule] ?? "관리자 확정"} meta={getPassMeta(activeRound)} />
          <RoundSummaryItem label="심사위원" value={`${contestJudges.length}명`} meta={`${totalCompleted}/${totalAssigned || 0}건 완료`} />
          <RoundSummaryItem label="평가 기록" value={`${contestReviewScores.length}건`} meta={`${scoreCriteria.reduce((sum, item) => sum + item.value, 0)}점 기준`} />
        </div>
      </section>

      <section className="panel workflow-main">
        <PanelHeader
          eyebrow={activeRound.name}
          title="심사위원"
          action={
            <div className="action-group">
              <button className="secondary-button" type="button" onClick={() => openModal("reviewReport", { round: activeRound })}>
                <ClipboardCheck size={17} />
                평가 현황
              </button>
              <button className="secondary-button" type="button" onClick={() => openModal("reviewLink", { contest: selectedContest, round: activeRound })}>
                <QrCode size={17} />
                링크/QR
              </button>
              <button className="secondary-button" type="button" onClick={() => onBatchAssign(activeRound.id)}>
                <ListChecks size={17} />
                일괄 배정
              </button>
              <button className="secondary-button" type="button" onClick={() => openModal("judge", { roundId: activeRound.id })}>
                <Plus size={17} />
                심사위원
              </button>
            </div>
          }
        />
        <div className="judge-grid">
          {contestJudges.map((judge) => (
            <article className="judge-card" key={judge.id} onClick={() => openModal("judgeDetail", { judge })}>
              <div className="judge-avatar">{judge.name.slice(0, 1)}</div>
              <div className="judge-main">
                <strong>{judge.name}</strong>
                <span>{judge.role}</span>
                {judge.reminderSentAt && <small>독촉 {judge.reminderSentAt}</small>}
              </div>
              <div className="judge-stats">
                <ProgressRing value={judge.assigned ? Math.round((judge.completed / judge.assigned) * 100) : 0} />
                <div>
                  <b>
                    {judge.completed}/{judge.assigned}
                  </b>
                  <span>평균 {judge.avgScore}</span>
                </div>
              </div>
            </article>
          ))}
          {contestJudges.length === 0 && (
            <EmptyState title="배정된 심사위원이 없습니다" description={`${activeRound.name} 라운드에 심사위원을 배정하세요.`} />
          )}
        </div>
      </section>

      <section className="panel">
        <PanelHeader eyebrow="평가 기준" title="점수 기준" />
        <ScoreRubricChart items={scoreCriteria} />
      </section>

      <section className="panel">
        <PanelHeader eyebrow="진행 상태" title="심사 진행률" />
        <div className="large-stat">
          <strong>{completionRate}%</strong>
          <span>
            {totalAssigned}건 중 {totalCompleted}건 완료
          </span>
          <ProgressBar value={completionRate} />
        </div>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={() => onSendReminder(activeRound.id)}>
            <Bell size={17} />
            독촉 발송
          </button>
          <button className="primary-button" type="button" onClick={() => onCalculateResults(activeRound.id)}>
            <FileCheck2 size={17} />
            결과 산출
          </button>
        </div>
      </section>
    </div>
  );
}

function RoundSummaryItem({ label, value, meta }) {
  return (
    <div className="round-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
    </div>
  );
}

function getPassMeta(round) {
  if (round.passRule === "top-n" && round.passCount) {
    return `${round.passCount}팀 진출`;
  }

  if (round.passRule === "score-min" && round.minScore) {
    return `${round.minScore}점 이상`;
  }

  if (round.passRule === "final") {
    return "수상 확정 기준";
  }

  return "결과 확인 후 확정";
}

function ScoreRubricChart({ items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const gradient = items
    .map((item) => {
      const start = cursor;
      const end = cursor + (item.value / total) * 360;
      cursor = end;
      return `${item.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="score-rubric">
      <div className="score-donut" style={{ background: `conic-gradient(${gradient})` }} aria-label={`총 ${total}점 배점 기준`}>
        <div>
          <strong>{total}</strong>
          <span>점 기준</span>
        </div>
      </div>
      <div className="score-legend">
        {items.map((item) => (
          <div className="score-legend-item" key={item.label}>
            <span className="score-swatch" style={{ background: item.color }} />
            <strong>{item.label}</strong>
            <b>{item.value}점</b>
          </div>
        ))}
      </div>
    </div>
  );
}
