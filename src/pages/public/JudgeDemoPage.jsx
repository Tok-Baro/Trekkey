import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Check,
  CircleAlert,
  Clock3,
  Database,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  Gauge,
  KeyRound,
  Layers3,
  Link2,
  LockKeyhole,
  Pause,
  Play,
  Presentation,
  RefreshCw,
  Route,
  Server,
  ShieldCheck,
  Sparkles,
  TimerReset,
  UserCheck
} from "lucide-react";
import { verifyPublicCredential } from "../../api/publicCredentialApi.js";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { AppFooter } from "../../components/common/AppFooter.jsx";
import { buildExplorerUrl, getVerificationPresentation, normalizeCredentialInput } from "../../lib/credentialVerification.js";
import { verifyOperationalCredentialEvidence } from "../../lib/tamperLab.js";
import styles from "./JudgeDemoPage.module.scss";

const STEPS = [
  { time: "00:00", label: "문제", title: "신뢰가 무너진 경험 서술" },
  { time: "00:40", label: "발급", title: "업무 확정에서 Credential까지" },
  { time: "01:35", label: "검증", title: "운영 Credential 실시간 확인" },
  { time: "02:30", label: "변조", title: "브라우저 독립 Proof 재계산" },
  { time: "03:35", label: "프라이버시", title: "정보 배치와 정량 결과" },
  { time: "04:30", label: "결론", title: "프로토콜·플랫폼·서비스" }
];

const ISSUANCE_FLOW = [
  [UserCheck, "대학 담당자", "참가·작품·수상 확정"],
  [FileCheck2, "Credential", "불변 snapshot·canonical JSON"],
  [Fingerprint, "Merkle Batch", "여러 leaf를 Root 하나로"],
  [KeyRound, "기관 승인", "EIP-712 승인 서명"],
  [Layers3, "Kaia", "Root·발급자·상태 기록"],
  [BadgeCheck, "외부 검증", "QR로 현재 효력 확인"]
];

const PRIVACY_PLACEMENT = [
  [Database, "기관 서버", "학번·이메일·증빙 원문", "업무와 승인 근거"],
  [BadgeCheck, "공개 검증", "동의된 이름·활동 요약·Proof", "외부 제출과 확인"],
  [Layers3, "Kaia", "Merkle Root·발급자·상태", "독립된 변조 대조 기준"]
];

