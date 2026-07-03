import React from "react";
import { Eye, Heart, ImagePlus, Share2, UsersRound } from "lucide-react";
import { StatusBadge } from "../common/CommonUi.jsx";
import { getContestEngagement } from "../../lib/contest.js";

function formatEngagementCount(value) {
  const count = Number(value) || 0;

  if (count >= 10000) {
    return `${(count / 10000).toFixed(count >= 100000 ? 0 : 1)}만`;
  }

  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}천`;
  }

  return String(count);
}

export function ContestPublicView({
  contest,
  showApplyButton = true,
  applyLabel = "참가 신청",
  applyDisabled = false,
  engagement,
  canReact = false,
  isLiked = false,
  onLike,
  onShare,
  onApply
}) {
  const tags = String(contest.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const stats = engagement ?? getContestEngagement(contest);

  return (
    <>
      <section className="contest-public-hero">
        <div className="contest-public-copy">
          <div className="public-badges">
            <StatusBadge status={contest.status} />
            <span>{contest.type}</span>
          </div>
          <h1>{contest.title}</h1>
          <p>{contest.summary}</p>
          <div className="public-tags">
            {tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          <div className="public-engagement-bar" aria-label="대회 관심 지표">
            <span>
              <Eye size={16} aria-hidden="true" />
              조회 {formatEngagementCount(stats.views)}
            </span>
            <button
              className={isLiked ? "is-active" : ""}
              type="button"
              aria-pressed={isLiked}
              disabled={!canReact || !onLike}
              title={canReact ? "좋아요" : "참가자 로그인 후 좋아요를 누를 수 있습니다"}
              onClick={onLike}
            >
              <Heart size={16} fill={isLiked ? "currentColor" : "none"} aria-hidden="true" />
              좋아요 {formatEngagementCount(stats.likes)}
            </button>
            {onShare && (
              <button type="button" title="공유" onClick={onShare}>
                <Share2 size={16} aria-hidden="true" />
                공유
              </button>
            )}
          </div>
          <dl className="hero-info-grid">
            <div>
              <dt>주최/주관</dt>
              <dd>{contest.department}</dd>
            </div>
            <div>
              <dt>접수 기간</dt>
              <dd>{contest.applicationPeriod}</dd>
            </div>
            <div>
              <dt>제출 마감</dt>
              <dd>{contest.submissionDue}</dd>
            </div>
            <div>
              <dt>참가 대상</dt>
              <dd>{contest.target}</dd>
            </div>
            <div>
              <dt>시상 규모</dt>
              <dd>{contest.awards}개</dd>
            </div>
          </dl>
          {showApplyButton && (
            <button className="primary-button hero-apply-button" type="button" disabled={applyDisabled} onClick={onApply}>
              <UsersRound size={17} />
              {applyLabel}
            </button>
          )}
        </div>
        <div className="contest-public-poster">
          {contest.posterUrl ? (
            <img src={contest.posterUrl} alt={`${contest.title} 포스터`} />
          ) : (
            <div>
              <ImagePlus size={42} aria-hidden="true" />
              <strong>포스터 미등록</strong>
              <span>관리자 편집에서 대표 이미지를 업로드하세요.</span>
            </div>
          )}
        </div>
      </section>

      <section className="contest-public-body contest-public-body--full">
        <article className="public-detail-article">
          <section>
            <h2>접수 방법</h2>
            <p>{contest.applicationMethod}</p>
          </section>
          <section>
            <h2>시상 및 혜택</h2>
            <p>{contest.benefits}</p>
          </section>
          <section className="public-editor-content" dangerouslySetInnerHTML={{ __html: contest.detailHtml }} />
        </article>
      </section>
    </>
  );
}
