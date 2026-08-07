import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileArchive,
  FileText,
  Fingerprint,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  downloadPublicCredentialCertificate,
  downloadPublicCredentialPackage,
  verifyPublicCredential
} from "../../api/publicCredentialApi.js";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { AppFooter } from "../../components/common/AppFooter.jsx";
import { getCredentialVerificationPath } from "../../components/credential/CredentialVerificationLink.jsx";
import styles from "./PublicCredentialVerificationPage.module.scss";

const verificationStatus = {
  VALID: {
    label: "유효한 증명서",
    description: "발급 정보와 블록체인 기록이 일치하며 현재 유효합니다.",
    tone: "success",
    icon: ShieldCheck
  },
  PENDING: {
    label: "블록체인 기록 대기",
    description: "발급 정보는 확인됐으며 블록체인 기록이 완료되기를 기다리고 있습니다.",
    tone: "pending",
    icon: RefreshCw
  },
  REVOKED: {
    label: "취소된 증명서",
    description: "발급기관이 효력을 취소한 증명서입니다.",
    tone: "danger",
    icon: ShieldAlert
  },
  SUPERSEDED: {
    label: "대체된 증명서",
    description: "새 증명서로 대체되어 더 이상 최신 증명서가 아닙니다.",
    tone: "warning",
    icon: RefreshCw
  },
  EXPIRED: {
    label: "만료된 증명서",
    description: "발급 정보는 확인됐지만 유효기간이 지났습니다.",
    tone: "warning",
    icon: ShieldAlert
  },
  TAMPERED: {
    label: "위변조 의심",
    description: "저장된 발급 정보와 검증 증빙이 일치하지 않습니다.",
    tone: "danger",
    icon: ShieldAlert
  },
  ANCHOR_NOT_FOUND: {
    label: "블록체인 기록 없음",
    description: "증명서에 대응하는 블록체인 기록을 찾지 못했습니다.",
    tone: "danger",
    icon: ShieldAlert
  },
  ISSUER_INVALID: {
    label: "발급기관 확인 실패",
    description: "발급 당시 기관의 유효한 키를 확인하지 못했습니다.",
    tone: "danger",
    icon: ShieldAlert
  },
  RPC_UNAVAILABLE: {
    label: "블록체인 확인 지연",
    description: "현재 블록체인 네트워크에 연결할 수 없어 잠시 후 재확인이 필요합니다.",
    tone: "pending",
    icon: RefreshCw
  },
  BLOCKCHAIN_CONFIGURATION_ERROR: {
    label: "검증 환경 오류",
    description: "블록체인 검증 환경을 확인할 수 없습니다. 서비스 관리자에게 문의해 주세요.",
    tone: "danger",
    icon: ShieldAlert
  },
  SCHEMA_UNSUPPORTED: {
    label: "지원하지 않는 형식",
    description: "현재 검증 서비스가 지원하지 않는 증명서 형식입니다.",
    tone: "warning",
    icon: ShieldAlert
  }
};

const credentialType = {
  PARTICIPATION: "대회 참가 증명",
  WORK: "작품 제출 증명",
  AWARD: "수상 증명"
};

const subjectType = {
  USER: "참가자",
  TEAM: "팀"
};

const roleCode = {
  TEAM: "팀",
  REPRESENTATIVE: "대표자",
  AWARDEE: "수상자",
  LEADER: "대표자",
  MEMBER: "팀원",
  PARTICIPANT: "참가자"
};

const evidenceChecks = [
  ["canonicalPayloadMatches", "원본 데이터"],
  ["contentHashMatches", "내용 해시"],
  ["fileManifestHashMatches", "파일 목록"],
  ["credentialClaimsMatch", "발급 정보"],
  ["credentialIdMatches", "증명서 식별자"],
  ["merkleProofMatches", "머클 증명"]
];

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR");
}

function compactHash(value) {
  if (!value) {
    return "-";
  }
  return value.length > 26 ? `${value.slice(0, 14)}…${value.slice(-10)}` : value;
}

function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DetailItem({ label, children }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd>{children ?? "-"}</dd>
    </div>
  );
}

function HashItem({ label, value, onCopy, copied }) {
  return (
    <div className={styles.hashItem}>
      <div>
        <span>{label}</span>
        <code title={value || undefined}>{compactHash(value)}</code>
      </div>
      {value && (
        <button type="button" onClick={() => onCopy(label, value)} aria-label={`${label} 복사`}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      )}
    </div>
  );
}

