import React, { useState } from "react";
import { Check, CircleAlert, Filter, MoreHorizontal } from "lucide-react";
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
                options={["전체", "검토중", "승인", "보완요청"]}
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
                  <span>{team.id}</span>
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
                  <IconButton label="승인" onClick={() => onUpdateTeamStatus(team.id, "승인")}>
                    <Check size={17} />
                  </IconButton>
                  <IconButton label="보완 요청" onClick={() => onUpdateTeamStatus(team.id, "보완요청")}>
                    <CircleAlert size={17} />
                  </IconButton>
                  <IconButton label="더 보기" onClick={() => openModal("teamDetail", { team, contest: selectedContest })}>
                    <MoreHorizontal size={17} />
                  </IconButton>
                </div>
              </div>
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
