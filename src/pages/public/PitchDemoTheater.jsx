import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Database,
  FileText,
  Fingerprint,
  Hash,
  Lock,
  Network,
  Pause,
  Play,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trophy,
  Upload,
  Users,
  X
} from "lucide-react";
import {
  createTamperLabFixture,
  evaluateTamperScenario,
  shortenHash
} from "../../lib/tamperLab.js";
import styles from "./PitchDemoTheater.module.scss";

const PRODUCT_LABEL = "PRODUCT FLOW REPLAY · IN-MEMORY · NO WRITE";
const CRYPTO_LABEL = "REAL BROWSER CRYPTO";

const SCENES = [
  {
    id: "contest",
    short: "대회 조회",
    title: "공학경진대회를 찾습니다",
    description: "학생이 교내 대회 일정과 접수 상태를 한 화면에서 확인합니다.",
    duration: 14,
    label: PRODUCT_LABEL,
    receipt: "CONTEST · ENG-2026 · OPEN"
  },
  {
    id: "application",
    short: "참가 신청",
    title: "팀 정보를 제출합니다",
    description: "발표용 비식별 데이터로 참가 신청 흐름을 재현합니다.",
    duration: 15,
    label: PRODUCT_LABEL,
    receipt: "APPLICATION · APP-DEMO-031 · RECEIVED"
  },
  {
    id: "submission",
    short: "승인·제출",
    title: "승인된 팀이 작품을 제출합니다",
    description: "승인 상태와 제출 파일의 SHA-256 기록을 함께 남깁니다.",
    duration: 16,
    label: PRODUCT_LABEL,
    receipt: "SUBMISSION · SUB-DEMO-014 · LOCKED"
  },
  {
    id: "judging",
    short: "심사",
    title: "여섯 기준으로 95점을 확정합니다",
    description: "심사 기준별 점수와 의견을 하나의 결과로 집계합니다.",
    duration: 22,
    label: PRODUCT_LABEL,
    receipt: "REVIEW · 6 CRITERIA · 95 / 100"
  },
  {
    id: "award",
    short: "수상 확정",
    title: "대상 수상 기록을 확정합니다",
    description: "대학이 현실의 사실을 판단하고 발급 가능한 상태로 전환합니다.",
    duration: 13,
    label: PRODUCT_LABEL,
    receipt: "AWARD · 대상 · RANK 1 · CONFIRMED"
  },
  {
    id: "credential",
    short: "Credential",
    title: "네 기록을 하나의 Merkle Root로 묶습니다",
    description: "발급 내용의 실제 해시와 Proof를 이 브라우저에서 계산합니다.",
    duration: 21,
    label: CRYPTO_LABEL,
    receipt: "BATCH · 4 LEAVES · ROOT CALCULATED"
  },
  {
    id: "verification",
    short: "공개 검증",
    title: "가입이나 지갑 없이 진위와 효력을 확인합니다",
    description: "공개된 요약, leaf, Proof, Root와 현재 상태를 함께 판정합니다.",
    duration: 19,
    label: CRYPTO_LABEL,
    receipt: "VERIFY · CONTENT + PROOF + STATUS · VALID"
  },
  {
    id: "tamper",
    short: "한 글자 변조",
    title: "‘대상’을 ‘대샹’으로 바꾸면 즉시 실패합니다",
    description: "한 글자 차이가 contentHash와 leaf를 바꾸므로 기존 Root에 도달하지 못합니다.",
    duration: 20,
    label: CRYPTO_LABEL,
    receipt: "TAMPER · 대상 → 대샹 · DETECTED"
  }
];

const JUDGING = [
  ["문제 정의 및 필요성", 14, 15],
  ["창의성·혁신성", 19, 20],
  ["기술적 완성도", 24, 25],
  ["실용성", 9, 10],
  ["성능 및 결과 검증", 19, 20],
  ["발표 및 시연 가능성", 10, 10]
];

