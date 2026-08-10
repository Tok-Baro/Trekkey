import React, { useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { getPublicActivityProfile } from "../../api/publicActivityApi.js";
import { AppFooter } from "../../components/common/AppFooter.jsx";
import { getCredentialVerificationPath } from "../../components/credential/CredentialVerificationLink.jsx";
import styles from "./PublicActivityProfilePage.module.scss";

const typeLabels = {
  PARTICIPATION: "대회 참가",
  WORK: "작품 제출",
  AWARD: "수상"
};

const statusLabels = {
  ANCHORED: "온체인 기록 완료",
  REVOKED: "발급기관 취소",
  SUPERSEDED: "새 Credential로 대체"
};

const roleLabels = {
  REPRESENTATIVE: "대표자",
  PARTICIPANT: "참가자",
  AWARDEE: "수상자",
  LEADER: "대표자",
  MEMBER: "팀원"
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ko-KR");
}

export function PublicActivityProfilePage() {
  const { publicProfileId = "" } = useParams();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");
    getPublicActivityProfile(publicProfileId)
      .then((result) => active && setProfile(result))
      .catch((nextError) => {
        if (active) {
          setProfile(null);
          setError(getApiErrorMessage(nextError, "공개 활동 프로필을 불러오지 못했습니다."));
        }
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [publicProfileId, reloadKey]);

  if (isLoading) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard} aria-live="polite">
          <LoaderCircle className={styles.spinner} size={34} aria-hidden="true" />
          <h1>온체인 활동을 불러오고 있습니다</h1>
          <p>공개 동의된 Credential 목록을 확인하는 중입니다.</p>
        </section>
        <AppFooter variant="public" />
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <ShieldAlert size={36} aria-hidden="true" />
          <h1>활동 프로필을 확인할 수 없습니다</h1>
          <p>{error || "공유 링크가 비활성화됐거나 변경됐습니다."}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
            <RefreshCw size={16} /> 다시 확인
          </button>
        </section>
        <AppFooter variant="public" />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link to="/">Trekkey</Link>
        <span><ShieldCheck size={16} /> Kaia 온체인 활동 프로필</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.avatar}><UserRound size={34} aria-hidden="true" /></div>
        <div>
          <span className={styles.eyebrow}>공개 검증 프로필</span>
          <h1>{profile.displayName}</h1>
          <p>{[profile.organizationName, profile.major].filter(Boolean).join(" · ")}</p>
        </div>
        <div className={styles.count}>
          <strong>{profile.credentialCount}</strong>
          <span>온체인 Credential</span>
        </div>
      </section>

      <section className={styles.activitySection}>
        <div className={styles.sectionHead}>
          <div>
            <span>VERIFIABLE ACTIVITY</span>
            <h2>검증 가능한 활동</h2>
          </div>
          <p>각 항목에서 발급 정보와 블록체인 증빙을 직접 확인할 수 있습니다.</p>
        </div>

        <div className={styles.activityList}>
          {profile.activities.map((activity) => {
            const invalid = activity.status !== "ANCHORED";
            return (
              <article className={styles.activityCard} key={activity.credentialPublicId}>
                <div className={`${styles.activityIcon} ${invalid ? styles.warning : ""}`}>
                  {invalid ? <ShieldAlert size={21} /> : <BadgeCheck size={21} />}
                </div>
                <div className={styles.activityCopy}>
                  <div className={styles.activityTitle}>
                    <strong>{activity.contestTitle || typeLabels[activity.credentialType]}</strong>
                    <span className={invalid ? styles.warningBadge : styles.validBadge}>
                      {statusLabels[activity.status] || activity.status}
                    </span>
                  </div>
                  <p>{typeLabels[activity.credentialType] || activity.credentialType} · {roleLabels[activity.roleCode] || activity.roleCode}</p>
                  <small><CalendarClock size={14} /> {formatDate(activity.issuedAt)} · {activity.credentialNo}</small>
                </div>
                <Link className={styles.verifyLink} to={getCredentialVerificationPath(activity.credentialPublicId)}>
                  검증하기 <ExternalLink size={15} />
                </Link>
              </article>
            );
          })}
          {profile.activities.length === 0 && (
            <div className={styles.emptyState}>
              <ShieldCheck size={30} />
              <strong>공개된 온체인 활동이 없습니다</strong>
              <p>블록체인 기록이 완료된 공개 Credential만 이곳에 표시됩니다.</p>
            </div>
          )}
        </div>
      </section>

      <aside className={styles.privacyNotice}>
        학번과 이메일은 공개되지 않습니다. 이 페이지는 소유자가 공개를 허용한 활동만 보여줍니다.
      </aside>
      <AppFooter variant="public" />
    </main>
  );
}
