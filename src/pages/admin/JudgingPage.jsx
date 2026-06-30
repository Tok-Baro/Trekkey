import React from "react";
import { Bell, ClipboardCheck, FileCheck2, ListChecks, Plus, QrCode } from "lucide-react";
import { ContestScopeBar, EmptyState, PanelHeader, ProgressBar, ProgressRing, ScoreItem } from "../../components/common/CommonUi.jsx";

export function JudgingPage({
  contests,
  judgingAssignments,
  selectedContest,
  selectedContestId,
  setSelectedContestId,
  openModal,
  onBatchAssign,
  onSendReminder,
  onCalculateResults
}) {
  const contestJudges = judgingAssignments.filter((judge) => judge.contestId === selectedContestId);
  const totalAssigned = contestJudges.reduce((sum, judge) => sum + judge.assigned, 0);
  const totalCompleted = contestJudges.reduce((sum, judge) => sum + judge.completed, 0);
  const completionRate = totalAssigned ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  return (
    <div className="page-grid split-grid">
      <ContestScopeBar
        contests={contests}
        selectedContest={selectedContest}
        selectedContestId={selectedContestId}
        setSelectedContestId={setSelectedContestId}
      />

      <section className="panel workflow-main">
        <PanelHeader
          eyebrow="심사 배정"
          title={`${selectedContest.title} 심사위원`}
          action={
            <div className="action-group">
              <button className="secondary-button" type="button" onClick={() => openModal("reviewReport")}>
                <ClipboardCheck size={17} />
                평가 현황
              </button>
              <button className="secondary-button" type="button" onClick={() => openModal("reviewLink", { contest: selectedContest })}>
                <QrCode size={17} />
                링크/QR
              </button>
              <button className="secondary-button" type="button" onClick={onBatchAssign}>
                <ListChecks size={17} />
                일괄 배정
              </button>
              <button className="primary-button" type="button" onClick={() => openModal("judge")}>
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
              </div>
              <div className="judge-stats">
                <ProgressRing value={Math.round((judge.completed / judge.assigned) * 100)} />
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
            <EmptyState title="배정된 심사위원이 없습니다" description="대회 준비 단계에서 심사위원을 먼저 배정하세요." />
          )}
        </div>
      </section>

      <section className="panel">
        <PanelHeader eyebrow="평가 기준" title="점수 기준" />
        <div className="score-list">
          <ScoreItem label="창의성" value={30} />
          <ScoreItem label="구현 완성도" value={30} />
          <ScoreItem label="문제 해결성" value={25} />
          <ScoreItem label="발표 전달력" value={15} />
        </div>
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
          <button className="secondary-button" type="button" onClick={onSendReminder}>
            <Bell size={17} />
            독촉 발송
          </button>
          <button className="primary-button" type="button" onClick={onCalculateResults}>
            <FileCheck2 size={17} />
            결과 산출
          </button>
        </div>
      </section>
    </div>
  );
}
