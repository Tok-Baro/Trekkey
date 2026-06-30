import React, { useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { ContestApplicationForm } from "../../components/forms/ContestApplicationForm.jsx";
import { ModalFrame } from "../../components/modals/ModalFrame.jsx";
import { ContestPublicView } from "../../components/public/ContestPublicView.jsx";
import { findParticipantApplication, isContestApplyOpen } from "../../lib/contest.js";

export function ContestPublicDetailPage({ contest, onBack, session, teams = [], onApplyContest }) {
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const application = useMemo(
    () => (contest && session ? findParticipantApplication(teams, contest.id, session) : null),
    [contest, session, teams]
  );

  if (!contest) {
    return (
      <main className="contest-public-page">
        <section className="public-empty">
          <ShieldCheck size={34} aria-hidden="true" />
          <h1>공개할 대회를 찾을 수 없습니다</h1>
          <button className="secondary-button" type="button" onClick={onBack}>
            <ArrowLeft size={17} />
            관리자 화면
          </button>
        </section>
      </main>
    );
  }

  const isParticipant = session?.role === "participant";
  const isOpen = isContestApplyOpen(contest);
  const canApply = isParticipant && isOpen && !application;
  const applyLabel = application ? "신청 완료" : isOpen ? "참가 신청" : "신청 마감";
  const backLabel = isParticipant ? "참가자 화면" : "관리자 화면";

  return (
    <main className="contest-public-page">
      <header className="contest-public-topbar">
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          {backLabel}
        </button>
        <span>Trekkey 공개 공고</span>
      </header>
      <ContestPublicView
        contest={contest}
        showApplyButton={isParticipant}
        applyLabel={applyLabel}
        applyDisabled={!canApply}
        onApply={() => {
          if (canApply) {
            setIsApplyOpen(true);
          }
        }}
      />

      {isApplyOpen && (
        <ModalFrame title="참가 신청" description={contest.title} onClose={() => setIsApplyOpen(false)} size="wide">
          <ContestApplicationForm
            contest={contest}
            session={session}
            onClose={() => setIsApplyOpen(false)}
            onSubmit={(form) => {
              if (onApplyContest?.(form)) {
                setIsApplyOpen(false);
              }
            }}
          />
        </ModalFrame>
      )}
    </main>
  );
}
