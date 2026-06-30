import React from "react";
import {
  Award,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  FileArchive,
  Gavel,
  Plus,
  Settings2,
  UsersRound
} from "lucide-react";
import { PanelHeader, StatusBadge } from "../../components/common/CommonUi.jsx";
import styles from "./DashboardPage.module.scss";

const operationStages = ["공고 등록", "접수중", "제출 접수", "심사중", "수상 확정"];

export function DashboardPage({
  contests,
  teams,
  submissions,
  judgingAssignments,
  awardCandidates,
  onNavigate,
  openModal
}) {
  const activeContests = contests.filter((contest) => contest.status !== "수상확정");
  const statusCounts = contests.reduce(
    (acc, contest) => ({
      ...acc,
      [contest.status]: (acc[contest.status] ?? 0) + 1
    }),
    {}
  );
  const supplementCount = teams.filter((team) => team.status === "보완요청").length;
  const unassignedCount = submissions.filter((submission) => ["미배정", "대기"].includes(submission.review)).length;
  const delayedReviewCount = judgingAssignments.reduce(
    (sum, judge) => sum + Math.max(judge.assigned - judge.completed, 0),
    0
  );
  const pendingAwardCount = awardCandidates.filter((candidate) => candidate.status !== "확정").length;

  const openContestPage = (contestId, page) => {
    onNavigate(page, contestId);
  };

  const workQueue = [
    {
      icon: CircleAlert,
      tone: "danger",
      count: supplementCount,
      title: "보완요청 신청 확인",
      meta: "팀 증빙 서류와 구성원 정보 확인",
      action: "신청 검토",
      page: "teams"
    },
    {
      icon: FileArchive,
      tone: "warning",
      count: unassignedCount,
      title: "심사 배정 대기",
      meta: "제출물 접수 후 심사위원 배정 필요",
      action: "제출물 보기",
      page: "submissions"
    },
    {
      icon: ClipboardCheck,
      tone: "warning",
      count: delayedReviewCount,
      title: "심사 미완료",
      meta: "심사 독촉 또는 재배정 검토",
      action: "심사 관리",
      page: "judging"
    },
    {
      icon: Award,
      tone: "success",
      count: pendingAwardCount,
      title: "수상 확정 대기",
      meta: "결과 산출 후 상장번호 확인",
      action: "수상 확정",
      page: "awards"
    }
  ];
  const totalWorkCount = workQueue.reduce((sum, item) => sum + item.count, 0);
  const hasPendingWork = totalWorkCount > 0;
  const primaryWork = workQueue.find((item) => item.count > 0);
  const orderedWorkQueue = primaryWork ? [primaryWork, ...workQueue.filter((item) => item !== primaryWork)] : workQueue;

  return (
    <div className={styles.layout}>
      <section className={styles.topRow} aria-label="운영 처리 및 신규 등록">
        <section className={styles.workQueue} aria-label="오늘 처리할 일">
          <PanelHeader
            title="오늘 처리할 일"
            action={
              <button className={styles.textAction} type="button" onClick={() => onNavigate("contests")}>
                전체 운영 보기
                <ChevronRight size={16} />
              </button>
            }
          />
          <div className={styles.queueBoard}>
            {orderedWorkQueue.map((item) => (
              <WorkQueueItem
                key={item.title}
                item={item}
                isPrimary={hasPendingWork && item === primaryWork}
                onClick={() => onNavigate(item.page)}
              />
            ))}
          </div>
        </section>
        <div className="create-contest-card">
          <div className="create-contest-icon">
            <Plus size={22} aria-hidden="true" />
          </div>
          <div>
            <strong>신규 대회 등록</strong>
            <span>공고 정보와 접수 기간을 먼저 만들고 이후 팀/제출/심사를 연결합니다.</span>
          </div>
          <button className={styles.primaryButton} type="button" onClick={() => openModal("contest")}>
            <Plus size={17} />
            대회 생성
          </button>
        </div>
      </section>

      <section className={styles.panelWide}>
        <div className={styles.contestOverview}>
          <div className={styles.contestOverviewCopy}>
            <div className={styles.contestOverviewHeader}>
              <h2>진행 중인 대회 관리</h2>
              <button className={styles.textAction} type="button" onClick={() => onNavigate("contests")}>
                전체 대회
                <ChevronRight size={16} />
              </button>
            </div>
            <p>접수, 제출, 심사, 수상 확정까지 현재 움직이는 대회를 기준으로 운영합니다.</p>
          </div>
          <dl className="operation-stats">
            <div>
              <dt>진행 중</dt>
              <dd>{activeContests.length}건</dd>
            </div>
            <div>
              <dt>접수중</dt>
              <dd>{statusCounts["접수중"] ?? 0}건</dd>
            </div>
            <div>
              <dt>심사중</dt>
              <dd>{statusCounts["심사중"] ?? 0}건</dd>
            </div>
            <div>
              <dt>준비중</dt>
              <dd>{statusCounts["준비중"] ?? 0}건</dd>
            </div>
          </dl>
        </div>
        <div className="contest-management-grid">
          {activeContests.map((contest) => (
            <ContestManagementCard
              key={contest.id}
              contest={contest}
              teams={teams}
              submissions={submissions}
              judgingAssignments={judgingAssignments}
              onOpenPage={openContestPage}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function WorkQueueItem({ item, isPrimary, onClick }) {
  const Icon = item.icon;
  const isEmpty = item.count === 0;

  return (
    <button
      className={`${styles.queueItem} ${isPrimary ? styles.queueItemPrimary : ""} ${isEmpty ? styles.queueItemEmpty : ""}`}
      type="button"
      onClick={onClick}
    >
      <span className={`${styles.queueIcon} ${styles[item.tone] ?? ""}`}>
        <Icon size={isPrimary ? 18 : 16} aria-hidden="true" />
      </span>
      <span className={styles.queueCopy}>
        <span className={styles.queueTitleLine}>
          {isPrimary && <em>우선 처리</em>}
          <strong>{item.title}</strong>
        </span>
        {isPrimary && <small>{item.meta}</small>}
      </span>
      <span className={styles.queueCount}>{isEmpty ? "정상" : `${item.count}건`}</span>
      <span className={styles.queueAction}>
        {isPrimary && item.action}
        <ChevronRight size={15} aria-hidden="true" />
      </span>
    </button>
  );
}

function ContestManagementCard({ contest, teams, submissions, judgingAssignments, onOpenPage }) {
  const contestTeams = teams.filter((team) => team.contestId === contest.id);
  const contestSubmissions = submissions.filter((submission) => submission.contestId === contest.id);
  const contestJudges = judgingAssignments.filter((judge) => judge.contestId === contest.id);
  const assigned = contestJudges.reduce((sum, judge) => sum + judge.assigned, 0);
  const completed = contestJudges.reduce((sum, judge) => sum + judge.completed, 0);
  const reviewRate = assigned ? Math.round((completed / assigned) * 100) : 0;
  const currentStageIndex = getContestStageIndex({ contest, contestSubmissions, completed });
  const needsAttention =
    contestTeams.filter((team) => team.status === "보완요청").length +
    contestSubmissions.filter((submission) => ["미배정", "대기"].includes(submission.review)).length +
    Math.max(assigned - completed, 0);
  const resolvedPrimaryAction = getContestPrimaryAction({ contest, currentStageIndex, needsAttention });
  const PrimaryActionIcon = resolvedPrimaryAction.icon;
  const stopAndOpen = (event, page) => {
    event.stopPropagation();
    onOpenPage(contest.id, page);
  };

  return (
    <article className="management-card">
      <button
        className="management-card-hitbox"
        type="button"
        aria-label={`${contest.title} 상세 보기`}
        onClick={() => onOpenPage(contest.id, "contests")}
      />
      <div className="management-card-head">
        <div className="management-card-title">
          <div className="management-title-row">
            <strong>{contest.title}</strong>
            <span className="management-card-link">
              상세 보기
              <ChevronRight size={15} aria-hidden="true" />
            </span>
          </div>
          <span>
            {contest.department} · 제출 마감 {contest.submissionDue}
          </span>
        </div>
        <StatusBadge status={contest.status} />
      </div>
      <ContestStageTracker currentStageIndex={currentStageIndex} progress={contest.progress} />
      <dl className="management-metrics">
        <div>
          <dt>참가</dt>
          <dd>{contest.teams}팀</dd>
        </div>
        <div>
          <dt>제출</dt>
          <dd>{contest.submissions}건</dd>
        </div>
        <div>
          <dt>심사</dt>
          <dd>{reviewRate}%</dd>
        </div>
        <div>
          <dt>처리필요</dt>
          <dd>{needsAttention}건</dd>
        </div>
      </dl>
      <div className="management-actions">
        <button className="primary-button management-primary-action" type="button" onClick={(event) => stopAndOpen(event, resolvedPrimaryAction.page)}>
          <PrimaryActionIcon size={16} aria-hidden="true" />
          {resolvedPrimaryAction.label}
        </button>
        <div className="management-quick-actions" aria-label={`${contest.title} 빠른 이동`}>
          <button className="icon-button" type="button" aria-label="신청 관리" title="신청 관리" onClick={(event) => stopAndOpen(event, "teams")}>
            <UsersRound size={16} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="제출물 관리" title="제출물 관리" onClick={(event) => stopAndOpen(event, "submissions")}>
            <FileArchive size={16} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="심사 관리" title="심사 관리" onClick={(event) => stopAndOpen(event, "judging")}>
            <Gavel size={16} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="대회 설정" title="대회 설정" onClick={(event) => stopAndOpen(event, "contests")}>
            <Settings2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

function ContestStageTracker({ currentStageIndex, progress }) {
  const currentStage = operationStages[currentStageIndex];
  const nextStage = operationStages[currentStageIndex + 1];

  return (
    <div className="management-stage-summary" aria-label={`현재 운영 단계: ${currentStage}`}>
      <div className="management-stage-copy">
        <span>현재 단계</span>
        <strong>{currentStage}</strong>
        {nextStage && <em>다음 {nextStage}</em>}
      </div>
      <div className="management-stage-progress">
        <span>{progress}%</span>
        <div aria-hidden="true">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

function getContestPrimaryAction({ contest, currentStageIndex, needsAttention }) {
  if (needsAttention > 0) {
    if (contest.status === "심사중") {
      return { label: "심사 관리", page: "judging", icon: Gavel };
    }

    if ((contest.submissions ?? 0) > 0) {
      return { label: "제출물 확인", page: "submissions", icon: FileArchive };
    }

    return { label: "신청 검토", page: "teams", icon: UsersRound };
  }

  if (currentStageIndex >= 3) {
    return { label: "심사 관리", page: "judging", icon: Gavel };
  }

  if (currentStageIndex >= 2) {
    return { label: "제출물 확인", page: "submissions", icon: FileArchive };
  }

  if (contest.status === "준비중") {
    return { label: "대회 설정", page: "contests", icon: Settings2 };
  }

  return { label: "신청 관리", page: "teams", icon: UsersRound };
}

function getContestStageIndex({ contest, contestSubmissions, completed }) {
  if (contest.status === "수상확정") {
    return 4;
  }

  if (contest.status === "심사중") {
    return 3;
  }

  if (contestSubmissions.length > 0 || (contest.submissions ?? 0) > 0) {
    return 2;
  }

  if (contest.status === "접수중" || (contest.teams ?? 0) > 0) {
    return 1;
  }

  return completed > 0 ? 3 : 0;
}
