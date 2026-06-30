import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Award, Copy, Download, Link2, QrCode } from "lucide-react";
import { DetailList, EmptyState } from "../common/CommonUi.jsx";
import { ContestForm, JudgeForm, SubmissionForm } from "../forms/CompetitionForms.jsx";
import { getContestTitle, getReviewUrl } from "../../lib/contest.js";
import { getAverage, getReviewTotal } from "../../lib/review.js";
import { ModalFrame } from "./ModalFrame.jsx";

export function ModalRoot({
  modal,
  contests,
  teams,
  submissions,
  judgingAssignments,
  reviewScores,
  selectedContest,
  selectedContestId,
  onClose,
  onSaveContest,
  onAddSubmission,
  onAddJudge,
  onConfirmAwards,
  onNotify
}) {
  if (!modal) {
    return null;
  }

  const { type, payload = {} } = modal;
  const contestTeams = teams.filter((team) => team.contestId === selectedContestId);
  const contestSubmissions = submissions.filter((submission) => submission.contestId === selectedContestId);
  const contestJudges = judgingAssignments.filter((judge) => judge.contestId === selectedContestId);
  const contestReviewScores = reviewScores.filter((record) => record.contestId === selectedContestId);

  if (type === "contest") {
    const contest = payload.contest;
    return (
      <ModalFrame title={contest ? "대회 편집" : "대회 생성"} description="운영에 필요한 기본 정보와 공개 상세 페이지를 함께 관리합니다." onClose={onClose} size="wide">
        <ContestForm contest={contest} onSubmit={onSaveContest} onClose={onClose} />
      </ModalFrame>
    );
  }

  if (type === "contestRules") {
    return (
      <ModalFrame title="대회 세부 조건" description={selectedContest.title} onClose={onClose}>
        <div className="modal-info-stack">
          <DetailList
            items={[
              ["참가 방식", selectedContest.type],
              ["최대 팀원", "5명"],
              ["중복 신청", "대회별 1회"],
              ["심사 기준", "창의성 30, 구현 완성도 30, 문제 해결성 25, 발표 전달력 15"]
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
    return <ReviewLinkModal contest={payload.contest ?? selectedContest} onClose={onClose} onNotify={onNotify} />;
  }

  if (type === "reviewReport") {
    return (
      <ReviewReportModal
        contest={selectedContest}
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
    return (
      <ModalFrame title={submission.title} description="제출물 상세" onClose={onClose}>
        <DetailList
          items={[
            ["제출번호", submission.id],
            ["팀", submission.team],
            ["파일 수", `${submission.files}개`],
            ["접수시각", submission.submittedAt],
            ["무결성", submission.hashReady ? "해시 생성" : "대기"],
            ["심사", submission.review]
          ]}
        />
      </ModalFrame>
    );
  }

  if (type === "judge") {
    return (
      <ModalFrame title="심사위원 추가" description={selectedContest.title} onClose={onClose}>
        <JudgeForm onSubmit={onAddJudge} onClose={onClose} />
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
            ["배정", `${judge.assigned}건`],
            ["완료", `${judge.completed}건`],
            ["평균 점수", judge.avgScore ? `${judge.avgScore}점` : "산출 전"]
          ]}
        />
      </ModalFrame>
    );
  }

  if (type === "confirmAwards") {
    return (
      <ModalFrame title="수상 결과 확정" description={selectedContest.title} onClose={onClose}>
        <div className="modal-info-stack">
          <p className="modal-copy">
            후보 {payload.count}건을 확정 상태로 변경합니다. 이후 블록체인 검증 메타데이터 생성 단계로 이어질 수 있습니다.
          </p>
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              취소
            </button>
            <button className="primary-button" type="button" onClick={onConfirmAwards}>
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

function ReviewReportModal({ contest, judges, submissions, reviewScores, onClose, onNotify }) {
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
    downloadReviewReportCsv({ contest, judgeRows, submissionRows, detailRows });
    onNotify?.("엑셀용 평가표 CSV를 다운로드했습니다.");
  };

  return (
    <ModalFrame title="심사 평가 현황" description={contest.title} onClose={onClose} size="wide">
      <div className="review-report-modal">
        <div className="report-toolbar">
          <div className="report-summary">
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
          headers={["심사위원", "제출물", "팀", "창의성", "구현", "문제 해결", "발표", "총점", "제출시각"]}
          rows={detailRows.map((record) => [
            record.judgeName,
            record.submissionTitle,
            record.team,
            record.scores.creativity,
            record.scores.completion,
            record.scores.impact,
            record.scores.delivery,
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

function downloadReviewReportCsv({ contest, judgeRows, submissionRows, detailRows }) {
  const rows = [
    ["대회명", contest.title],
    ["대회ID", contest.id],
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
    ["심사위원", "제출물", "팀", "창의성", "구현 완성도", "문제 해결성", "발표 전달력", "총점", "제출시각"],
    ...detailRows.map((record) => [
      record.judgeName,
      record.submissionTitle,
      record.team,
      record.scores.creativity,
      record.scores.completion,
      record.scores.impact,
      record.scores.delivery,
      record.total,
      record.submittedAt
    ])
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(toCsvCell).join(",")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `${contest.id}-review-report.csv`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function toCsvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function ReviewLinkModal({ contest, onClose, onNotify }) {
  const reviewUrl = getReviewUrl(contest.id);
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
    anchor.download = `${contest.id}-review-qr.png`;
    anchor.click();
    onNotify?.("심사 QR 이미지를 다운로드했습니다.");
  };

  return (
    <ModalFrame title="심사 링크/QR 생성" description={contest.title} onClose={onClose}>
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
              <span>이 링크에서는 관리자 메뉴 없이 이름 입력 후 심사만 진행합니다.</span>
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
