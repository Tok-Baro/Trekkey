import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Award, Copy, Download, Link2, Pencil, QrCode, Trash2 } from "lucide-react";
import { DetailList, EmptyState } from "../common/CommonUi.jsx";
import { ContestForm, JudgeForm, SubmissionForm } from "../forms/CompetitionForms.jsx";
import { getContestTitle, getReviewUrl } from "../../lib/contest.js";
import { downloadJson } from "../../lib/exportCsv.js";
import {
  getAverage,
  getReviewTotal,
  getRoundScoreCriteria,
  isRecordInRound,
  normalizeEvaluationRounds
} from "../../lib/review.js";
import { downloadSubmissionFiles, formatFileSize, getSubmissionFileCount } from "../../lib/submissionFiles.js";
import { ModalFrame } from "./ModalFrame.jsx";

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
  onAddSubmission,
  onAddJudge,
  onUpdateJudge,
  onDeleteJudge,
  onConfirmAwards,
  onNotify
}) {
  if (!modal) {
    return null;
  }

  const { type, payload = {} } = modal;
  const contestTeams = teams.filter((team) => team.contestId === selectedContestId);
  const contestSubmissions = submissions.filter((submission) => submission.contestId === selectedContestId);
  const selectedRounds = normalizeEvaluationRounds(selectedContest.evaluationRounds, selectedContestId);
  const modalRound = payload.round ?? selectedRounds.find((round) => round.id === payload.roundId) ?? selectedRounds[0];
  const contestJudges = judgingAssignments.filter(
    (judge) => judge.contestId === selectedContestId && (!modalRound || isRecordInRound(judge, modalRound, selectedContest))
  );
  const contestReviewScores = reviewScores.filter(
    (record) => record.contestId === selectedContestId && (!modalRound || isRecordInRound(record, modalRound, selectedContest))
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
        <ContestForm contest={contest} initialStepId={payload.initialStepId} onSubmit={onSaveContest} onClose={onClose} />
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

  if (type === "reviewLink") {
    return <ReviewLinkModal contest={payload.contest ?? selectedContest} round={payload.round ?? modalRound} onClose={onClose} onNotify={onNotify} />;
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
            ["제출 상태", "팀 카드 하단에서 제출 완료 여부 확인"]
          ]}
        />
      </ModalFrame>
    );
  }

  if (type === "teamDetail") {
    const { team } = payload;
    return (
      <ModalFrame title={team.name} description="참가 신청 상세" onClose={onClose}>
        <DetailList
          items={[
            ["신청번호", team.id],
            ["대회", getContestTitle(team.contestId, contests)],
            ["대표자", team.leader],
            ["소속", team.major],
            ["팀원", `${team.members}명`],
            ["상태", team.status],
            ["제출", team.submitted ? "완료" : "제출 전"],
            ...(team.applicantEmail ? [["이메일", team.applicantEmail]] : []),
            ...(team.phone ? [["연락처", team.phone]] : []),
            ...(team.motivation ? [["지원동기", team.motivation]] : [])
          ]}
        />
      </ModalFrame>
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
      const result = downloadSubmissionFiles(submission);
      onNotify?.(result.message);
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
          rounds={selectedRounds}
          defaultRoundId={payload.roundId ?? modalRound?.id}
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
    const canConfirm = Number(payload.count || 0) > 0;

    return (
      <ModalFrame title="수상 결과 확정" description={selectedContest.title} onClose={onClose}>
        <div className="modal-info-stack">
          <p className="modal-copy">
            {canConfirm
              ? `후보 ${payload.count}건을 확정 상태로 변경합니다. 이후 블록체인 검증 메타데이터 생성 단계로 이어질 수 있습니다.`
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
      <ModalFrame title={`${candidate.prize} · ${candidate.team}`} description="수상 후보 상세" onClose={onClose}>
        <DetailList
          items={[
            ["순위", `${candidate.rank}위`],
            ["점수", `${candidate.score}점`],
            ["인원", `${candidate.members}명`],
            ["상태", candidate.status],
            ["상장번호", candidate.certificateNo]
          ]}
        />
      </ModalFrame>
    );
  }

  return null;
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
    const records = reviewScores.filter((record) => record.judgeName === judge.name);
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

function ReviewLinkModal({ contest, round, onClose, onNotify }) {
  const reviewUrl = getReviewUrl(contest.id, round?.id);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
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
    await navigator.clipboard.writeText(reviewUrl);
    onNotify?.("심사 링크를 복사했습니다.");
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
    <ModalFrame title="심사 링크/QR 생성" description={`${contest.title} · ${round?.name ?? "심사"}`} onClose={onClose}>
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
              <span>{round?.name ?? "선택 심사"} 라운드의 심사위원에게 전달합니다.</span>
            </div>
          </div>
          <label className="copy-field">
            <span>전달 URL</span>
            <input value={reviewUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
          </label>
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={copyReviewUrl}>
              <Copy size={17} />
              링크 복사
            </button>
            <button className="primary-button" type="button" onClick={downloadQr}>
              <Download size={17} />
              QR 저장
            </button>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
