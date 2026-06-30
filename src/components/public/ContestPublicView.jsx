import React from "react";
import { ImagePlus, UsersRound } from "lucide-react";
import { StatusBadge } from "../common/CommonUi.jsx";

export function ContestPublicView({ contest }) {
  const tags = String(contest.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

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
          <button className="primary-button hero-apply-button" type="button">
            <UsersRound size={17} />
            참가 신청
          </button>
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
