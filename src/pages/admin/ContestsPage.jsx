import React, { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Check,
  ClipboardList,
  Eye,
  FileArchive,
  Gavel,
  Plus,
  QrCode,
  Search,
  SlidersHorizontal,
  SquarePen,
  Trophy,
  UsersRound
} from "lucide-react";
import { EmptyState, IconButton, PanelHeader, ProgressBar, SegmentedControl, StatusBadge } from "../../components/common/CommonUi.jsx";
import { getAverage, getReviewTotal } from "../../lib/review.js";
import { getSubmissionFileCount } from "../../lib/submissionFiles.js";
import styles from "./ContestsPage.module.scss";

const detailTabs = [
  { id: "overview", label: "개요" },
  { id: "teams", label: "신청/팀" },
  { id: "submissions", label: "제출물" },
  { id: "judging", label: "심사" },
  { id: "awards", label: "수상" }
];

const sortLabels = {
  asc: "오름차순",
  desc: "내림차순"
};

function getSortValue(contest, key) {
  if (["teams", "judges"].includes(key)) {
    return Number(contest[key] || 0);
  }

  return String(contest[key] ?? "").toLowerCase();
}

function SortableHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;

  return (
    <th>
      <button className={`${styles.sortButton} ${active ? styles.sortButtonActive : ""}`} type="button" onClick={() => onSort(sortKey)}>
        {label}
        <ArrowUpDown size={13} aria-hidden="true" />
        {active && <span>{sortLabels[sort.direction]}</span>}
      </button>
    </th>
  );
}

