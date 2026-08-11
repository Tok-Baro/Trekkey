import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Award, Copy, Download, Link2, Pencil, QrCode, Save, Trash2 } from "lucide-react";
import { DetailList, EmptyState, SegmentedControl } from "../common/CommonUi.jsx";
import { ContestForm, JudgeForm, SubmissionForm } from "../forms/CompetitionForms.jsx";
import { TeamRosterSummary } from "../forms/TeamRosterField.jsx";
import { getContestTitle, getReviewUrl } from "../../lib/contest.js";
import { downloadJson } from "../../lib/exportCsv.js";
import {
  getAverage,
  getReviewTotal,
  getRoundScoreCriteria,
  isRecordInRound,
  normalizeEvaluationRounds
} from "../../lib/review.js";
import { formatFileSize, getSubmissionFileCount } from "../../lib/submissionFiles.js";
import { ModalFrame } from "./ModalFrame.jsx";
import {
  AWARD_TYPE_OPTIONS,
  formatAwardRank,
  inferAwardType
} from "../../constants/awards.js";

export function ModalRoot({
  modal,
  contests,
  teams,
  submissions,
  judgingAssignments,
  reviewScores,
  awardCandidates = [],
  selectedContest,
  selectedContestId,
  openModal,
  onClose,
  onSaveContest,
  onFinalizeTeam,
  onAddSubmission,
  onAddJudge,
  onUpdateJudge,
  onDeleteJudge,
  onUpdateAward,
  onConfirmAwards,
  onDownloadSubmission,
  onNotify,
  serverBacked = false,
  onPrepareReviewEntries,
  onResetReviewEntries,
  onOpenReviewRound,
  onIssueReviewLink,
  onRevokeReviewLink,
  onFinalizeReviewRound,
  onExtendReviewRoundDeadline,
  onUpdateStageStatus,
  onListReviewAssignments,
  onCancelReviewAssignment,
  onReassignReviewAssignment,
  onUpdateReviewAssignmentDueAt
}) {
  if (!modal) {
    return null;
  }

  const { type, payload = {} } = modal;
  const contestTeams = teams.filter((team) => team.contestId === selectedContestId);
  const contestSubmissions = submissions.filter((submission) => submission.contestId === selectedContestId);
  const selectedRounds = !selectedContest.id || !selectedContest.evaluationRounds?.length
    ? []
    : normalizeEvaluationRounds(selectedContest.evaluationRounds, selectedContestId);
  const modalRound = payload.round ?? selectedRounds.find((round) => round.id === payload.roundId) ?? selectedRounds[0];
  const contestJudges = judgingAssignments.filter(
    (judge) => judge.contestId === selectedContestId && (!modalRound || isRecordInRound(judge, modalRound, selectedContest))
  );
  const contestReviewScores = reviewScores.filter(
    (record) => record.contestId === selectedContestId && (!modalRound || isRecordInRound(record, modalRound, selectedContest))
  );
  const approvedTeamIds = new Set(
    contestTeams
      .filter((team) => ["승인", "APPROVED"].includes(team.status))
      .map((team) => team.id)
  );
  const eligibleReviewSubmissions = contestSubmissions.filter(
    (submission) => submission.status === "SUBMITTED" && approvedTeamIds.has(submission.teamId)
  );

  if (type === "notifications") {
    return (
      <NotificationsModal
        teams={teams}
        submissions={submissions}
        judgingAssignments={judgingAssignments}
        awardCandidates={awardCandidates}
        onClose={onClose}
      />
    );
  }

  if (type === "settings") {
    return (
      <SettingsModal
        contests={contests}
        teams={teams}
        submissions={submissions}
        judgingAssignments={judgingAssignments}
        reviewScores={reviewScores}
        awardCandidates={awardCandidates}
        selectedContest={selectedContest}
        onClose={onClose}
        onNotify={onNotify}
      />
    );
  }

  if (type === "contest") {
    const contest = payload.contest;
    return (
      <ModalFrame
        title={contest ? "대회 편집" : "대회 생성"}
        description="운영에 필요한 기본 정보와 공개 상세 페이지를 함께 관리합니다."
        onClose={onClose}
        size="contest"
      >
        <ContestForm
          contest={contest}
          initialStepId={payload.initialStepId}
          onSubmit={onSaveContest}
          onClose={onClose}
          serverBacked={serverBacked}
        />
      </ModalFrame>
    );
  }

  if (type === "contestRules") {
    const criteriaRows = selectedRounds.map((round) => [
      `${round.name} 기준`,
      getRoundScoreCriteria(round)
        .map((criterion) => `${criterion.label} ${criterion.max}점`)
        .join(", ")
    ]);

    return (
      <ModalFrame title="대회 세부 조건" description={selectedContest.title} onClose={onClose}>
        <div className="modal-info-stack">
          <DetailList
            items={[
              ["참가 방식", selectedContest.type],
              ["최대 팀원", "5명"],
              ["중복 신청", "대회별 1회"],
              ...criteriaRows
            ]}
          />
          <div className="modal-actions">
            <button className="primary-button" type="button" onClick={onClose}>
              확인
            </button>
          </div>
        </div>
      </ModalFrame>
    );
  }

  if (type === "stageStatus") {
    return (
      <StageStatusModal
        contest={serverBacked ? selectedContest : payload.contest ?? selectedContest}
        onClose={onClose}
        onUpdate={onUpdateStageStatus}
      />
    );
  }

  if (type === "reviewLink") {
    return (
      <ReviewLinkModal
        contest={payload.contest ?? selectedContest}
        round={payload.round ?? modalRound}
        judge={payload.judge}
        onClose={onClose}
        onNotify={onNotify}
        onIssue={serverBacked ? onIssueReviewLink : undefined}
        onRevoke={serverBacked ? onRevokeReviewLink : undefined}
      />
    );
  }

  if (type === "prepareReviewEntries") {
    return (
      <PrepareReviewEntriesModal
        round={payload.round ?? modalRound}
        submissions={serverBacked ? eligibleReviewSubmissions : contestSubmissions}
        onClose={onClose}
        onSubmit={onPrepareReviewEntries}
      />
    );
  }

  if (type === "resetReviewEntries") {
    return (
      <ConfirmReviewActionModal
        title="평가 대상 초기화"
        description={payload.round?.name}
        message="준비된 평가 대상과 아직 완료되지 않은 심사 배정을 초기화합니다."
        confirmLabel="초기화"
        danger
        onClose={onClose}
        onConfirm={() => onResetReviewEntries?.(payload.round)}
      />
    );
  }

  if (type === "openReviewRound") {
    return (
      <ConfirmReviewActionModal
        title="심사 라운드 시작"
        description={payload.round?.name}
        message="평가 대상과 심사위원 배정을 확인한 뒤 라운드를 시작합니다. 시작 후에는 라운드 설정을 수정할 수 없습니다."
        confirmLabel="라운드 시작"
        onClose={onClose}
        onConfirm={() => onOpenReviewRound?.(payload.round)}
      />
    );
  }

  if (type === "extendReviewRound") {
    return (
      <ExtendReviewRoundModal
        round={payload.round ?? modalRound}
        onClose={onClose}
        onSubmit={onExtendReviewRoundDeadline}
      />
    );
  }

  if (type === "assignmentManagement") {
    return (
      <AssignmentManagementModal
        judge={payload.judge}
        round={payload.round ?? modalRound}
        onClose={onClose}
        onList={onListReviewAssignments}
        onCancel={onCancelReviewAssignment}
        onReassign={onReassignReviewAssignment}
        onUpdateDueAt={onUpdateReviewAssignmentDueAt}
      />
    );
  }

  if (type === "finalizeReviewRound") {
    return (
      <FinalizeReviewRoundModal
        round={payload.round ?? modalRound}
        entries={payload.entries ?? []}
        onClose={onClose}
        onSubmit={onFinalizeReviewRound}
      />
    );
  }

  if (type === "reviewReport") {
    return (
      <ReviewReportModal
        contest={selectedContest}
        round={modalRound}
        judges={contestJudges}
        submissions={contestSubmissions}
        reviewScores={contestReviewScores}
        onClose={onClose}
        onNotify={onNotify}
      />
    );
  }

  if (type === "teamFilter") {
    return (
      <ModalFrame title="참가 신청 조건" description="현재 화면 필터와 승인 정책입니다." onClose={onClose}>
        <DetailList
          items={[
            ["검토중", "학생 정보와 소속을 확인해야 하는 신청"],
            ["승인", "대회 참가가 확정된 팀"],
            ["보완요청", "증빙 또는 팀원 정보 수정이 필요한 신청"],
            ["반려", "참가 조건을 충족하지 못해 거절된 신청"],
            ["제출 상태", "팀 카드 하단에서 제출 완료 여부 확인"]
          ]}
        />
      </ModalFrame>
    );
  }

  if (type === "teamDetail") {
    const { team } = payload;
    return (
      <TeamDetailModal
        team={team}
        contestTitle={getContestTitle(team.contestId, contests)}
        onClose={onClose}
        onFinalizeTeam={onFinalizeTeam}
      />
    );
  }

  if (type === "submission") {
    return (
      <ModalFrame title="수동 제출물 접수" description={selectedContest.title} onClose={onClose}>
        <SubmissionForm teams={contestTeams} onSubmit={onAddSubmission} onClose={onClose} />
      </ModalFrame>
    );
  }

  if (type === "submissionDetail") {
    const { submission } = payload;
    const attachments = Array.isArray(submission.attachments) ? submission.attachments : [];
    const handleDownload = () => {
      onDownloadSubmission?.(submission);
    };

    return (
      <ModalFrame title={submission.title} description="제출물 상세" onClose={onClose}>
        <div className="modal-info-stack">
          <DetailList
            items={[
              ["제출번호", submission.id],
              ["팀", submission.team],
              ["파일 수", `${getSubmissionFileCount(submission)}개`],
              ["접수시각", submission.submittedAt],
              ["무결성", submission.hashReady ? "해시 생성" : "대기"],
              ["심사", submission.review]
            ]}
          />
          {attachments.length > 0 ? (
            <div className="file-detail-list">
              {attachments.map((file) => (
                <div className="file-detail-item" key={file.id}>
                  <strong>{file.name}</strong>
                  <span>
                    {formatFileSize(file.size)} · {file.type} · {file.uploadStatus}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="modal-copy">기존 데모 제출물은 파일 개수만 보유하고 있습니다.</p>
          )}
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              닫기
            </button>
            <button className="primary-button" type="button" onClick={handleDownload}>
              <Download size={17} aria-hidden="true" />
              제출물 다운로드
            </button>
          </div>
        </div>
      </ModalFrame>
    );
  }

  if (type === "judge") {
    const { judge } = payload;
    return (
      <ModalFrame title={judge ? "심사위원 수정" : "심사위원 추가"} description={selectedContest.title} onClose={onClose}>
        <JudgeForm
          judge={judge}
          onSubmit={judge ? onUpdateJudge : onAddJudge}
          onClose={onClose}
        />
      </ModalFrame>
    );
  }

  if (type === "judgeDetail") {
    const { judge } = payload;
    return (
      <ModalFrame title={judge.name} description="심사위원 상세" onClose={onClose}>
        <DetailList
          items={[
            ["역할", judge.role],
            ["평가 라운드", selectedRounds.find((round) => round.id === (judge.roundId ?? selectedRounds[0]?.id))?.name ?? "-"],
            ["배정", `${judge.assigned}건`],
            ["완료", `${judge.completed}건`],
            ["평균 점수", judge.avgScore ? `${judge.avgScore}점` : "산출 전"]
          ]}
        />
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={() => onClose()}>
            닫기
          </button>
          {onListReviewAssignments && modalRound && (
            <button className="secondary-button" type="button" onClick={() => openModal("assignmentManagement", { judge, round: modalRound })}>
              <Link2 size={17} />
              배정 관리
            </button>
          )}
          <button className="secondary-button" type="button" onClick={() => openModal("judge", { judge })}>
            <Pencil size={17} />
            수정
          </button>
          <button className="danger-button" type="button" onClick={() => openModal("deleteJudge", { judge })}>
            <Trash2 size={17} />
            삭제
          </button>
        </div>
      </ModalFrame>
    );
  }

  if (type === "deleteJudge") {
    const { judge } = payload;
    return (
      <ModalFrame title="심사위원 삭제" description={selectedContest.title} onClose={onClose}>
        <div className="modal-info-stack">
          <DetailList
            items={[
              ["이름", judge.name],
              ["역할", judge.role],
              ["배정/완료", `${judge.assigned}건 / ${judge.completed}건`]
            ]}
          />
          <p className="modal-copy">삭제하면 해당 심사위원의 평가 기록도 평가 현황에서 제외됩니다.</p>
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              취소
            </button>
            <button className="danger-button" type="button" onClick={() => onDeleteJudge(judge.id)}>
              <Trash2 size={17} />
              삭제
            </button>
          </div>
        </div>
      </ModalFrame>
    );
  }

  if (type === "confirmAwards") {
    const heldCount = Number(payload.heldCount || 0);
    const canConfirm = Number(payload.count || 0) > 0 && heldCount === 0;

    return (
      <ModalFrame title="수상 결과 확정" description={selectedContest.title} onClose={onClose}>
        <div className="modal-info-stack">
          <p className="modal-copy">
            {heldCount > 0
              ? `보류 후보 ${heldCount}건이 있습니다. 후보 상세에서 확정대기로 되돌린 뒤 전체 결과를 확정할 수 있습니다.`
              : canConfirm
                ? `후보 ${payload.count}건을 확정하고, 같은 트랜잭션에서 수상 Credential 발급을 시작합니다.`
                : "확정할 수상 후보가 없습니다. 먼저 심사 결과를 산출해 주세요."}
          </p>
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              취소
            </button>
            <button className="primary-button" type="button" disabled={!canConfirm} onClick={onConfirmAwards}>
              <Award size={17} />
              확정
            </button>
          </div>
        </div>
      </ModalFrame>
    );
  }

  if (type === "awardDetail") {
    const { candidate } = payload;
    return (
      <AwardDetailModal
        candidate={candidate}
        onClose={onClose}
        onUpdateAward={onUpdateAward}
      />
    );
  }

  return null;
}

function AwardDetailModal({ candidate, onClose, onUpdateAward }) {
  const initialAwardType = candidate.awardType ?? inferAwardType(candidate.prize);
  const [awardType, setAwardType] = useState(initialAwardType);
  const [customPrize, setCustomPrize] = useState(
    candidate.customPrize ?? (initialAwardType === "CUSTOM" ? candidate.prize : "")
  );
  const [status, setStatus] = useState(candidate.status === "보류" ? "보류" : "확정대기");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isConfirmed = candidate.status === "확정";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (awardType === "CUSTOM" && !customPrize.trim()) {
      setError("직접 입력 상격명을 입력해 주세요.");
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      const saved = await onUpdateAward?.(candidate, {
        awardType,
        customPrize: awardType === "CUSTOM" ? customPrize.trim() : "",
        status: status === "보류" ? "HELD" : "CANDIDATE"
      });
      if (saved !== false) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalFrame title={`${candidate.prize} · ${candidate.team}`} description="수상 후보 상세" onClose={onClose}>
      <form className="form-stack award-editor" onSubmit={handleSubmit}>
        <DetailList
          items={[
            ["순위", formatAwardRank(candidate)],
            ["점수", `${candidate.score}점`],
            ["인원", `${candidate.members}명`],
            ["상장번호", candidate.certificateNo]
          ]}
        />

        {isConfirmed ? (
          <p className="modal-copy">확정된 수상 결과입니다. 후보 편집은 확정 전에만 가능합니다.</p>
        ) : (
          <>
            <label>
              <span>상격</span>
              <select value={awardType} onChange={(event) => setAwardType(event.target.value)}>
                {AWARD_TYPE_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {awardType === "CUSTOM" && (
              <label>
                <span>상격명</span>
                <input
                  type="text"
                  maxLength={50}
                  value={customPrize}
                  onChange={(event) => setCustomPrize(event.target.value)}
                  placeholder="예: 산학협력단장상"
                  required
                />
              </label>
            )}
            <div className="award-status-field">
              <span>후보 상태</span>
              <SegmentedControl
                options={["확정대기", "보류"]}
                value={status}
                onChange={setStatus}
              />
            </div>
            {error && <p className="award-editor-error" role="alert">{error}</p>}
          </>
        )}

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>닫기</button>
          {!isConfirmed && (
            <button className="primary-button" type="submit" disabled={isSaving || !onUpdateAward}>
              <Save size={17} />
              {isSaving ? "저장 중" : "변경 저장"}
            </button>
          )}
        </div>
      </form>
    </ModalFrame>
  );
}

function TeamDetailModal({ team, contestTitle, onClose, onFinalizeTeam }) {
  const [isFinalizing, setIsFinalizing] = useState(false);
  const canFinalize = Boolean(team.teamPublicId) && team.status === "승인" && !team.participationFinalizedAt;

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      await onFinalizeTeam?.(team.teamPublicId);
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <ModalFrame title={team.name} description="참가 신청 상세" onClose={onClose}>
      <div className="modal-info-stack">
        <DetailList
          items={[
            ["신청번호", team.teamPublicId ?? team.id ?? "미발급"],
            ["대회", contestTitle],
            ["대표자", team.leader],
            ["소속", team.major],
            ["팀원", `${team.members}명`],
            ...(team.teamMembers?.length
              ? [["팀원 명단", team.teamMembers.map((member) =>
                  `${member.name}(${member.role === "LEADER" ? "대표자" : "팀원"})`
                ).join(", ")]]
              : []),
            ["상태", team.status],
            ...(team.revisionReason ? [["보완 요청 사유", team.revisionReason]] : []),
            ["제출", team.submitted ? "완료" : "제출 전"],
            ["명단 확정", team.finalizedAt ?? "미확정"],
            ...(team.applicantEmail ? [["이메일", team.applicantEmail]] : []),
            ...(team.phone ? [["연락처", team.phone]] : []),
            ...(team.motivation ? [["지원동기", team.motivation]] : [])
          ]}
        />
        <TeamRosterSummary team={team} title="팀원 명단" />
        {canFinalize && (
          <>
            <p className="modal-copy">명단 확정 후 참가자는 신청 정보를 수정할 수 없으며 팀원별 참여 이력이 발급됩니다.</p>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={onClose} disabled={isFinalizing}>
                취소
              </button>
              <button className="primary-button" type="button" onClick={handleFinalize} disabled={isFinalizing}>
                {isFinalizing ? "확정 중..." : "참가 명단 확정"}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalFrame>
  );
}

function NotificationsModal({ teams, submissions, judgingAssignments, awardCandidates, onClose }) {
  const supplementCount = teams.filter((team) => team.status === "보완요청").length;
  const unassignedCount = submissions.filter((submission) => ["미배정", "대기"].includes(submission.review)).length;
  const delayedReviewCount = judgingAssignments.reduce(
    (sum, judge) => sum + Math.max(Number(judge.assigned || 0) - Number(judge.completed || 0), 0),
    0
  );
  const pendingAwardCount = awardCandidates.filter((candidate) => candidate.status !== "확정").length;
  const totalCount = supplementCount + unassignedCount + delayedReviewCount + pendingAwardCount;

  return (
    <ModalFrame title="운영 알림" description={totalCount ? `${totalCount}건의 확인 항목이 있습니다.` : "확인할 운영 알림이 없습니다."} onClose={onClose}>
      <div className="modal-info-stack">
        <DetailList
          items={[
            ["보완요청 신청", `${supplementCount}건`],
            ["심사 배정 대기 제출물", `${unassignedCount}건`],
            ["미완료 심사", `${delayedReviewCount}건`],
            ["수상 확정 대기", `${pendingAwardCount}건`]
          ]}
        />
        <div className="modal-actions">
          <button className="primary-button" type="button" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function SettingsModal({
  contests,
  teams,
  submissions,
  judgingAssignments,
  reviewScores,
  awardCandidates,
  selectedContest,
  onClose,
  onNotify
}) {
  const exportSnapshot = () => {
    downloadJson(`trekkey-demo-snapshot-${new Date().toISOString().slice(0, 10)}.json`, {
      exportedAt: new Date().toISOString(),
      selectedContestId: selectedContest.id,
      contestRecords: contests,
      teamRecords: teams,
      submissionRecords: submissions,
      judgeRecords: judgingAssignments,
      reviewRecords: reviewScores,
      awardRecords: awardCandidates
    });
    onNotify?.("현재 데모 데이터 JSON을 다운로드했습니다.");
  };

  return (
    <ModalFrame title="운영 설정" description="데모 데이터와 콘솔 상태를 관리합니다." onClose={onClose}>
      <div className="modal-info-stack">
        <DetailList
          items={[
            ["선택 대회", selectedContest.title],
            ["대회", `${contests.length}건`],
            ["참가 신청", `${teams.length}건`],
            ["제출물", `${submissions.length}건`],
            ["심사위원", `${judgingAssignments.length}명`],
            ["평가 기록", `${reviewScores.length}건`],
            ["수상 후보", `${awardCandidates.length}건`]
          ]}
        />
        <p className="modal-copy">
          현재 앱 데이터는 브라우저 로컬 저장소에 저장됩니다. 백엔드 연결 전에는 JSON 백업 파일로 현재 목업 상태를 보관할 수 있습니다.
        </p>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            닫기
          </button>
          <button className="primary-button" type="button" onClick={exportSnapshot}>
            <Download size={17} />
            데이터 백업
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function ReviewReportModal({ contest, round, judges, submissions, reviewScores, onClose, onNotify }) {
  const criteria = getRoundScoreCriteria(round);
  const judgeRows = judges.map((judge) => {
    const records = reviewScores.filter((record) => (
      record.judgeId != null
        ? String(record.judgeId) === String(judge.id)
        : record.judgeName === judge.name
    ));
    const totals = records.map(getReviewTotal);
    const average = totals.length ? getAverage(totals) : judge.avgScore || 0;
    const lastSubmittedAt = records.at(-1)?.submittedAt ?? "-";

    return {
      ...judge,
      reviewCount: records.length,
      average,
      lastSubmittedAt
    };
  });
  const submissionRows = submissions.map((submission) => {
    const records = reviewScores.filter((record) => record.submissionId === submission.id);
    const totals = records.map(getReviewTotal);
    const average = getAverage(totals);
    const spread = totals.length ? Math.max(...totals) - Math.min(...totals) : 0;

    return {
      ...submission,
      reviewCount: records.length,
      average,
      spread
    };
  });
  const detailRows = reviewScores.map((record) => {
    const submission = submissions.find((item) => item.id === record.submissionId);

    return {
      ...record,
      submissionTitle: submission?.title ?? record.submissionId,
      team: submission?.team ?? "-",
      total: getReviewTotal(record)
    };
  });

  const exportCsv = () => {
    downloadReviewReportCsv({ contest, round, criteria, judgeRows, submissionRows, detailRows });
    onNotify?.("엑셀용 평가표 CSV를 다운로드했습니다.");
  };

  return (
    <ModalFrame title="심사 평가 현황" description={`${contest.title} · ${round?.name ?? "전체 라운드"}`} onClose={onClose} size="wide">
      <div className="review-report-modal">
        <div className="report-toolbar">
          <div className="report-summary">
            {round && <span className="inline-state muted">{round.name}</span>}
            <span className="inline-state muted">심사위원 {judges.length}명</span>
            <span className="inline-state muted">평가 기록 {reviewScores.length}건</span>
            <span className="inline-state muted">제출물 {submissions.length}건</span>
          </div>
          <button className="primary-button" type="button" onClick={exportCsv}>
            <Download size={17} />
            엑셀용 CSV
          </button>
        </div>

        <ReportTable
          title="심사위원별 요약"
          headers={["심사위원", "역할", "배정", "완료", "평가 기록", "평균", "최근 제출"]}
          rows={judgeRows.map((judge) => [
            judge.name,
            judge.role,
            `${judge.assigned}건`,
            `${judge.completed}건`,
            `${judge.reviewCount}건`,
            judge.average ? `${judge.average.toFixed(1)}점` : "-",
            judge.lastSubmittedAt
          ])}
        />

        <ReportTable
          title="제출물별 요약"
          headers={["제출물", "팀", "평가 인원", "평균", "편차", "상태"]}
          rows={submissionRows.map((submission) => [
            submission.title,
            submission.team,
            `${submission.reviewCount}명`,
            submission.average ? `${submission.average.toFixed(1)}점` : "-",
            `${submission.spread.toFixed(1)}점`,
            submission.review
          ])}
        />

        <ReportTable
          title="세부 평가 기록"
          headers={["심사위원", "제출물", "팀", ...criteria.map((criterion) => criterion.label), "총점", "제출시각"]}
          rows={detailRows.map((record) => [
            record.judgeName,
            record.submissionTitle,
            record.team,
            ...criteria.map((criterion) => record.scores[criterion.id] ?? ""),
            record.total,
            record.submittedAt
          ])}
          emptyText="아직 제출된 세부 평가 기록이 없습니다."
        />
      </div>
    </ModalFrame>
  );
}

function ReportTable({ title, headers, rows, emptyText = "표시할 데이터가 없습니다." }) {
  return (
    <section className="report-section">
      <div className="report-section-head">
        <strong>{title}</strong>
        <span>{rows.length}행</span>
      </div>
      <div className="report-table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${title}-${index}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState title={emptyText} description="심사위원이 평가를 제출하면 이 영역에 표시됩니다." />}
      </div>
    </section>
  );
}

function downloadReviewReportCsv({ contest, round, criteria, judgeRows, submissionRows, detailRows }) {
  const rows = [
    ["대회명", contest.title],
    ["대회ID", contest.id],
    ["평가 라운드", round?.name ?? "전체"],
    [],
    ["심사위원별 요약"],
    ["심사위원", "역할", "배정", "완료", "평가 기록", "평균", "최근 제출"],
    ...judgeRows.map((judge) => [
      judge.name,
      judge.role,
      judge.assigned,
      judge.completed,
      judge.reviewCount,
      judge.average ? judge.average.toFixed(1) : "",
      judge.lastSubmittedAt
    ]),
    [],
    ["제출물별 요약"],
    ["제출물", "팀", "평가 인원", "평균", "편차", "상태"],
    ...submissionRows.map((submission) => [
      submission.title,
      submission.team,
      submission.reviewCount,
      submission.average ? submission.average.toFixed(1) : "",
      submission.spread.toFixed(1),
      submission.review
    ]),
    [],
    ["세부 평가 기록"],
    ["심사위원", "제출물", "팀", ...criteria.map((criterion) => criterion.label), "총점", "제출시각"],
    ...detailRows.map((record) => [
      record.judgeName,
      record.submissionTitle,
      record.team,
      ...criteria.map((criterion) => record.scores[criterion.id] ?? ""),
      record.total,
      record.submittedAt
    ])
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(toCsvCell).join(",")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `${contest.id}-${round?.id ?? "all"}-review-report.csv`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function toCsvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function defaultReviewLinkExpiry() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function ReviewLinkModal({ contest, round, judge, onClose, onNotify, onIssue, onRevoke }) {
  const [reviewUrl, setReviewUrl] = useState(() => onIssue ? "" : getReviewUrl(contest.id, round?.id));
  const [expiresAt, setExpiresAt] = useState(defaultReviewLinkExpiry);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isIssuing, setIsIssuing] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    if (!reviewUrl) {
      setQrDataUrl("");
      return undefined;
    }
    let alive = true;

    QRCode.toDataURL(reviewUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: "#00205B",
        light: "#ffffff"
      }
    }).then((dataUrl) => {
      if (alive) {
        setQrDataUrl(dataUrl);
      }
    });

    return () => {
      alive = false;
    };
  }, [reviewUrl]);

  const copyReviewUrl = async () => {
    if (!reviewUrl) {
      return;
    }
    await navigator.clipboard.writeText(reviewUrl);
    onNotify?.("심사 링크를 복사했습니다.");
  };

  const issueReviewUrl = async () => {
    if (!onIssue || !judge?.id || !expiresAt) {
      return;
    }
    setIsIssuing(true);
    try {
      const issued = await onIssue(judge.id, expiresAt);
      if (issued?.reviewUrl) {
        setReviewUrl(issued.reviewUrl);
      }
    } finally {
      setIsIssuing(false);
    }
  };

  const revokeReviewUrl = async () => {
    if (!onRevoke || !judge?.id) {
      return;
    }
    setIsRevoking(true);
    try {
      await onRevoke(judge.id);
      setReviewUrl("");
    } finally {
      setIsRevoking(false);
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = `${contest.id}-${round?.id ?? "review"}-qr.png`;
    anchor.click();
    onNotify?.("심사 QR 이미지를 다운로드했습니다.");
  };

  return (
    <ModalFrame
      title="심사 링크/QR 생성"
      description={`${contest.title} · ${judge?.name ?? round?.name ?? "심사"}`}
      onClose={onClose}
    >
      <div className="review-link-modal">
        <div className="qr-preview">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`${contest.title} 심사 QR`} />
          ) : (
            <div className="qr-loading">
              <QrCode size={36} aria-hidden="true" />
              <span>QR 생성 중</span>
            </div>
          )}
        </div>
        <div className="review-link-info">
          <div className="review-link-summary">
            <Link2 size={18} aria-hidden="true" />
            <div>
              <strong>심사위원 전용 링크</strong>
              <span>{judge ? `${judge.name} 심사위원에게만 전달합니다.` : `${round?.name ?? "선택 심사"} 라운드에 전달합니다.`}</span>
            </div>
          </div>
          {onIssue && (
            <label>
              <span>링크 만료 시각</span>
              <input
                type="datetime-local"
                value={expiresAt}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </label>
          )}
          <label className="copy-field">
            <span>전달 URL</span>
            <input value={reviewUrl} readOnly placeholder="링크를 발급해 주세요." onFocus={(event) => event.currentTarget.select()} />
          </label>
          <div className="modal-actions">
            {onIssue && (
              <button className="primary-button" type="button" disabled={isIssuing || !expiresAt} onClick={issueReviewUrl}>
                <Link2 size={17} />
                {isIssuing ? "발급 중..." : reviewUrl ? "새 링크 발급" : "링크 발급"}
              </button>
            )}
            <button className="secondary-button" type="button" disabled={!reviewUrl} onClick={copyReviewUrl}>
              <Copy size={17} />
              링크 복사
            </button>
            <button className="secondary-button" type="button" disabled={!reviewUrl} onClick={downloadQr}>
              <Download size={17} />
              QR 저장
            </button>
            {onRevoke && (
              <button className="danger-button" type="button" disabled={isRevoking} onClick={revokeReviewUrl}>
                <Trash2 size={17} />
                {isRevoking ? "폐기 중..." : "링크 폐기"}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}

function PrepareReviewEntriesModal({ round, submissions, onClose, onSubmit }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSubmission = (submissionId) => {
    setSelectedIds((current) => current.includes(submissionId)
      ? current.filter((id) => id !== submissionId)
      : [...current, submissionId]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit?.(round, selectedIds);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalFrame title="수동 평가 대상 선택" description={round?.name} onClose={onClose}>
      <div className="modal-info-stack">
        <p className="modal-copy">이번 라운드에서 심사할 제출물을 선택하세요.</p>
        <div className="selected-members">
          {submissions.map((submission) => (
            <label key={submission.id}>
              <input
                type="checkbox"
                checked={selectedIds.includes(submission.id)}
                onChange={() => toggleSubmission(submission.id)}
              />
              <span>
                <strong>{submission.title}</strong>
                <small>{submission.team} · {submission.id}</small>
              </span>
            </label>
          ))}
          {submissions.length === 0 && <p className="modal-copy">확정된 제출물이 없습니다.</p>}
        </div>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>취소</button>
          <button className="primary-button" type="button" disabled={selectedIds.length === 0 || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "준비 중..." : `${selectedIds.length}건 준비`}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function ConfirmReviewActionModal({ title, description, message, confirmLabel, danger = false, onClose, onConfirm }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalFrame title={title} description={description} onClose={onClose}>
      <div className="modal-info-stack">
        <p className="modal-copy">{message}</p>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>취소</button>
          <button className={danger ? "danger-button" : "primary-button"} type="button" disabled={isSubmitting} onClick={handleConfirm}>
            {isSubmitting ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function FinalizeReviewRoundModal({ round, entries, onClose, onSubmit }) {
  const isAlreadyFinalized = ["완료", "FINALIZED"].includes(round?.status);
  const isManual = round?.passRule === "manual" && !isAlreadyFinalized;
  const isManualWithoutReview = isManual && round?.targetType === "manual";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [decisions, setDecisions] = useState(() => Object.fromEntries(entries.map((entry, index) => [entry.id, {
    status: "NOT_SELECTED",
    reason: "관리자 확정",
    rankNo: isManualWithoutReview ? index + 1 : ""
  }])));

  const updateDecision = (entryId, field, value) => {
    setDecisions((current) => ({
      ...current,
      [entryId]: { ...current[entryId], [field]: value }
    }));
  };

  const handleSubmit = async () => {
    if (isManualWithoutReview) {
      const ranks = entries.map((entry) => Number(decisions[entry.id]?.rankNo));
      const validRanks = new Set(ranks);
      if (validRanks.size !== entries.length || ranks.some((rank) => rank < 1 || rank > entries.length)) {
        setValidationError(`전체 순위를 1위부터 ${entries.length}위까지 중복 없이 입력해 주세요.`);
        return;
      }
    }
    setValidationError("");
    const manualDecisions = isManual ? entries.map((entry) => ({
      entryId: entry.id,
      status: decisions[entry.id]?.status ?? "NOT_SELECTED",
      reason: decisions[entry.id]?.reason?.trim() || "관리자 확정",
      rankNo: isManualWithoutReview ? Number(decisions[entry.id]?.rankNo) : null
    })) : [];
    setIsSubmitting(true);
    try {
      await onSubmit?.(round, manualDecisions);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalFrame title="심사 결과 산출" description={round?.name} onClose={onClose}>
      <div className="modal-info-stack">
        <p className="modal-copy">
          {isManual
            ? "평가 대상별 통과 여부를 확정합니다."
            : isAlreadyFinalized
              ? "확정된 최종 라운드 결과로 수상 후보를 다시 산출합니다."
              : "입력한 통과 규칙으로 라운드 결과를 확정합니다. 최종 라운드라면 수상 후보도 함께 산출합니다."}
        </p>
        {isManual && (
          <div className="selected-members">
            {entries.map((entry) => (
              <div key={entry.id}>
                <span>
                  <strong>{entry.submissionTitle}</strong>
                  <small>{entry.teamName} · {entry.finalScore ?? "점수 미산출"}</small>
                </span>
                <select value={decisions[entry.id]?.status} onChange={(event) => updateDecision(entry.id, "status", event.target.value)}>
                  <option value="SELECTED">통과</option>
                  <option value="NOT_SELECTED">탈락</option>
                </select>
                <input
                  value={decisions[entry.id]?.reason ?? ""}
                  onChange={(event) => updateDecision(entry.id, "reason", event.target.value)}
                  placeholder="판정 사유"
                />
                {isManualWithoutReview && (
                  <input
                    type="number"
                    min="1"
                    max={entries.length}
                    value={decisions[entry.id]?.rankNo ?? ""}
                    onChange={(event) => updateDecision(entry.id, "rankNo", event.target.value)}
                    placeholder="전체 순위"
                    required
                  />
                )}
              </div>
            ))}
            {entries.length === 0 && <p className="modal-copy">확정할 평가 대상이 없습니다.</p>}
          </div>
        )}
        {validationError && <p className="form-message">{validationError}</p>}
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>취소</button>
          <button className="primary-button" type="button" disabled={isSubmitting || (isManual && entries.length === 0)} onClick={handleSubmit}>
            {isSubmitting ? "산출 중..." : isAlreadyFinalized ? "수상 후보 산출" : "결과 확정"}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

const stageStatusLabels = {
  PREPARING: "준비중",
  OPEN: "진행중",
  COMPLETED: "완료"
};

const nextStageStatus = {
  PREPARING: "OPEN",
  OPEN: "COMPLETED"
};

function StageStatusModal({ contest, onClose, onUpdate }) {
  const manageableStages = (contest?.stages ?? []).filter(
    (stage) => !["REVIEW", "PRESENTATION"].includes(stage.stageType)
  );
  const [stages, setStages] = useState(manageableStages);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    setStages(manageableStages);
  }, [contest?.stages]);

  const updateStatus = async (stage) => {
    const nextStatus = nextStageStatus[stage.status];
    if (!nextStatus) {
      return;
    }
    setUpdatingId(stage.id);
    try {
      if (await onUpdate?.(stage.id, nextStatus)) {
        setStages((current) => current.map((item) => item.id === stage.id ? { ...item, status: nextStatus } : item));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <ModalFrame title="대회 단계 운영" description={contest?.title} onClose={onClose}>
      <div className="modal-info-stack">
        <p className="modal-copy">단계는 준비중 → 진행중 → 완료 순서로만 전환할 수 있습니다.</p>
        <div className="review-submission-list">
          {stages.map((stage) => (
            <div className="review-submission" key={stage.id}>
              <span>
                <strong>{stage.name}</strong>
                <small>{stage.stageType} · {stageStatusLabels[stage.status] ?? stage.status}</small>
              </span>
              <button
                className="secondary-button"
                type="button"
                disabled={!nextStageStatus[stage.status] || updatingId === stage.id}
                onClick={() => updateStatus(stage)}
              >
                {updatingId === stage.id
                  ? "변경 중"
                  : nextStageStatus[stage.status]
                    ? `${stageStatusLabels[nextStageStatus[stage.status]]} 전환`
                    : "완료"}
              </button>
            </div>
          ))}
          {stages.length === 0 && <p className="modal-copy">운영할 대회 단계가 없습니다.</p>}
        </div>
      </div>
    </ModalFrame>
  );
}

function toLocalDateTimeInput(value) {
  return typeof value === "string" ? value.slice(0, 16) : "";
}

function ExtendReviewRoundModal({ round, onClose, onSubmit }) {
  const [endsAt, setEndsAt] = useState(toLocalDateTimeInput(round?.endsAt));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isValid = Boolean(endsAt) && (!round?.endsAt || new Date(endsAt) > new Date(round.endsAt));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit?.(round, endsAt);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalFrame title="심사 마감 연장" description={round?.name} onClose={onClose}>
      <div className="form-stack">
        <label>
          <span>현재 종료 시각</span>
          <input value={toLocalDateTimeInput(round?.endsAt)} readOnly />
        </label>
        <label>
          <span>새 종료 시각</span>
          <input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required />
        </label>
        {!isValid && <p className="form-message">현재 종료 시각보다 늦은 시각을 입력해 주세요.</p>}
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>취소</button>
          <button className="primary-button" type="button" disabled={!isValid || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "연장 중..." : "마감 연장"}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function AssignmentManagementModal({ judge, round, onClose, onList, onCancel, onReassign, onUpdateDueAt }) {
  const [assignments, setAssignments] = useState([]);
  const [dueAtById, setDueAtById] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const loadAssignments = async () => {
    setIsLoading(true);
    setError("");
    try {
      const records = await onList?.(round, judge.id) ?? [];
      setAssignments(records);
      setDueAtById(Object.fromEntries(records.map((assignment) => [
        assignment.id,
        toLocalDateTimeInput(assignment.dueAt || round?.endsAt)
      ])));
    } catch (nextError) {
      setError(nextError?.message || "심사 배정 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [judge.id, round?.serverId]);

  const runAction = async (assignment, action) => {
    setBusyId(assignment.id);
    try {
      const succeeded = await action();
      if (succeeded) {
        await loadAssignments();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ModalFrame title="심사 배정 관리" description={`${judge?.name} · ${round?.name}`} onClose={onClose}>
      <div className="modal-info-stack">
        {isLoading && <p className="modal-copy">배정 목록을 불러오는 중입니다.</p>}
        {error && <p className="form-message">{error}</p>}
        {!isLoading && assignments.map((assignment) => (
          <div className="review-submission" key={assignment.id}>
            <div className="review-submission-head">
              <div>
                <strong>{assignment.submissionTitle}</strong>
                <span>{assignment.submissionPublicId} · {assignment.status}</span>
              </div>
            </div>
            {assignment.status !== "COMPLETED" && (
              <label>
                <span>배정 마감</span>
                <input
                  type="datetime-local"
                  value={dueAtById[assignment.id] ?? ""}
                  onChange={(event) => setDueAtById((current) => ({ ...current, [assignment.id]: event.target.value }))}
                />
              </label>
            )}
            <div className="modal-actions">
              {assignment.status === "ASSIGNED" && (
                <>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={busyId === assignment.id || !dueAtById[assignment.id]}
                    onClick={() => runAction(assignment, () => onUpdateDueAt?.(round, judge.id, assignment.id, dueAtById[assignment.id]))}
                  >
                    마감 변경
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    disabled={busyId === assignment.id}
                    onClick={() => runAction(assignment, () => onCancel?.(round, judge.id, assignment.id))}
                  >
                    배정 취소
                  </button>
                </>
              )}
              {assignment.status === "CANCELED" && (
                <button
                  className="primary-button"
                  type="button"
                  disabled={busyId === assignment.id || !dueAtById[assignment.id]}
                  onClick={() => runAction(assignment, () => onReassign?.(round, judge.id, assignment.id, dueAtById[assignment.id]))}
                >
                  다시 배정
                </button>
              )}
              {assignment.status === "COMPLETED" && <span>심사 완료</span>}
            </div>
          </div>
        ))}
        {!isLoading && !error && assignments.length === 0 && (
          <p className="modal-copy">이 심사위원에게 배정된 제출물이 없습니다.</p>
        )}
      </div>
    </ModalFrame>
  );
}
