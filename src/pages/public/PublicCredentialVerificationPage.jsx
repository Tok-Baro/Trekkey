import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  Fingerprint,
  Layers3,
  Link2,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  XCircle
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  downloadPublicCredentialCertificate,
  downloadPublicCredentialPackage,
  verifyPublicCredential
} from "../../api/publicCredentialApi.js";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { AppFooter } from "../../components/common/AppFooter.jsx";
import { getCredentialVerificationPath } from "../../components/credential/CredentialVerificationLink.jsx";
import {
  buildExplorerUrl,
  getVerificationPresentation,
  normalizeCredentialInput,
  verificationSummary
} from "../../lib/credentialVerification.js";
import styles from "./PublicCredentialVerificationPage.module.scss";

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

const technicalEvidence = [
  ["credentialIdHash", "증명서 식별 해시"],
  ["contentHash", "발급 내용 해시"],
  ["fileManifestHash", "첨부 파일 해시"],
  ["merkleRoot", "배치 검증 루트"]
];

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

function compactHash(value) {
  if (!value) {
    return "-";
  }
  return value.length > 30 ? `${value.slice(0, 16)}...${value.slice(-10)}` : value;
}

function networkLabel(chainId) {
  if (Number(chainId) === 1001) {
    return "Kaia Kairos 테스트넷";
  }
  if (Number(chainId) === 8217) {
    return "Kaia 메인넷";
  }
  return chainId ? `공개 네트워크 ${chainId}` : "-";
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

function PublicHeader() {
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarInner}>
        <Link className={styles.brand} to="/" aria-label="Trekkey 홈">
          <span className={styles.brandMark}><Layers3 size={18} aria-hidden="true" /></span>
          <span><strong>Trekkey</strong><small>공식 증명서 확인</small></span>
        </Link>
        <nav className={styles.topbarActions} aria-label="공개 메뉴">
          <Link to="/verify"><BadgeCheck size={16} /> 증명서 확인</Link>
          <Link to="/login">서비스 로그인</Link>
        </nav>
      </div>
    </header>
  );
}

function LookupView({ initialValue = "", error = "" }) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialValue);
  const [inputError, setInputError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const credentialId = normalizeCredentialInput(value);
    if (!credentialId) {
      setInputError("증명서의 검증 코드나 QR 링크를 입력해 주세요.");
      return;
    }
    setInputError("");
    navigate(getCredentialVerificationPath(credentialId));
  };

  return (
    <>
      <PublicHeader />
      <section className={styles.lookupBand}>
        <div className={styles.lookupInner}>
          <div className={styles.lookupCopy}>
            <span><LockKeyhole size={15} /> 로그인 없이 이용 가능</span>
            <h1>{error ? "증명서를 확인할 수 없습니다" : "증명서 진위 확인"}</h1>
            <p>{error || "증명서의 QR 링크나 검증 코드를 입력하면 현재 효력을 바로 확인할 수 있습니다."}</p>
          </div>

          <form className={styles.lookupTool} onSubmit={submit}>
            <label htmlFor="credential-lookup">검증 코드 또는 링크</label>
            <div className={styles.lookupControl}>
              <Link2 size={19} aria-hidden="true" />
              <input
                id="credential-lookup"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="QR 링크 또는 검증 코드"
                autoComplete="off"
                spellCheck="false"
                autoFocus
              />
              <button type="submit"><Search size={17} /> 확인</button>
            </div>
            {inputError && <p className={styles.formError} role="alert">{inputError}</p>}
            <small>지갑, 별도 앱, 개인정보 입력이 필요하지 않습니다.</small>
          </form>
        </div>
      </section>

      <section className={styles.lookupOutcomes} aria-label="확인 항목">
        <div><ShieldCheck size={21} /><span><strong>발급기관</strong><small>학교가 발급했는지 확인</small></span></div>
        <div><Fingerprint size={21} /><span><strong>내용 무결성</strong><small>발급 후 변경 여부 확인</small></span></div>
        <div><BadgeCheck size={21} /><span><strong>현재 효력</strong><small>취소·대체 여부 확인</small></span></div>
      </section>
    </>
  );
}

function DetailItem({ label, children }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd>{children || "-"}</dd>
    </div>
  );
}

function TechnicalItem({ label, value, onCopy, copied }) {
  return (
    <div className={styles.technicalItem}>
      <span><small>{label}</small><code title={value || undefined}>{compactHash(value)}</code></span>
      {value && (
        <button type="button" onClick={() => onCopy(label, value)} title={`${label} 복사`} aria-label={`${label} 복사`}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      )}
    </div>
  );
}