function formatElapsed(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function compact(value, head = 14, tail = 10) {
  if (!value || value.length <= head + tail + 1) return value || "-";
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function JudgeDemoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const credentialParam = searchParams.get("credential") ?? "";
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [credentialInput, setCredentialInput] = useState(credentialParam);
  const [credential, setCredential] = useState(null);
  const [evidenceResult, setEvidenceResult] = useState(null);
  const [loadingCredential, setLoadingCredential] = useState(false);
  const [credentialError, setCredentialError] = useState("");

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setElapsed((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        setStep((current) => Math.min(STEPS.length - 1, current + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        setStep((current) => Math.max(0, current - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const loadCredential = useCallback(async (rawId) => {
    const credentialId = normalizeCredentialInput(rawId);
    if (!credentialId) {
      setCredentialError("운영 Credential 공개 ID 또는 검증 링크를 입력해 주세요.");
      return;
    }
    setLoadingCredential(true);
    setCredentialError("");
    setCredential(null);
    setEvidenceResult(null);
    try {
      const nextCredential = await verifyPublicCredential(credentialId);
      const nextEvidence = verifyOperationalCredentialEvidence(nextCredential);
      setCredential(nextCredential);
      setEvidenceResult(nextEvidence);
      setCredentialInput(credentialId);
    } catch (error) {
      setCredentialError(getApiErrorMessage(error, "운영 Credential을 검증하지 못했습니다."));
    } finally {
      setLoadingCredential(false);
    }
  }, []);

  useEffect(() => {
    if (credentialParam) loadCredential(credentialParam);
  }, [credentialParam, loadCredential]);

  const presentation = useMemo(
    () => getVerificationPresentation(credential?.verificationStatus, credential?.issuerName),
    [credential]
  );
  const explorerUrl = buildExplorerUrl(evidenceResult?.chainId, evidenceResult?.transactionHash);

  const submitCredential = (event) => {
    event.preventDefault();
    const normalized = normalizeCredentialInput(credentialInput);
    if (!normalized) {
      setCredentialError("운영 Credential 공개 ID 또는 검증 링크를 입력해 주세요.");
      return;
    }
    navigate(`/demo?credential=${encodeURIComponent(normalized)}`, { replace: true });
    if (normalized === credentialParam) loadCredential(normalized);
  };

  const resetTimer = () => {
    setElapsed(0);
    setRunning(false);
    setStep(0);
  };

  const startDemo = () => {
    if (elapsed === 0) setStep(0);
    setRunning(true);
  };

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} to="/home"><Layers3 size={18} /><strong>Trekkey</strong><span>심사 시연</span></Link>
        <div className={styles.timer} data-over={elapsed > 300 || undefined}>
          <Clock3 size={16} /><strong>{formatElapsed(elapsed)}</strong><span>/ 05:00</span>
        </div>
        <div className={styles.topActions}>
          <button type="button" onClick={running ? () => setRunning(false) : startDemo}>
            {running ? <Pause size={16} /> : <Play size={16} />}{running ? "일시정지" : elapsed ? "계속" : "시작"}
          </button>
          <button type="button" onClick={resetTimer}><TimerReset size={16} /> 초기화</button>
          <Link to="/home">나가기</Link>
        </div>
      </header>

      <aside className={styles.stepRail} aria-label="5분 심사 시연 순서">
        {STEPS.map((item, index) => (
          <button key={item.time} type="button" className={index === step ? styles.activeStep : index < step ? styles.doneStep : ""} onClick={() => setStep(index)}>
            <span>{index < step ? <Check size={13} /> : index + 1}</span>
            <div><time>{item.time}</time><strong>{item.label}</strong><small>{item.title}</small></div>
          </button>
        ))}
      </aside>

      <main className={styles.stage}>
        <div className={styles.slideMeta}><span>STEP {step + 1} / {STEPS.length}</span><b>{STEPS[step].time}</b></div>

        {step === 0 && (
          <section className={`${styles.slide} ${styles.problemSlide}`}>
            <span className={styles.kicker}><Sparkles size={15} /> 문제 정의</span>
            <h1>AI가 대신 쓴 경험과<br /><em>대학이 승인한 사실</em>을<br />어떻게 구분할 것인가?</h1>
            <p>개인은 취업난을, 기업은 검증 가능한 인재 정보의 부족을 겪습니다. Trekkey는 서술을 믿으라고 요구하지 않고 기관이 승인한 활동 증거를 직접 검증하게 합니다.</p>
            <div className={styles.problemContrast}>
              <article><CircleAlert size={21} /><span>기존 자기소개서</span><strong>누가 썼는지, 사실인지 알기 어렵다</strong></article>
              <ArrowRight size={25} />
              <article><ShieldCheck size={21} /><span>Trekkey Credential</span><strong>기관·내용·공개 기록을 독립 확인한다</strong></article>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className={styles.slide}>
            <span className={styles.kicker}><Route size={15} /> 실제 발급 E2E</span>
            <h1>업무 확정이 곧<br /><em>검증 가능한 Credential</em>이 됩니다</h1>
            <p className={styles.lead}>별도 수기 등록이 아니라 참가 명단 확정·첫 심사·수상 확정 이벤트가 발급 원천입니다.</p>
            <div className={styles.issuanceFlow}>
              {ISSUANCE_FLOW.map(([Icon, label, body], index) => (
                <React.Fragment key={label}>
                  {index > 0 && <ArrowRight className={styles.flowArrow} size={18} />}
                  <article><span><Icon size={20} /></span><small>0{index + 1}</small><strong>{label}</strong><p>{body}</p></article>
                </React.Fragment>
              ))}
            </div>
            <div className={styles.boundaryNote}>
              <Building2 size={22} /><div><strong>사실 판단은 대학이, 변조 검증은 프로토콜이</strong><p>블록체인은 현실의 사실을 만들지 않습니다. 대학의 확정 이후 기록이 바뀌지 않았는지 증명합니다.</p></div>
            </div>
            <Link className={styles.primaryLink} to="/credentials">관리자 발급 원장 열기 <ExternalLink size={16} /></Link>
          </section>
        )}

        {step === 2 && (
          <section className={styles.slide}>
            <span className={styles.kicker}><BadgeCheck size={15} /> 운영 Credential</span>
            <h1>운영 Credential과 공개 Proof를<br /><em>실시간으로 검증합니다</em></h1>
            <form className={styles.credentialForm} onSubmit={submitCredential}>
              <Link2 size={20} />
              <input value={credentialInput} onChange={(event) => setCredentialInput(event.target.value)} placeholder="Credential 공개 ID 또는 /verify 링크" aria-label="운영 Credential 공개 ID" />
              <button type="submit" disabled={loadingCredential}>{loadingCredential ? <RefreshCw className={styles.spin} size={17} /> : <ShieldCheck size={17} />}{loadingCredential ? "검증 중" : "실시간 검증"}</button>
            </form>
            {credentialError && <div className={styles.error} role="alert"><CircleAlert size={18} />{credentialError}</div>}
            {!credential && !credentialError && <div className={styles.emptyCredential}><Server size={30} /><strong>관리자 검증 원장에서 실제 Credential을 선택하세요</strong><p>Credential 행의 ‘5분 시연’ 버튼을 누르면 공개 ID가 자동 전달됩니다.</p></div>}
            {credential && (
              <div className={`${styles.liveResult} ${evidenceResult?.verified ? styles.liveValid : styles.liveInvalid}`}>
                <div className={styles.liveStatus}><ShieldCheck size={30} /><div><span>{presentation.label}</span><h2>{presentation.headline}</h2><p>{credential.credentialNo} · {credential.credentialType} · {credential.issuerName}</p></div></div>
                <div className={styles.liveChecks}>
                  <div><Check size={17} /><span>기관·발급 내용</span><strong>{evidenceResult.payloadMatches ? "일치" : "확인 필요"}</strong></div>
                  <div><Check size={17} /><span>Leaf 재계산</span><strong>{evidenceResult.leafMatches ? "일치" : "불일치"}</strong></div>
                  <div><Check size={17} /><span>Proof→Root</span><strong>{evidenceResult.merkleRootMatches ? "일치" : "불일치"}</strong></div>
                  <div><Check size={17} /><span>Kaia 기록</span><strong>{evidenceResult.chainRecorded ? "확인" : "없음"}</strong></div>
                </div>
                <div className={styles.liveActions}>
                  <Link to={`/verify/${encodeURIComponent(credential.credentialPublicId)}`}>외부 검증 화면 <ExternalLink size={15} /></Link>
                  {explorerUrl && <a href={explorerUrl} target="_blank" rel="noreferrer">Kaia 트랜잭션 <ExternalLink size={15} /></a>}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className={styles.slide}>
            <span className={styles.kicker}><Fingerprint size={15} /> 독립 재계산</span>
            <h1>서버의 “정상” 응답을<br /><em>그대로 믿지 않습니다</em></h1>
            <p className={styles.lead}>브라우저가 공개된 여섯 bytes32로 Trekkey V1 leaf를 만들고 Proof를 접어 API가 공개한 기준 Root와 비교합니다. 체인 상태는 서버 조회와 Explorer로 교차 확인합니다.</p>
            <div className={styles.proofEquation}>
              <article><small>PUBLIC EVIDENCE</small><strong>issuerId + credentialIdHash<br />+ schema + content + files</strong></article>
              <ArrowRight size={22} />
              <article><small>DOUBLE KECCAK-256</small><strong>{compact(evidenceResult?.calculatedLeafHash || "실제 Credential 선택 필요")}</strong></article>
              <ArrowRight size={22} />
              <article><small>MERKLE PROOF</small><strong>{evidenceResult ? `${evidenceResult.proofDepth}단계` : "Proof 대기"}</strong></article>
              <ArrowRight size={22} />
              <article><small>KAIA ROOT</small><strong>{compact(evidenceResult?.calculatedRoot || "Root 대기")}</strong></article>
            </div>
            <div className={styles.proofVerdict}>
              {evidenceResult?.verified ? <ShieldCheck size={28} /> : <Gauge size={28} />}
              <div><span>브라우저 독립 판정</span><h2>{evidenceResult ? evidenceResult.verified ? "서버 검증 결과와 브라우저 Proof 재계산이 일치합니다" : "운영 증거를 다시 확인해야 합니다" : "앞 단계에서 운영 Credential을 먼저 선택하세요"}</h2></div>
            </div>
            <Link className={styles.primaryLink} to={`/tamper-lab?mode=live${credential?.credentialPublicId ? `&credential=${encodeURIComponent(credential.credentialPublicId)}` : ""}`}>Tamper Lab에서 전체 해시 보기 <ExternalLink size={16} /></Link>
          </section>
        )}

        {step === 4 && (
          <section className={styles.slide}>
            <span className={styles.kicker}><LockKeyhole size={15} /> Privacy & Evidence</span>
            <h1>증명은 공개하되<br /><em>개인정보 원문은 공개하지 않습니다</em></h1>
            <div className={styles.privacyGrid}>
              {PRIVACY_PLACEMENT.map(([Icon, place, data, purpose]) => (
                <article key={place}><span><Icon size={22} /></span><small>{place}</small><strong>{data}</strong><p>{purpose}</p></article>
              ))}
            </div>
            <div className={styles.evidenceStrip}>
              <article><strong>629</strong><span>Java 서버 테스트</span></article>
              <article><strong>12</strong><span>Solidity 테스트</span></article>
              <article><strong>19</strong><span>프런트 검증 테스트</span></article>
              <article><strong>1·10·100·500·1,000</strong><span>브라우저 실측 배치</span></article>
            </div>
            <Link className={styles.primaryLink} to="/evidence-report"><BarChart3 size={16} /> 정량 실험을 지금 다시 실행</Link>
          </section>
        )}

        {step === 5 && (
          <section className={`${styles.slide} ${styles.finalSlide}`}>
            <span className={styles.kicker}><Presentation size={15} /> 결론</span>
            <h1>Trekkey는 대회관리 앱이 아니라<br /><em>검증 가능한 대학 경험의<br />프로토콜이자 플랫폼</em>입니다</h1>
            <div className={styles.threeLayers}>
              <article><small>PROTOCOL</small><strong>Credential·Merkle·기관 승인</strong><p>사실을 표준 증거로 고정합니다.</p></article>
              <article><small>PLATFORM</small><strong>발급·배치·앵커링·검증</strong><p>대학 업무와 공개 원장을 연결합니다.</p></article>
              <article><small>SERVICE</small><strong>대회 운영·활동 이력·외부 제출</strong><p>학생과 대학, 기업이 실제 사용합니다.</p></article>
            </div>
            <div className={styles.roadmap}>
              <span>FUTURE ROADMAP</span>
              <p><strong>취소·정정 운영 UX</strong>는 이번 심사 범위에서 제외하고 향후 구현으로 분리했습니다. 현재 시연은 실제 발급·앵커링·공개 검증·변조 탐지에 집중합니다.</p>
            </div>
            <div className={styles.finalActions}>
              <button type="button" onClick={resetTimer}><TimerReset size={17} /> 처음부터 다시</button>
              {credential && <Link to={`/verify/${encodeURIComponent(credential.credentialPublicId)}`}>최종 Credential 열기 <ExternalLink size={16} /></Link>}
            </div>
          </section>
        )}

        <div className={styles.stageNavigation}>
          <button type="button" disabled={step === 0} onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} /> 이전</button>
          <span>키보드 ← → 로도 이동</span>
          <button type="button" disabled={step === STEPS.length - 1} onClick={() => setStep((current) => current + 1)}>다음 <ArrowRight size={17} /></button>
        </div>
      </main>

      <div className={styles.footerWrap}><AppFooter variant="public" /></div>
    </div>
  );
}
