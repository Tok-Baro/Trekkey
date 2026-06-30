import React from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { ContestPublicView } from "../../components/public/ContestPublicView.jsx";

export function ContestPublicDetailPage({ contest, onBack }) {
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

  return (
    <main className="contest-public-page">
      <header className="contest-public-topbar">
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          관리자 화면
        </button>
        <span>Trekkey 공개 공고</span>
      </header>
      <ContestPublicView contest={contest} />
    </main>
  );
}