export function PublicCredentialVerificationPage({ credentialPublicId: credentialPublicIdProp }) {
  const params = useParams();
  const credentialPublicId = credentialPublicIdProp ?? params.credentialPublicId ?? "";
  const [credential, setCredential] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(credentialPublicId));
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
          setLoadError(getApiErrorMessage(error, "검증 코드와 일치하는 증명서를 찾지 못했습니다."));
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

  const presentation = useMemo(
    () => getVerificationPresentation(credential?.verificationStatus, credential?.issuerName),
    [credential?.issuerName, credential?.verificationStatus]
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
      window.setTimeout(() => setCopiedLabel(""), 1500);
    } catch {
      setCopiedLabel("");
    }
  };

  const shareResult = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Trekkey 증명서 검증 결과", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopiedLabel("공유 링크");
        window.setTimeout(() => setCopiedLabel(""), 1500);
      }
    } catch {
      setCopiedLabel("");
    }
  };

  if (!credentialPublicId) {
    return <main className={styles.page}><LookupView /><AppFooter variant="public" /></main>;
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <PublicHeader />
        <section className={styles.loadingState} aria-live="polite">
          <LoaderCircle className={styles.spinner} size={34} aria-hidden="true" />
          <h1>증명서를 확인하고 있습니다</h1>
          <p>발급기관, 발급 내용, 외부 등록 기록을 대조하는 중입니다.</p>
        </section>
        <AppFooter variant="public" />
      </main>
    );
  }

  if (loadError || !credential) {
    return (
      <main className={styles.page}>
        <LookupView initialValue={credentialPublicId} error={loadError || "검증 링크를 다시 확인해 주세요."} />
        <div className={styles.retryRow}>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}><RefreshCw size={16} /> 다시 확인</button>
        </div>
        <AppFooter variant="public" />
      </main>
    );
  }

  const evidence = credential.evidence ?? {};
  const details = credential.publicDetails ?? {};
  const subjects = credential.publicSubjects ?? [];
  const team = subjects.find((subject) => subject.subjectType === "TEAM");
  const checks = verificationSummary(evidence);
  const explorerUrl = buildExplorerUrl(evidence.chainId, evidence.transactionHash);
  const StatusIcon = presentation.tone === "success" ? ShieldCheck : presentation.tone === "pending" ? Clock3 : ShieldAlert;
  const recordTitle = details.prize || details.submissionTitle || credentialType[credential.credentialType] || "공식 증명서";

  return (
    <main className={styles.page}>
      <PublicHeader />

      <section className={`${styles.statusBand} ${styles[presentation.tone]}`}>
        <div className={styles.statusInner}>
          <span className={styles.statusIcon}><StatusIcon size={30} aria-hidden="true" /></span>
          <div className={styles.statusCopy}>
            <span>{presentation.label}</span>
            <h1>{presentation.headline}</h1>
            <p>{presentation.description}</p>
          </div>
          <div className={styles.resultActions}>
            <span><LockKeyhole size={14} /> 로그인 없이 확인됨</span>
            <button type="button" onClick={shareResult} title="검증 결과 공유" aria-label="검증 결과 공유">
              {copiedLabel === "공유 링크" ? <Check size={18} /> : <Share2 size={18} />}
            </button>
          </div>
        </div>
      </section>

      <div className={styles.resultLayout}>
        <div className={styles.mainColumn}>
          <section className={styles.recordSection}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}><BadgeCheck size={19} /></span>
              <div><small>발급 내용</small><h2>{credentialType[credential.credentialType] ?? credential.credentialType}</h2></div>
            </div>
            <div className={styles.recordLead}>
              <span>{details.awardRankNo ? `${details.awardRankNo}위` : credentialType[credential.credentialType]}</span>
              <h3>{recordTitle}</h3>
              <p>{details.contestTitle || "발급 대회 정보"}</p>
            </div>
            <dl className={styles.detailGrid}>
              <DetailItem label="증서 번호">{credential.credentialNo}</DetailItem>
              <DetailItem label="팀">{details.teamName || team?.displayName}</DetailItem>
              <DetailItem label="작품">{details.submissionTitle}</DetailItem>
              <DetailItem label="발급일">{formatDateTime(credential.issuedAt)}</DetailItem>
            </dl>
          </section>

          <section className={styles.subjectSection}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}><UserRound size={19} /></span>
              <div><small>증명 대상</small><h2>공개된 수상·참여자</h2></div>
            </div>
            {subjects.length ? (
              <div className={styles.subjectList}>
                {subjects.map((subject) => (
                  <article className={styles.subjectCard} key={`${subject.subjectType}-${subject.subjectRef}`}>
                    <span className={styles.subjectAvatar}>{subject.subjectType === "TEAM" ? <BadgeCheck size={18} /> : <UserRound size={18} />}</span>
                    <div><strong>{subject.displayName}</strong><small>{subject.major || subjectType[subject.subjectType]}</small></div>
                    <span>{roleCode[subject.roleCode] ?? subject.roleCode}</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.emptyCopy}>외부 공개에 동의된 대상자 정보가 없습니다.</p>
            )}
          </section>

          <section className={styles.evidenceSection}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}><ShieldCheck size={19} /></span>
              <div><small>검증 결과</small><h2>세 가지 항목을 확인했습니다</h2></div>
            </div>
            <div className={styles.checkList}>
              {checks.map((item) => {
                const isWaiting = !item.passed && ["PENDING", "RPC_UNAVAILABLE"].includes(credential.verificationStatus) && item.key === "external";
                return (
                  <div className={item.passed ? styles.checkPass : isWaiting ? styles.checkWaiting : styles.checkFail} key={item.key}>
                    {item.passed ? <CheckCircle2 size={20} /> : isWaiting ? <Clock3 size={20} /> : <XCircle size={20} />}
                    <span><strong>{item.label}</strong><small>{item.description}</small></span>
                    <b>{item.passed ? "확인" : isWaiting ? "대기" : "실패"}</b>
                  </div>
                );
              })}
            </div>
          </section>

          {credential.replacementCredentialPublicId && (
            <section className={styles.replacementNotice}>
              <RefreshCw size={21} aria-hidden="true" />
              <div><strong>새 증명서가 발급되었습니다</strong><p>현재 내용을 대신하는 최신 증명서를 확인해 주세요.</p></div>
              <Link to={getCredentialVerificationPath(credential.replacementCredentialPublicId)}>최신 증명서 확인</Link>
            </section>
          )}

          <details className={styles.technicalDetails}>
            <summary>
              <span><Fingerprint size={18} /><span><strong>기술 검증 정보</strong><small>전문가·시스템 담당자용</small></span></span>
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className={styles.technicalBody}>
              <p>원본 해시, 공개 등록 트랜잭션과 검증 배치 정보입니다.</p>
              <div className={styles.technicalGrid}>
                {technicalEvidence.map(([key, label]) => (
                  <TechnicalItem key={key} label={label} value={evidence[key]} onCopy={copyValue} copied={copiedLabel === label} />
                ))}
              </div>
              <dl className={styles.chainDetails}>
                <DetailItem label="네트워크">{networkLabel(evidence.chainId)}</DetailItem>
                <DetailItem label="블록 번호">{evidence.blockNumber}</DetailItem>
                <DetailItem label="검증 배치">{evidence.batchPublicId}</DetailItem>
                <DetailItem label="컨트랙트">{compactHash(evidence.contractAddress)}</DetailItem>
              </dl>
              {explorerUrl && (
                <a className={styles.explorerLink} href={explorerUrl} target="_blank" rel="noreferrer">
                  공개 원장 기록 직접 확인 <ExternalLink size={15} />
                </a>
              )}
            </div>
          </details>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.sideSection}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}><Download size={19} /></span>
              <div><small>제출 자료</small><h2>파일 받기</h2></div>
            </div>
            <div className={styles.downloadList}>
              <button type="button" disabled={Boolean(downloading)} onClick={() => download("certificate")}>
                <FileText size={20} /><span><strong>증명서 PDF</strong><small>{downloading === "certificate" ? "다운로드 중" : "출력·제출용"}</small></span><Download size={16} />
              </button>
              <button type="button" disabled={Boolean(downloading)} onClick={() => download("package")}>
                <FileArchive size={20} /><span><strong>검증 자료 ZIP</strong><small>{downloading === "package" ? "다운로드 중" : "독립 보관용"}</small></span><Download size={16} />
              </button>
            </div>
            {downloadError && <p className={styles.formError} role="alert">{downloadError}</p>}
          </section>

          <section className={styles.sideSection}>
            <div className={styles.issuerMark}><ShieldCheck size={22} /></div>
            <small>발급기관</small>
            <h2>{credential.issuerName}</h2>
            <p>발급 당시 기관 정보와 서명 권한을 공개 기록에서 확인했습니다.</p>
          </section>

          <section className={styles.privacyNote}>
            <LockKeyhole size={18} />
            <div><strong>공개 검증 페이지</strong><p>발급 당시 외부 공개에 동의한 정보만 표시됩니다.</p></div>
          </section>
        </aside>
      </div>

      <AppFooter variant="public" />
    </main>
  );
}
