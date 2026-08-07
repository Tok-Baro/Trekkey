import React, { useMemo, useState } from "react";
import { Award, Download, Search, Trophy } from "lucide-react";
import { ChecklistItem, ContestScopeBar, EmptyState, PanelHeader, SortableTh, StatusBadge } from "../../components/common/CommonUi.jsx";
import { sortRecords, toggleSortState } from "../../lib/sort.js";

export function AwardsPage({
  contests,
  awardCandidates,
  selectedContest,
  selectedContestId,
  setSelectedContestId,
  openModal,
  onExport
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "", direction: "asc" });
  const contestAwards = awardCandidates.filter((candidate) => candidate.contestId === selectedContestId);
  const filteredAwards = contestAwards.filter((candidate) => {
    const searchable = `${candidate.rank} ${candidate.prize} ${candidate.team} ${candidate.score} ${candidate.status}`.toLowerCase();
    return !query.trim() || searchable.includes(query.trim().toLowerCase());
  });
  const visibleAwards = useMemo(() => sortRecords(filteredAwards, sort), [filteredAwards, sort]);
  const toggleSort = (key) => setSort((current) => toggleSortState(current, key));
  const topCandidate = contestAwards[0];
  const pendingAwardCount = contestAwards.filter((candidate) => candidate.status === "확정대기").length;

  return (
    <div className="page-grid split-grid">
      <ContestScopeBar
        contests={contests}
        selectedContest={selectedContest}
        selectedContestId={selectedContestId}
        setSelectedContestId={setSelectedContestId}
      />

      <section className="panel">
        <PanelHeader
          eyebrow="수상 처리"
          title={`${selectedContest.title} 수상 후보`}
          action={
            <div className="action-group">
              <button className="secondary-button" type="button" onClick={() => onExport("수상 명단")}>
                <Download size={17} />
                명단
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={pendingAwardCount === 0}
                onClick={() => openModal("confirmAwards", { count: pendingAwardCount })}
              >
                <Award size={17} />
                확정
              </button>
            </div>
          }
        />
        <div className="table-utility-row">
          <label className="search-box">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              placeholder="상격, 팀, 상태 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <span>{visibleAwards.length}건 표시</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortableTh label="순위" sortKey="rank" sort={sort} onSort={toggleSort} />
                <SortableTh label="상격" sortKey="prize" sort={sort} onSort={toggleSort} />
                <SortableTh label="팀" sortKey="team" sort={sort} onSort={toggleSort} />
                <SortableTh label="점수" sortKey="score" sort={sort} onSort={toggleSort} />
                <th>인원</th>
                <SortableTh label="상태" sortKey="status" sort={sort} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {visibleAwards.map((candidate) => (
                <tr key={`${candidate.rank}-${candidate.team}`} onClick={() => openModal("awardDetail", { candidate })}>
                  <td data-label="순위">
                    <span className="rank-badge">{candidate.rank}</span>
                  </td>
                  <td data-label="상격">
                    <strong>{candidate.prize}</strong>
                  </td>
                  <td data-label="팀">{candidate.team}</td>
                  <td data-label="점수">{candidate.score}</td>
                  <td data-label="인원">{candidate.members}명</td>
                  <td data-label="상태">
                    <StatusBadge status={candidate.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleAwards.length === 0 && (
            <EmptyState
              title={contestAwards.length ? "검색 결과가 없습니다" : "수상 후보가 없습니다"}
              description={contestAwards.length ? "검색어를 조정해 주세요." : "심사 결과 산출 후 이 대회의 수상 후보가 표시됩니다."}
            />
          )}
        </div>
      </section>

      <section className="panel detail-panel">
        <PanelHeader eyebrow="발급 점검" title="발급 준비" />
        <div className="certificate-preview">
          <div className="certificate-ribbon">
            <Trophy size={28} aria-hidden="true" />
          </div>
          <strong>{topCandidate ? `상장번호 ${topCandidate.certificateNo}` : "상장번호 미발급"}</strong>
          <span>{topCandidate ? `${topCandidate.prize} · ${topCandidate.team}` : selectedContest.title}</span>
        </div>
        <div className="checklist">
          <ChecklistItem done label="심사 점수 잠금" meta="평균 및 동점 기준 확인" />
          <ChecklistItem done label="수상자 학적 확인" meta="재학 상태 기준" />
          <ChecklistItem label="상장 번호 발급" meta="담당부서 승인 필요" />
          <ChecklistItem label="검증 메타데이터 생성" meta="블록체인 연동 예정" />
        </div>
      </section>
    </div>
  );
}
