import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AppFooter } from "../../components/common/AppFooter.jsx";
import { ContestApplicationForm } from "../../components/forms/ContestApplicationForm.jsx";
import { ModalFrame } from "../../components/modals/ModalFrame.jsx";
import { ContestPublicView } from "../../components/public/ContestPublicView.jsx";
import {
  findParticipantApplication,
  getContestEngagement,
  getContestReactionKey,
  isContestApplyOpen
} from "../../lib/contest.js";

export function ContestPublicDetailPage({
  contest,
  onBack,
  session,
  teams = [],
  onApplyContest,
  onRecordView,
  onToggleLike,
  onSearchParticipants,
  isLoading = false,
  isApplicationDataLoading = false,
  loadError = "",
  onNotify
}) {
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const viewedKeyRef = useRef("");
  const application = useMemo(
    () => (contest && session ? findParticipantApplication(teams, contest.id, session) : null),
    [contest, session, teams]
  );
  const engagement = useMemo(() => (contest ? getContestEngagement(contest) : null), [contest]);
  const reactionKey = useMemo(() => getContestReactionKey(session), [session]);

  useEffect(() => {
    if (!contest?.id || !onRecordView) {
      return;
    }

    const viewedKey = `${contest.id}:${reactionKey}`;
    if (viewedKeyRef.current === viewedKey) {
      return;
    }

    viewedKeyRef.current = viewedKey;
    onRecordView(contest.id);
  }, [contest?.id, onRecordView, reactionKey]);

  if (!contest) {
    return (
      <main className="contest-public-page">
        <section className="public-empty">
          <ShieldCheck size={34} aria-hidden="true" />
          <h1>{isLoading ? "대회 정보를 불러오는 중입니다" : "공개할 대회를 찾을 수 없습니다"}</h1>
          {loadError && <p>{loadError}</p>}
          <button className="secondary-button" type="button" onClick={onBack}>
            <ArrowLeft size={17} />
            이전 화면
          </button>
        </section>
        <AppFooter variant="public" />
      </main>
    );
  }

  const isParticipant = session?.role === "participant";
  const isOpen = isContestApplyOpen(contest);
  const canApply = isParticipant && isOpen && !application && !isApplicationDataLoading;
  const applyLabel = isApplicationDataLoading
    ? "신청 정보 확인 중"
    : application
      ? "신청 완료"
      : isOpen
        ? "참가 신청"
        : "신청 마감";
  const backLabel = !session ? "대회 목록" : isParticipant ? "참가자 화면" : "관리자 화면";
  const handleShare = async () => {
    if (typeof window === "undefined") {
      return;
    }

    const shareUrl = window.location.href;
    const shareData = {
      title: contest.title,
      text: contest.summary,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        onNotify?.("공유 창을 열었습니다.");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        onNotify?.("공유 링크를 복사했습니다.");
        return;
      }

      onNotify?.("공유 링크를 복사할 수 없습니다.");
    } catch (error) {
      if (error?.name !== "AbortError") {
        onNotify?.("공유를 완료하지 못했습니다.");
      }
    }
  };

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
        engagement={engagement}
        canReact={isParticipant}
        isLiked={contest.likedByMe ?? engagement?.likedBy.includes(reactionKey)}
        onLike={() => onToggleLike?.(contest.id)}
        onShare={handleShare}
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
            onSearchParticipants={onSearchParticipants}
            onSubmit={async (form) => {
              if (await onApplyContest?.(form)) {
                setIsApplyOpen(false);
              }
            }}
          />
        </ModalFrame>
      )}
      <AppFooter variant="public" />
    </main>
  );
}