export function ContestsPage({
  contests,
  teams = [],
  submissions = [],
  judgingAssignments = [],
  awardCandidates = [],
  reviewScores = [],
  selectedContestId,
  setSelectedContestId,
  selectedContest,
  onNavigate,
  onOpenPublicPage,
  openModal,
  onGenerateHashes,
  onCalculateResults
}) {
  const [statusFilter, setStatusFilter] = useState("전체");
  const [activeTab, setActiveTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "title", direction: "asc" });
  const filteredContests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = contests.filter((contest) => {
      const searchable = `${contest.title} ${contest.department} ${contest.owner} ${contest.status}`.toLowerCase();
      return (statusFilter === "전체" || contest.status === statusFilter) && (!normalizedQuery || searchable.includes(normalizedQuery));
    });

    return [...result].sort((a, b) => {
      const first = getSortValue(a, sort.key);
      const second = getSortValue(b, sort.key);
      const order = first > second ? 1 : first < second ? -1 : 0;
      return sort.direction === "asc" ? order : -order;
    });
  }, [contests, query, sort, statusFilter]);
  const contestTeams = useMemo(
    () => teams.filter((team) => team.contestId === selectedContestId),
    [selectedContestId, teams]
  );
  const contestSubmissions = useMemo(
    () => submissions.filter((submission) => submission.contestId === selectedContestId),
    [selectedContestId, submissions]
  );
  const contestJudges = useMemo(
    () => judgingAssignments.filter((judge) => judge.contestId === selectedContestId),
    [judgingAssignments, selectedContestId]
  );
  const contestAwards = useMemo(
    () => awardCandidates.filter((candidate) => candidate.contestId === selectedContestId),
    [awardCandidates, selectedContestId]
  );
  const contestReviewScores = useMemo(
    () => reviewScores.filter((record) => record.contestId === selectedContestId),
    [reviewScores, selectedContestId]
  );
  const reviewAverage = getAverage(contestReviewScores.map(getReviewTotal));
  const assignedReviews = contestJudges.reduce((sum, judge) => sum + Number(judge.assigned || 0), 0);
  const completedReviews = contestJudges.reduce((sum, judge) => sum + Number(judge.completed || 0), 0);
  const reviewProgress = assignedReviews ? Math.round((completedReviews / assignedReviews) * 100) : 0;
  const hashedSubmissions = contestSubmissions.filter((submission) => submission.hashReady).length;
  const approvedTeams = contestTeams.filter((team) => team.status === "승인").length;
  const pendingTeams = contestTeams.filter((team) => team.status !== "승인").length;
  const confirmedAwards = contestAwards.filter((candidate) => candidate.status === "확정").length;
  const toggleSort = (key) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  return (
    <div className={styles.layout}>
      <section className={styles.panel}>
        <PanelHeader
          title="대회 목록"
          action={
            <div className={styles.actionGroup}>
              <SegmentedControl
                options={["전체", "준비중", "접수중", "심사중", "수상확정"]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <button className={styles.primaryButton} type="button" onClick={() => openModal("contest")}>
                <Plus size={17} />
                대회 생성
              </button>
            </div>
          }
        />
        <div className={styles.tableToolbar}>
          <label className={styles.searchBox}>
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              placeholder="대회명, 주관부서, 담당자 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <span>{filteredContests.length}건 표시</span>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <SortableHeader label="대회명" sortKey="title" sort={sort} onSort={toggleSort} />
                <SortableHeader label="상태" sortKey="status" sort={sort} onSort={toggleSort} />
                <SortableHeader label="주관" sortKey="department" sort={sort} onSort={toggleSort} />
                <th>접수기간</th>
                <SortableHeader label="제출마감" sortKey="submissionDue" sort={sort} onSort={toggleSort} />
                <SortableHeader label="참가" sortKey="teams" sort={sort} onSort={toggleSort} />
                <SortableHeader label="심사위원" sortKey="judges" sort={sort} onSort={toggleSort} />
                <th aria-label="작업" />
              </tr>
            </thead>
            <tbody>
              {filteredContests.map((contest) => (
                <tr
                  className={contest.id === selectedContestId ? "selected-row" : ""}
                  key={contest.id}
                  onClick={() => setSelectedContestId(contest.id)}
                >
                  <td data-label="대회명">
                    <strong>{contest.title}</strong>
                    <span>{contest.id}</span>
                  </td>
                  <td data-label="상태">
                    <StatusBadge status={contest.status} />
                  </td>
                  <td data-label="주관">{contest.department}</td>
                  <td data-label="접수기간">{contest.applicationPeriod}</td>
                  <td data-label="제출마감">{contest.submissionDue}</td>
                  <td data-label="참가">{contest.teams}팀</td>
                  <td data-label="심사위원">{contest.judges}명</td>
                  <td data-label="작업">
                    <IconButton
                      label="대회 편집"
                      onClick={(event) => {
                        event.stopPropagation();
                        openModal("contest", { contest });
                      }}
                    >
                      <SquarePen size={17} />
                    </IconButton>
                  </td>
                </tr>
              ))}
              {filteredContests.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState title="검색 결과가 없습니다" description="검색어 또는 상태 필터를 조정해 주세요." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.detailPanel} aria-label={`${selectedContest.title} 상세`}>
        <div className={styles.detailHeader}>
          <div className={styles.detailTitleLine}>
            <div>
              <h2>{selectedContest.title}</h2>
              <div className={styles.detailMeta}>
                <span>{selectedContest.id}</span>
                <span>{selectedContest.department}</span>
                <span>{selectedContest.owner}</span>
                <span>제출 {selectedContest.submissionDue}</span>
              </div>
            </div>
            <StatusBadge status={selectedContest.status} />
          </div>

          <div className={styles.detailActions}>
            <button className={styles.secondaryButton} type="button" onClick={() => openModal("contestRules", { contest: selectedContest })}>
              <SlidersHorizontal size={17} />
              조건
            </button>
            <button className={styles.secondaryButton} type="button" onClick={() => onOpenPublicPage(selectedContest.id)}>
              <Eye size={17} />
              공개 보기
            </button>
            <button className={styles.secondaryButton} type="button" onClick={() => openModal("contest", { contest: selectedContest })}>
              <SquarePen size={17} />
              편집
            </button>
          </div>
        </div>

        <div className={styles.tabList} role="tablist" aria-label="대회 상세 탭">
          {detailTabs.map((tab) => (
            <button
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ContestDetailTab
          activeTab={activeTab}
          selectedContest={selectedContest}
          contestTeams={contestTeams}
          contestSubmissions={contestSubmissions}
          contestJudges={contestJudges}
          contestAwards={contestAwards}
          approvedTeams={approvedTeams}
          pendingTeams={pendingTeams}
          hashedSubmissions={hashedSubmissions}
          reviewAverage={reviewAverage}
          reviewProgress={reviewProgress}
          confirmedAwards={confirmedAwards}
          onNavigate={onNavigate}
          openModal={openModal}
          onGenerateHashes={onGenerateHashes}
          onCalculateResults={onCalculateResults}
        />
      </section>
    </div>
  );
}

function ContestDetailTab({
  activeTab,
  selectedContest,
  contestTeams,
  contestSubmissions,
  contestJudges,
  contestAwards,
  approvedTeams,
  pendingTeams,
  hashedSubmissions,
  reviewAverage,
  reviewProgress,
  confirmedAwards,
  onNavigate,
  openModal,
  onGenerateHashes,
  onCalculateResults
}) {
  if (activeTab === "teams") {
    return (
      <div className={styles.tabPanel}>
        <DetailSectionTitle
          icon={UsersRound}
          title="참가 신청 현황"
          meta={`승인 ${approvedTeams}팀 · 확인 필요 ${pendingTeams}팀`}
          actionLabel="신청 관리"
          onAction={() => onNavigate("teams", selectedContest.id)}
        />
        <div className={styles.ctaStrip}>
          <button className={styles.secondaryButton} type="button" onClick={() => onNavigate("teams", selectedContest.id)}>
            <UsersRound size={17} />
            검토중만 보기
          </button>
          <button className={styles.primaryButton} type="button" onClick={() => onNavigate("teams", selectedContest.id)}>
            <Check size={17} />
            신청 관리
          </button>
        </div>
        <div className={styles.list}>
          {contestTeams.length ? (
            contestTeams.slice(0, 5).map((team) => (
              <div className={styles.listItem} key={team.id}>
                <div className={styles.listItemTop}>
                  <strong>{team.name}</strong>
                  <StatusBadge status={team.status} />
                </div>
                <div className={styles.inlineMeta}>
                  <span>{team.leader}</span>
                  <span>{team.major}</span>
                  <span>{team.members}명</span>
                  <span>{team.submitted ? "제출 완료" : "제출 전"}</span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="아직 신청한 팀이 없습니다" description="참가자 포털에서 신청이 접수되면 이곳에 표시됩니다." />
          )}
        </div>
      </div>
    );
  }

  if (activeTab === "submissions") {
    return (
      <div className={styles.tabPanel}>
        <DetailSectionTitle
          icon={FileArchive}
          title="제출물 접수"
          meta={`해시 생성 ${hashedSubmissions}/${contestSubmissions.length}건`}
          actionLabel="제출물 관리"
          onAction={() => onNavigate("submissions", selectedContest.id)}
        />
        <div className={styles.ctaStrip}>
          <button className={styles.secondaryButton} type="button" onClick={onGenerateHashes}>
            <FileArchive size={17} />
            해시 일괄 생성
          </button>
          <button className={styles.primaryButton} type="button" onClick={() => onNavigate("submissions", selectedContest.id)}>
            <Check size={17} />
            제출물 관리
          </button>
        </div>
        <div className={styles.list}>
          {contestSubmissions.length ? (
            contestSubmissions.slice(0, 5).map((submission) => (
              <div className={styles.listItem} key={submission.id}>
                <div className={styles.listItemTop}>
                  <strong>{submission.title}</strong>
                  <StatusBadge status={submission.review} />
                </div>
                <div className={styles.inlineMeta}>
                  <span>{submission.team}</span>
                  <span>{getSubmissionFileCount(submission)}개 파일</span>
                  <span>{submission.submittedAt}</span>
                  <span>{submission.hashReady ? "해시 준비" : "해시 대기"}</span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="접수된 제출물이 없습니다" description="대회별 제출물이 들어오면 해시 생성 대상까지 함께 확인합니다." />
          )}
        </div>
      </div>
    );
  }

  if (activeTab === "judging") {
    return (
      <div className={styles.tabPanel}>
        <DetailSectionTitle
          icon={Gavel}
          title="심사 진행"
          meta={`완료율 ${reviewProgress}% · 평균 ${reviewAverage ? reviewAverage.toFixed(1) : "-"}점`}
          actionLabel="심사 관리"
          onAction={() => onNavigate("judging", selectedContest.id)}
        />
        <div className={styles.workflowGrid}>
          <button className={styles.secondaryButton} type="button" onClick={() => openModal("reviewLink", { contest: selectedContest })}>
            <QrCode size={17} />
            심사 링크
          </button>
          <button className={styles.secondaryButton} type="button" onClick={() => openModal("reviewReport")}>
            <ClipboardList size={17} />
            평가 현황
          </button>
          <button className={styles.secondaryButton} type="button" onClick={() => onNavigate("judging", selectedContest.id)}>
            <Gavel size={17} />
            배정 보기
          </button>
        </div>
        <div className={styles.list}>
          {contestJudges.length ? (
            contestJudges.slice(0, 4).map((judge) => (
              <div className={styles.listItem} key={judge.id}>
                <div className={styles.listItemTop}>
                  <strong>{judge.name}</strong>
                  <span>{judge.completed}/{judge.assigned}건</span>
                </div>
                <ProgressBar value={judge.assigned ? Math.round((judge.completed / judge.assigned) * 100) : 0} />
              </div>
            ))
          ) : (
            <EmptyState title="심사위원이 없습니다" description="심사 탭에서 심사위원을 추가하고 링크를 발급하세요." />
          )}
        </div>
      </div>
    );
  }

  if (activeTab === "awards") {
    return (
      <div className={styles.tabPanel}>
        <DetailSectionTitle
          icon={Trophy}
          title="수상 확정"
          meta={`확정 ${confirmedAwards}/${contestAwards.length}건`}
          actionLabel="수상 관리"
          onAction={() => onNavigate("awards", selectedContest.id)}
        />
        <div className={styles.ctaStrip}>
          <button className={styles.secondaryButton} type="button" onClick={onCalculateResults}>
            <ClipboardList size={17} />
            결과 산출
          </button>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={contestAwards.length === 0}
            onClick={() => openModal("confirmAwards", { count: contestAwards.length })}
          >
            <Trophy size={17} />
            결과 확정
          </button>
        </div>
        <div className={styles.list}>
          {contestAwards.length ? (
            contestAwards.slice(0, 5).map((candidate) => (
              <div className={styles.listItem} key={`${candidate.contestId}-${candidate.rank}-${candidate.team}`}>
                <div className={styles.listItemTop}>
                  <strong>{candidate.prize}</strong>
                  <StatusBadge status={candidate.status} />
                </div>
                <div className={styles.inlineMeta}>
                  <span>{candidate.team}</span>
                  <span>{candidate.score}점</span>
                  <span>{candidate.certificateNo}</span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="산출된 수상 후보가 없습니다" description="심사 결과 산출 후 후보와 확정 상태가 표시됩니다." />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabPanel}>
      <div className={styles.metricGrid}>
        <MetricTile label="참가 신청" value={`${contestTeams.length}팀`} meta={`승인 ${approvedTeams} · 확인 ${pendingTeams}`} />
        <MetricTile label="제출물" value={`${contestSubmissions.length}건`} meta={`해시 ${hashedSubmissions}건`} />
        <MetricTile label="심사" value={`${reviewProgress}%`} meta={`평균 ${reviewAverage ? reviewAverage.toFixed(1) : "-"}점`} />
        <MetricTile label="수상" value={`${contestAwards.length}건`} meta={`확정 ${confirmedAwards}건`} />
      </div>
      <div className={styles.workflowGrid}>
        <button className={styles.secondaryButton} type="button" onClick={() => onNavigate("teams", selectedContest.id)}>
          <UsersRound size={17} />
          신청/팀
        </button>
        <button className={styles.secondaryButton} type="button" onClick={() => onNavigate("submissions", selectedContest.id)}>
          <FileArchive size={17} />
          제출물
        </button>
        <button className={styles.secondaryButton} type="button" onClick={() => onNavigate("judging", selectedContest.id)}>
          <Gavel size={17} />
          심사
        </button>
      </div>
      <button className={styles.primaryButton} type="button" onClick={() => openModal("contest", { contest: selectedContest })}>
        <Check size={17} />
        대회 설정 수정
      </button>
    </div>
  );
}

function DetailSectionTitle({ icon: Icon, title, meta, actionLabel, onAction }) {
  return (
    <div className={styles.sectionTitle}>
      <div>
        <strong>
          <Icon size={16} aria-hidden="true" /> {title}
        </strong>
        <span>{meta}</span>
      </div>
      <button className={styles.textAction} type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

function MetricTile({ label, value, meta }) {
  return (
    <div className={styles.metricTile}>
      <span>{label}</span>
      <strong>{value}</strong>
      <span>{meta}</span>
    </div>
  );
}
