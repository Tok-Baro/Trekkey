import React, { useState } from "react";
import { Check, CircleAlert, Filter, MoreHorizontal, X } from "lucide-react";
import { ContestScopeBar, EmptyState, FlowStep, IconButton, PanelHeader, RuleItem, SegmentedControl, StatusBadge } from "../../components/common/CommonUi.jsx";
import { getContestTitle } from "../../lib/contest.js";

export function TeamsPage({
  contests,
  teams,
  selectedContest,
  selectedContestId,
  setSelectedContestId,
  openModal,
  onUpdateTeamStatus
}) {
  const [selectedStatus, setSelectedStatus] = useState("전체");
  const [revisionTargetId, setRevisionTargetId] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [updatingTeamId, setUpdatingTeamId] = useState("");
  const contestTeams = teams.filter((team) => team.contestId === selectedContestId);
  const visibleTeams =
    selectedStatus === "전체" ? contestTeams : contestTeams.filter((team) => team.status === selectedStatus);

  return (
    <div className="page-grid">
      <ContestScopeBar
        contests={contests}
        selectedContest={selectedContest}
        selectedContestId={selectedContestId}
        setSelectedContestId={setSelectedContestId}
      />

      <section className="panel wide">
        <PanelHeader
          eyebrow="참가 접수"
          title={`${selectedContest.title} 참가 신청`}
          action={
            <div className="action-group">
              <SegmentedControl
                options={["전체", "검토중", "승인", "보완요청", "반려"]}
                value={selectedStatus}
                onChange={setSelectedStatus}
              />
              <button className="secondary-button" type="button" onClick={() => openModal("teamFilter")}>
                <Filter size={17} />
                조건
              </button>
            </div>
          }
        />
        <div className="team-board">
          {visibleTeams.map((team) => (
            <article className="team-card" key={team.id}>
              <div className="team-card-head">
                <div>
                  <strong>{team.name}</strong>
                  <span>{team.teamPublicId ?? "공개 ID 미발급"}</span>
                </div>
                <StatusBadge status={team.status} />
              </div>
              <dl className="compact-list">
                <div>
                  <dt>대회</dt>
                  <dd>{getContestTitle(team.contestId, contests)}</dd>
                </div>
                <div>
                  <dt>대표</dt>
                  <dd>{team.leader}</dd>
                </div>
                <div>
                  <dt>소속</dt>
                  <dd>{team.major}</dd>
                </div>
                <div>
                  <dt>팀원</dt>
                  <dd>{team.members}명</dd>
                </div>
              </dl>
              <div className="team-card-foot">
                <span className={team.submitted ? "inline-state ok" : "inline-state muted"}>
                  {team.submitted ? "제출 완료" : "제출 전"}
                </span>
                <div className="icon-row">
                  <IconButton
                    label="승인"
                    disabled={!team.teamPublicId || Boolean(team.participationFinalizedAt) || Boolean(updatingTeamId)}
                    onClick={async () => {
                      setUpdatingTeamId(team.id);
                      try {
                        if (await onUpdateTeamStatus(team.teamPublicId, "승인")) {
                          setRevisionTargetId("");
                          setRevisionReason("");
                        }
                      } finally {
                        setUpdatingTeamId("");
                      }
                    }}
                  >
                    <Check size={17} />
                  </IconButton>
                  <IconButton
                    label="보완 요청"
                    disabled={!team.teamPublicId || Boolean(team.participationFinalizedAt) || Boolean(updatingTeamId)}
                    onClick={() => {
                      setRevisionTargetId(team.id);
                      setRevisionReason(team.revisionReason ?? "");
                    }}
                  >
                    <CircleAlert size={17} />
                  </IconButton>
                  <IconButton
                    label="반려"
                    disabled={!team.teamPublicId || Boolean(team.participationFinalizedAt) || Boolean(updatingTeamId)}
                    onClick={async () => {
                      setUpdatingTeamId(team.id);
                      try {
                        if (await onUpdateTeamStatus(team.teamPublicId, "반려")) {
                          setRevisionTargetId("");
                          setRevisionReason("");
                        }
                      } finally {
                        setUpdatingTeamId("");
                      }
                    }}
                  >
                    <X size={17} />
                  </IconButton>
                  <IconButton label="더 보기" onClick={() => openModal("teamDetail", { team, contest: selectedContest })}>
                    <MoreHorizontal size={17} />
                  </IconButton>
                </div>
              </div>
              {team.teamPublicId && revisionTargetId === team.id && (
                <form
                  className="team-revision-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const reason = revisionReason.trim();
                    if (!reason) {
                      return;
                    }
                    setUpdatingTeamId(team.id);
                    try {
                      if (await onUpdateTeamStatus(team.teamPublicId, "보완요청", reason)) {
                        setRevisionTargetId("");
                        setRevisionReason("");
                      }
                    } finally {
                      setUpdatingTeamId("");
                    }
                  }}
                >
                  <label htmlFor={`revision-reason-${team.id}`}>보완 요청 사유</label>
                  <textarea
                    id={`revision-reason-${team.id}`}
                    value={revisionReason}
                    onChange={(event) => setRevisionReason(event.target.value)}
                    maxLength={500}
                    placeholder="참가자가 확인할 수 있도록 수정할 내용을 적어주세요."
                    required
                  />
                  <div className="team-revision-actions">
                    <span>{revisionReason.length}/500</span>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => {
                        setRevisionTargetId("");
                        setRevisionReason("");
                      }}
                      disabled={updatingTeamId === team.id}
                    >
                      취소
                    </button>
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={!revisionReason.trim() || updatingTeamId === team.id}
                    >
                      {updatingTeamId === team.id ? "처리 중..." : "보완 요청"}
                    </button>
                  </div>
                </form>
              )}
            </article>
          ))}
          {visibleTeams.length === 0 && (
            <EmptyState title="표시할 참가 신청이 없습니다" description="대회 신청이 접수되면 팀 카드가 표시됩니다." />
          )}
        </div>
      </section>

      <section className="panel">
        <PanelHeader eyebrow="정책" title="팀 관리 정책" />
        <div className="rule-list">
          <RuleItem label="최대 팀원 수" value="5명" />
          <RuleItem label="중복 신청" value="대회별 1회" />
          <RuleItem label="대표자 변경" value="마감 전 허용" />
          <RuleItem label="소속 확인" value="학번 기반" />
        </div>
      </section>

      <section className="panel">
        <PanelHeader eyebrow="승인 단계" title="승인 흐름" />
        <div className="vertical-flow">
          <FlowStep active label="신청 접수" />
          <FlowStep active label="학생 정보 확인" />
          <FlowStep active label="서류 검토" />
          <FlowStep label="참가 승인" />
        </div>
      </section>
    </div>
  );
}
