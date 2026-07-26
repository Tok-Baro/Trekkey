import React, { useMemo, useState } from "react";
import { Download, LockKeyhole, Search, Upload } from "lucide-react";
import { ChecklistItem, ContestScopeBar, EmptyState, PanelHeader, SortableTh, StatusBadge } from "../../components/common/CommonUi.jsx";
import { sortRecords, toggleSortState } from "../../lib/sort.js";
import { downloadSubmissionFiles, getSubmissionFileCount, getSubmissionFileSummary } from "../../lib/submissionFiles.js";

export function SubmissionsPage({
  contests,
  submissions,
  teams,
  selectedContest,
  selectedContestId,
  setSelectedContestId,
  openModal,
  onExport,
  onGenerateHashes,
  onNotify
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "", direction: "asc" });
  const contestSubmissions = submissions.filter((submission) => submission.contestId === selectedContestId);
  const filteredSubmissions = contestSubmissions.filter((submission) => {
    const attachmentNames = (submission.attachments ?? []).map((file) => file.name).join(" ");
    const searchable = `${submission.title} ${submission.team} ${submission.review} ${attachmentNames}`.toLowerCase();
    return !query.trim() || searchable.includes(query.trim().toLowerCase());
  });
  const visibleSubmissions = useMemo(() => sortRecords(filteredSubmissions, sort), [filteredSubmissions, sort]);
  const toggleSort = (key) => setSort((current) => toggleSortState(current, key));
  const hashReadyCount = contestSubmissions.filter((submission) => submission.hashReady).length;
  const handleDownload = (event, submission) => {
    event.stopPropagation();
    const result = downloadSubmissionFiles(submission);
    onNotify?.(result.message);
  };

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
          eyebrow="접수 현황"
          title={`${selectedContest.title} 제출물`}
          action={
            <div className="action-group">
              <button className="secondary-button" type="button" onClick={() => onExport("제출물")}>
                <Download size={17} />
                내보내기
              </button>
              <button className="primary-button" type="button" onClick={() => openModal("submission", { teams })}>
                <Upload size={17} />
                수동 접수
              </button>
            </div>
          }
        />
        <div className="table-utility-row">
          <label className="search-box">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              placeholder="제출물명, 팀, 심사 상태 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <span>{visibleSubmissions.length}건 표시</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortableTh label="제출물" sortKey="title" sort={sort} onSort={toggleSort} />
                <SortableTh label="팀" sortKey="team" sort={sort} onSort={toggleSort} />
                <th>파일</th>
                <SortableTh label="접수시각" sortKey="submittedAt" sort={sort} onSort={toggleSort} />
                <th>무결성</th>
                <SortableTh label="심사" sortKey="review" sort={sort} onSort={toggleSort} />
                <th>다운로드</th>
              </tr>
            </thead>
            <tbody>
              {visibleSubmissions.map((submission) => (
                <tr key={submission.id} onClick={() => openModal("submissionDetail", { submission })}>
                  <td data-label="제출물">
                    <strong>{submission.title}</strong>
                    <span>{submission.id}</span>
                  </td>
                  <td data-label="팀">{submission.team}</td>
                  <td data-label="파일">
                    <strong>{getSubmissionFileCount(submission)}개</strong>
                    <span>{getSubmissionFileSummary(submission)}</span>
                  </td>
                  <td data-label="접수시각">{submission.submittedAt}</td>
                  <td data-label="무결성">
                    <span className={submission.hashReady ? "inline-state ok" : "inline-state muted"}>
                      {submission.hashReady ? "해시 생성" : "대기"}
                    </span>
                  </td>
                  <td data-label="심사">
                    <StatusBadge status={submission.review} />
                  </td>
                  <td data-label="다운로드">
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`${submission.title} 다운로드`}
                      onClick={(event) => handleDownload(event, submission)}
                    >
                      <Download size={17} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleSubmissions.length === 0 && (
            <EmptyState
              title={contestSubmissions.length ? "검색 결과가 없습니다" : "접수된 제출물이 없습니다"}
              description={contestSubmissions.length ? "검색어를 조정해 주세요." : "대회 접수가 시작되면 이 영역에 팀별 제출물이 표시됩니다."}
            />
          )}
        </div>
      </section>

      <section className="panel detail-panel">
        <PanelHeader eyebrow="제출 기준" title="제출 조건" />
        <div className="checklist">
          <ChecklistItem done label="PDF 제안서" meta="최대 30MB" />
          <ChecklistItem done label="발표 자료" meta="PPTX 또는 PDF" />
          <ChecklistItem label="시연 영상" meta="선택, 최대 300MB" />
          <ChecklistItem done label="개인정보 동의서" meta="팀원 전원" />
        </div>
        <div className="hash-preview">
          <LockKeyhole size={18} aria-hidden="true" />
          <div>
            <strong>온체인 등록 준비값</strong>
            <span>
              {contestSubmissions.length}건 중 {hashReadyCount}건 해시 생성
            </span>
          </div>
        </div>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={onGenerateHashes}>
            <LockKeyhole size={17} />
            해시 생성
          </button>
        </div>
      </section>
    </div>
  );
}