export function PublicCredentialVerificationPage({ credentialPublicId: credentialPublicIdProp, onBack }) {
  const params = useParams();
  const credentialPublicId = credentialPublicIdProp ?? params.credentialPublicId ?? "";
  const [credential, setCredential] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [downloading, setDownloading] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [copiedLabel, setCopiedLabel] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isActive = true;
    setCredential(null);
    setLoadError("");
    setDownloadError("");

    if (!credentialPublicId) {
      setIsLoading(false);
      setLoadError("검증할 Credential 식별자가 없습니다.");
      return undefined;
    }

    setIsLoading(true);
    verifyPublicCredential(credentialPublicId)
      .then((result) => {
        if (isActive) {
          setCredential(result);
        }
      })
      .catch((error) => {
        if (isActive) {
          setLoadError(getApiErrorMessage(error, "Credential을 확인하지 못했습니다."));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [credentialPublicId, reloadKey]);

  const status = useMemo(
    () => verificationStatus[credential?.verificationStatus] ?? {
      label: credential?.verificationStatus ?? "검증 상태 미확인",
      description: "현재 증명서의 검증 상태를 해석할 수 없습니다.",
      tone: "pending",
      icon: ShieldAlert
    },
    [credential?.verificationStatus]
  );

  const download = async (kind) => {
    setDownloading(kind);
    setDownloadError("");
    try {
      const file = kind === "package"
        ? await downloadPublicCredentialPackage(credentialPublicId, { credentialNo: credential.credentialNo })
        : await downloadPublicCredentialCertificate(credentialPublicId, { credentialNo: credential.credentialNo });
      saveBlob(file.blob, file.fileName);
    } catch (error) {
      setDownloadError(getApiErrorMessage(error, "파일을 다운로드하지 못했습니다."));
    } finally {
      setDownloading("");
    }
  };

  const copyValue = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(""), 1400);
    } catch {
      setCopiedLabel("");
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.assign("/");
    }
  };

  if (isLoading) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard} aria-live="polite">
          <LoaderCircle className={styles.spinner} size={34} aria-hidden="true" />
          <h1>Credential을 검증하고 있습니다</h1>
          <p>발급 정보와 블록체인 증빙을 확인하는 중입니다.</p>
        </section>
        <AppFooter variant="public" />
      </main>
    );
  }

  if (loadError || !credential) {
    return (
      <main className={styles.page}>
        <header className={styles.topbar}>
          <button type="button" onClick={handleBack}><ArrowLeft size={17} /> 이전 화면</button>
          <span>Trekkey 공개 검증</span>
        </header>
        <section className={styles.stateCard}>
          <ShieldAlert size={36} aria-hidden="true" />
          <h1>Credential을 확인할 수 없습니다</h1>
          <p>{loadError || "검증 링크를 다시 확인해 주세요."}</p>
          <button className={styles.primaryButton} type="button" onClick={() => setReloadKey((key) => key + 1)}>
            <RefreshCw size={16} /> 다시 확인
          </button>
        </section>
        <AppFooter variant="public" />
      </main>
    );
  }

  const StatusIcon = status.icon;
  const evidence = credential.evidence ?? {};
  const hasBlockchainEvidence = Boolean(
    evidence.transactionHash || evidence.contractAddress || evidence.merkleRoot || evidence.blockNumber
  );

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <button type="button" onClick={handleBack}><ArrowLeft size={17} /> 이전 화면</button>
        <span>Trekkey 공개 검증</span>
      </header>

      <section className={styles.hero}>
        <div className={`${styles.statusIcon} ${styles[status.tone]}`}>
          <StatusIcon size={30} aria-hidden="true" />
        </div>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Credential 검증 결과</span>
          <h1>{status.label}</h1>
          <p>{status.description}</p>
        </div>
        <div className={`${styles.statusBadge} ${styles[status.tone]}`}>
          <StatusIcon size={15} aria-hidden="true" />
          {credential.verificationStatus}
        </div>
      </section>

      <div className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          <section className={styles.card}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionIcon}><BadgeCheck size={19} /></div>
              <div><span>발급 정보</span><h2>{credentialType[credential.credentialType] ?? credential.credentialType}</h2></div>
            </div>
            <dl className={styles.detailGrid}>
              <DetailItem label="Credential 번호">{credential.credentialNo}</DetailItem>
              <DetailItem label="발급기관">{credential.issuerName}</DetailItem>
              <DetailItem label="발급일시">{formatDateTime(credential.issuedAt)}</DetailItem>
              <DetailItem label="만료일시">{formatDateTime(credential.expiresAt)}</DetailItem>
              <DetailItem label="발급기관 ID">{credential.issuerPublicId}</DetailItem>
              <DetailItem label="스키마">{credential.schemaProfileId}</DetailItem>
            </dl>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionIcon}><UserRound size={19} /></div>
              <div><span>공개 대상자</span><h2>증명 대상 정보</h2></div>
            </div>
            {credential.publicSubjects?.length ? (
              <div className={styles.subjectList}>
                {credential.publicSubjects.map((subject) => (
                  <article className={styles.subjectCard} key={`${subject.subjectType}-${subject.subjectRef}`}>
                    <div><strong>{subject.displayName}</strong><span>{subjectType[subject.subjectType] ?? subject.subjectType}</span></div>
                    <dl>
                      <DetailItem label="전공">{subject.major}</DetailItem>
                      <DetailItem label="역할">{roleCode[subject.roleCode] ?? subject.roleCode}</DetailItem>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.emptyCopy}>공개 범위로 설정된 대상자 정보가 없습니다.</p>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionIcon}><Fingerprint size={19} /></div>
              <div><span>무결성 검사</span><h2>검증 항목</h2></div>
            </div>
            <div className={styles.checkGrid}>
              {evidenceChecks.map(([key, label]) => (
                <div className={evidence[key] ? styles.checkPass : styles.checkFail} key={key}>
                  {evidence[key] ? <CheckCircle2 size={18} /> : <X size={18} />}
                  <span>{label}</span>
                  <strong>{evidence[key] ? "일치" : "불일치"}</strong>
                </div>
              ))}
            </div>
            <div className={styles.hashList}>
              <HashItem label="Credential ID Hash" value={evidence.credentialIdHash} onCopy={copyValue} copied={copiedLabel === "Credential ID Hash"} />
              <HashItem label="Content Hash" value={evidence.contentHash} onCopy={copyValue} copied={copiedLabel === "Content Hash"} />
              <HashItem label="File Manifest Hash" value={evidence.fileManifestHash} onCopy={copyValue} copied={copiedLabel === "File Manifest Hash"} />
              <HashItem label="Merkle Root" value={evidence.merkleRoot} onCopy={copyValue} copied={copiedLabel === "Merkle Root"} />
            </div>
          </section>

          {(credential.replacementCredentialPublicId || credential.replacementCredentialIdHash) && (
            <section className={`${styles.card} ${styles.replacementCard}`}>
              <RefreshCw size={22} aria-hidden="true" />
              <div>
                <strong>이 Credential은 새 증명서로 대체되었습니다.</strong>
                <span>
                  대체 Credential ID hash:{" "}
                  <code title={credential.replacementCredentialIdHash || undefined}>
                    {compactHash(credential.replacementCredentialIdHash)}
                  </code>
                </span>
              </div>
              {credential.replacementCredentialPublicId && (
                <Link to={getCredentialVerificationPath(credential.replacementCredentialPublicId)}>새 증명서 확인</Link>
              )}
            </section>
          )}
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.card}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionIcon}><Download size={19} /></div>
              <div><span>검증 자료</span><h2>파일 다운로드</h2></div>
            </div>
            <p className={styles.cardDescription}>증명서와 독립적으로 보관할 수 있는 검증 자료를 내려받을 수 있습니다.</p>
            <div className={styles.downloadList}>
              <button type="button" disabled={Boolean(downloading)} onClick={() => download("certificate")}>
                <FileText size={20} />
                <span><strong>증명서 PDF</strong><small>{downloading === "certificate" ? "다운로드 중..." : "출력·제출용 문서"}</small></span>
                <Download size={16} />
              </button>
              <button type="button" disabled={Boolean(downloading)} onClick={() => download("package")}>
                <FileArchive size={20} />
                <span><strong>Credential 패키지</strong><small>{downloading === "package" ? "다운로드 중..." : "원본·증빙 ZIP 파일"}</small></span>
                <Download size={16} />
              </button>
            </div>
            {downloadError && <p className={styles.errorMessage}>{downloadError}</p>}
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionIcon}><ShieldCheck size={19} /></div>
              <div><span>블록체인 증빙</span><h2>기록 정보</h2></div>
            </div>
            {hasBlockchainEvidence ? (
              <dl className={styles.chainList}>
                <DetailItem label="네트워크 Chain ID">{evidence.chainId}</DetailItem>
                <DetailItem label="블록 번호">{evidence.blockNumber}</DetailItem>
                <DetailItem label="배치 ID">{evidence.batchPublicId}</DetailItem>
                <DetailItem label="컨트랙트">{compactHash(evidence.contractAddress)}</DetailItem>
                <DetailItem label="트랜잭션">{compactHash(evidence.transactionHash)}</DetailItem>
              </dl>
            ) : (
              <p className={styles.emptyCopy}>아직 표시할 블록체인 기록이 없습니다.</p>
            )}
          </section>

          <section className={styles.guideCard}>
            <ShieldCheck size={19} aria-hidden="true" />
            <div><strong>공개 검증 안내</strong><p>이 페이지에는 발급 당시 공개하기로 한 정보만 표시됩니다. 링크를 받은 누구나 로그인 없이 진위를 확인할 수 있습니다.</p></div>
          </section>
        </aside>
      </div>

      <AppFooter variant="public" />
    </main>
  );
}