const TOTAL_DURATION = SCENES.reduce((sum, scene) => sum + scene.duration, 0);

function formatClock(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function Field({ label, value, tone }) {
  return (
    <div className={styles.field} data-tone={tone || undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CheckLine({ label, passed = true, pending = false, detail }) {
  return (
    <div className={styles.checkLine} data-pending={pending || undefined} data-passed={!pending && passed || undefined} data-failed={!pending && !passed || undefined}>
      {pending ? <Clock size={14} /> : passed ? <Check size={14} /> : <X size={14} />}
      <span>{label}</span>
      {detail && <code>{detail}</code>}
    </div>
  );
}

export function PitchDemoTheater({ autoStart = false, onComplete }) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [remainingMs, setRemainingMs] = useState(SCENES[0].duration * 1000);
  const [crypto, setCrypto] = useState({ status: "loading", fixture: null, valid: null, tampered: null });
  const startedAtRef = useRef(0);
  const segmentStartedRemainingRef = useRef(SCENES[0].duration * 1000);
  const completionReportedRef = useRef(false);
  const autoStartScheduledRef = useRef(false);
  const current = SCENES[sceneIndex];

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(async () => {
        const fixture = await createTamperLabFixture();
        const [valid, tampered] = await Promise.all([
          evaluateTamperScenario(fixture, "VALID", "대상"),
          evaluateTamperScenario(fixture, "TAMPERED", "대샹")
        ]);
        if (!cancelled) setCrypto({ status: "ready", fixture, valid, tampered });
      })
      .catch((error) => {
        if (!cancelled) setCrypto({ status: "error", fixture: null, valid: null, tampered: null, error });
      });
    return () => { cancelled = true; };
  }, []);

  const reportCompletion = useCallback(() => {
    if (completionReportedRef.current) return;
    completionReportedRef.current = true;
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (!playing) return undefined;
    const runFor = remainingMs;
    segmentStartedRemainingRef.current = runFor;
    startedAtRef.current = performance.now();
    const tick = window.setInterval(() => {
      const elapsed = performance.now() - startedAtRef.current;
      setRemainingMs(Math.max(0, runFor - elapsed));
    }, 100);
    const timer = window.setTimeout(() => {
      window.clearInterval(tick);
      if (sceneIndex < SCENES.length - 1) {
        const nextIndex = sceneIndex + 1;
        setSceneIndex(nextIndex);
        setRemainingMs(SCENES[nextIndex].duration * 1000);
      } else {
        setRemainingMs(0);
        setPlaying(false);
        setCompleted(true);
        reportCompletion();
      }
    }, runFor);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timer);
    };
  // remainingMs is deliberately captured only when playback starts or the scene changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, sceneIndex, reportCompletion]);

  const goTo = useCallback((nextIndex, shouldPlay = false) => {
    const bounded = Math.max(0, Math.min(SCENES.length - 1, nextIndex));
    setStarted(true);
    setCompleted(false);
    setSceneIndex(bounded);
    setRemainingMs(SCENES[bounded].duration * 1000);
    setPlaying(shouldPlay);
  }, []);

  const start = useCallback(() => {
    completionReportedRef.current = false;
    if (completed) {
      goTo(0, true);
      return;
    }
    setStarted(true);
    setPlaying(true);
  }, [completed, goTo]);

  const pause = useCallback(() => {
    const elapsed = performance.now() - startedAtRef.current;
    setRemainingMs(Math.max(0, segmentStartedRemainingRef.current - elapsed));
    setPlaying(false);
  }, []);

  const reset = useCallback(() => {
    completionReportedRef.current = false;
    setStarted(false);
    setPlaying(false);
    setCompleted(false);
    setSceneIndex(0);
    setRemainingMs(SCENES[0].duration * 1000);
  }, []);

  useEffect(() => {
    if (!autoStart || autoStartScheduledRef.current || crypto.status !== "ready") return undefined;
    autoStartScheduledRef.current = true;
    const timer = window.setTimeout(start, 1_500);
    return () => window.clearTimeout(timer);
  }, [autoStart, crypto.status, start]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(event.target?.tagName)) return;
      if (event.key === " ") {
        event.preventDefault();
        if (!started || completed) start();
        else if (playing) pause();
        else setPlaying(true);
      }
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        goTo(sceneIndex + 1, false);
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goTo(sceneIndex - 1, false);
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [completed, goTo, pause, playing, reset, sceneIndex, start, started]);

  const totalElapsed = useMemo(() => {
    const previous = SCENES.slice(0, sceneIndex).reduce((sum, scene) => sum + scene.duration, 0);
    const currentElapsed = current.duration - remainingMs / 1000;
    return Math.min(TOTAL_DURATION, previous + Math.max(0, currentElapsed));
  }, [current.duration, remainingMs, sceneIndex]);

  const renderScene = () => {
    if (current.id === "contest") {
      return (
        <div className={styles.productFrame}>
          <div className={styles.searchBar}><Search size={15} /><span>2026 공학경진대회</span><kbd>검색</kbd></div>
          <div className={styles.contestCard}>
            <div className={styles.contestDate}><Calendar size={17} /><strong>08.24</strong><span>접수 마감</span></div>
            <div><small>컴퓨터공학부 · 교내 대회</small><h4>2026 공학경진대회</h4><p>팀 참가 · 작품 제출 · 심사 · 수상 인증</p></div>
            <span className={styles.statusPill}>접수중</span>
          </div>
          <div className={styles.miniStats}><Field label="참가 팀" value="18" /><Field label="심사 기준" value="6개" /><Field label="결과 발표" value="08.31" /></div>
        </div>
      );
    }

    if (current.id === "application") {
      return (
        <div className={styles.productFrame}>
          <div className={styles.windowTitle}><Users size={16} /><strong>참가 신청</strong><span>DRAFT → SUBMITTED</span></div>
          <div className={styles.formGrid}>
            <Field label="팀명" value="Trekkey" />
            <Field label="대표자" value="김트레키 · 학번 비식별" />
            <Field label="작품 분야" value="블록체인·웹 서비스" />
            <Field label="팀원" value="4명 · 동의 완료" />
          </div>
          <div className={styles.actionRow}><Lock size={14} /><span>실제 계정·서버에 저장하지 않는 발표 재현입니다.</span><button type="button"><Send size={13} />신청 제출</button></div>
        </div>
      );
    }

    if (current.id === "submission") {
      return (
        <div className={styles.productFrame}>
          <div className={styles.approvalBanner}><BadgeCheck size={18} /><div><small>APPLICATION STATUS</small><strong>참가 승인 완료</strong></div><span>APPROVED</span></div>
          <div className={styles.uploadCard}>
            <Upload size={22} />
            <div><strong>Trekkey_작품계획서.pdf</strong><span>2.4 MB · PDF · 제출 잠금</span></div>
            <Check size={17} />
          </div>
          <div className={styles.hashRow}><Hash size={14} /><span>FILE SHA-256</span><code>0x91c84f2e…b6f014a2</code><em>RECORDED</em></div>
        </div>
      );
    }

    if (current.id === "judging") {
      return (
        <div className={styles.judgingFrame}>
          <div className={styles.scoreSummary}><ClipboardCheck size={20} /><div><small>REVIEW COMPLETE</small><strong>95</strong><span>/ 100</span></div><p>6개 평가 기준<br />합산 결과</p></div>
          <div className={styles.criteria}>
            {JUDGING.map(([label, score, max]) => (
              <div key={label} className={styles.criterion}>
                <div><span>{label}</span><strong>{score}<small>/{max}</small></strong></div>
                <i><b style={{ width: `${(score / max) * 100}%` }} /></i>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (current.id === "award") {
      return (
        <div className={styles.awardFrame}>
          <div className={styles.trophyHalo}><Trophy size={42} /></div>
          <small>2026 공학경진대회 · 최종 결과</small>
          <h3>대상</h3>
          <strong>Trekkey</strong>
          <div className={styles.confirmation}><BadgeCheck size={16} /><span>대학 관리자 수상 확정</span><time>2026.08.31 17:00</time></div>
        </div>
      );
    }

    if (current.id === "credential") {
      const fixture = crypto.fixture;
      return (
        <div className={styles.cryptoFrame}>
          <div className={styles.credentialCard}>
            <div><Fingerprint size={20} /><span>AWARD CREDENTIAL</span></div>
            <small>{fixture?.targetCredential.credentialNo || "계산 중…"}</small>
            <strong>2026 공학경진대회 · 대상</strong>
            <p>발급기관 한성대학교 · 팀 Trekkey · 순위 1</p>
            <code>{shortenHash(fixture?.targetCommitment.leafHash, 14, 10) || "leaf 계산 중…"}</code>
          </div>
          <div className={styles.merkleTree}>
            <div className={styles.leaves}>
              {(fixture?.commitments || Array.from({ length: 4 })).map((commitment, index) => (
                <span key={index} data-target={index === 2 || undefined}>L{index + 1}<code>{shortenHash(commitment?.leafHash, 5, 4) || "…"}</code></span>
              ))}
            </div>
            <Network size={18} />
            <div className={styles.rootNode}><small>MERKLE ROOT</small><code>{shortenHash(fixture?.batch.root, 15, 11) || "계산 중…"}</code></div>
            <p><Database size={13} /> {fixture?.batch.credentialCount || 4}개 Credential · Proof depth {fixture?.proof.length ?? 2}</p>
          </div>
        </div>
      );
    }

    if (current.id === "verification") {
      const valid = crypto.valid;
      const pending = crypto.status === "loading";
      return (
        <div className={styles.verifyFrame} data-valid>
          <div className={styles.verdict}><ShieldCheck size={34} /><div><small>PUBLIC VERIFICATION</small><strong>{valid?.verificationStatus || "계산 중"}</strong><span>기관 발급 내용과 현재 효력이 확인되었습니다.</span></div></div>
          <div className={styles.checks}>
            <CheckLine label="공개 내용 SHA-256" pending={pending} passed={Boolean(valid?.contentMatches)} detail={shortenHash(valid?.calculatedContentHash, 7, 5)} />
            <CheckLine label="Credential leaf" pending={pending} passed={Boolean(valid?.contentMatches)} detail={shortenHash(valid?.calculatedLeafHash, 7, 5)} />
            <CheckLine label="Merkle Proof → Root" pending={pending} passed={Boolean(valid?.merkleProofMatches)} detail={shortenHash(valid?.calculatedRoot, 7, 5)} />
            <CheckLine label="현재 효력" pending={pending} passed={valid?.lifecycleStatus === "ACTIVE"} detail={valid?.lifecycleStatus || "CHECK"} />
          </div>
        </div>
      );
    }

    const tampered = crypto.tampered;
    return (
      <div className={styles.tamperFrame}>
        <div className={styles.diffBox}>
          <div><small>발급 원문</small><strong>대상</strong><code>{shortenHash(tampered?.expectedContentHash, 10, 7)}</code></div>
          <span><AlertTriangle size={18} />한 글자</span>
          <div data-tampered><small>변경된 공개 내용</small><strong>대샹</strong><code>{shortenHash(tampered?.calculatedContentHash, 10, 7)}</code></div>
        </div>
        <div className={styles.failureVerdict}><X size={22} /><div><small>VERIFICATION RESULT</small><strong>{tampered?.verificationStatus || "계산 중"}</strong></div><p>기존 Proof로<br />발급 Root에 도달 실패</p></div>
        <div className={styles.failureChecks}>
          <CheckLine label="contentHash 일치" passed={tampered?.contentMatches ?? false} />
          <CheckLine label="Merkle Root 일치" passed={tampered?.merkleProofMatches ?? false} />
          <CheckLine label="변조 탐지" passed={tampered?.verificationStatus === "TAMPERED"} detail="DETECTED" />
        </div>
      </div>
    );
  };

  return (
    <section className={styles.theater} aria-label="Trekkey 자동 시연" data-playing={playing || undefined}>
      <header className={styles.theaterHeader}>
        <div>
          <span className={styles.liveDot} />
          <strong>DEMO THEATER</strong>
          <small>{current.label}</small>
        </div>
        <div className={styles.timecode}>
          <Clock size={13} />
          <span>{formatClock(totalElapsed)}</span>
          <i>/ {formatClock(TOTAL_DURATION)}</i>
        </div>
      </header>

      <nav className={styles.sceneTabs} aria-label="시연 장면">
        {SCENES.map((scene, index) => (
          <button
            key={scene.id}
            type="button"
            className={index === sceneIndex ? styles.activeTab : undefined}
            data-complete={index < sceneIndex || (completed && index === sceneIndex) || undefined}
            onClick={() => goTo(index, false)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{scene.short}</strong>
          </button>
        ))}
      </nav>

      <div className={styles.workbench}>
        <article className={styles.scenePanel}>
          <header>
            <div><span>SCENE {String(sceneIndex + 1).padStart(2, "0")}</span><strong>{current.title}</strong><p>{current.description}</p></div>
            <time>{formatClock(remainingMs / 1000)}</time>
          </header>
          <div className={styles.sceneViewport} aria-live="polite">{renderScene()}</div>
        </article>

        <aside className={styles.receiptRail}>
          <header><FileText size={15} /><strong>검증 흐름</strong><span>RECEIPTS</span></header>
          <ol>
            {SCENES.map((scene, index) => {
              const reached = index <= sceneIndex;
              const active = index === sceneIndex;
              return (
                <li key={scene.id} data-reached={reached || undefined} data-active={active || undefined}>
                  <i>{reached ? <Check size={11} /> : index + 1}</i>
                  <div><strong>{scene.short}</strong><code>{reached ? scene.receipt : "PENDING"}</code></div>
                </li>
              );
            })}
          </ol>
          <div className={styles.safetyReceipt}><Lock size={13} /><span>로그인 없음<br />API·DB 쓰기 없음</span></div>
        </aside>
      </div>

      <footer className={styles.theaterControls}>
        <div className={styles.progressTrack}><i style={{ width: `${(totalElapsed / TOTAL_DURATION) * 100}%` }} /></div>
        <div className={styles.controlRow}>
          <button type="button" onClick={() => goTo(sceneIndex - 1, false)} disabled={sceneIndex === 0} aria-label="이전 장면"><ChevronLeft size={16} /></button>
          {!started || completed ? (
            <button type="button" className={styles.primaryControl} onClick={start}><Play size={15} />{completed ? "처음부터 다시" : "자동 시연 시작"}</button>
          ) : playing ? (
            <button type="button" className={styles.primaryControl} onClick={pause}><Pause size={15} />일시정지</button>
          ) : (
            <button type="button" className={styles.primaryControl} onClick={() => setPlaying(true)}><Play size={15} />계속 재생</button>
          )}
          <button type="button" onClick={() => goTo(sceneIndex + 1, false)} disabled={sceneIndex === SCENES.length - 1} aria-label="다음 장면"><ChevronRight size={16} /></button>
          <button type="button" onClick={reset} aria-label="시연 초기화"><RotateCcw size={14} /><span>초기화</span></button>
          <div className={styles.cryptoState} data-ready={crypto.status === "ready" || undefined} data-error={crypto.status === "error" || undefined}>
            <Fingerprint size={13} />
            <span>{crypto.status === "ready" ? "실제 해시 계산 준비 완료" : crypto.status === "error" ? "브라우저 암호화 계산 실패" : "브라우저 해시 계산 중"}</span>
          </div>
        </div>
      </footer>
    </section>
  );
}

export default PitchDemoTheater;
