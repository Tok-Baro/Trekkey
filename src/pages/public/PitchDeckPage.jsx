import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  Gauge,
  GraduationCap,
  KeyRound,
  Layers3,
  Maximize2,
  Network,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles,
  StickyNote,
  TimerReset,
  Trophy,
  UserCheck,
  UsersRound,
  Workflow,
  X
} from "lucide-react";
import { runRuntimeBenchmark } from "../../lib/tamperLab.js";
import { PitchDemoTheater } from "./PitchDemoTheater.jsx";
import styles from "./PitchDeckPage.module.scss";

const SLIDES = [
  {
    id: "opening", time: "00:00", label: "OPENING", score: "첫 35초",
    note: "Trekkey는 교내 대회 운영 과정에서 학교가 확정한 참가·작품·수상 기록을 외부 검증 가능한 Credential로 전환합니다.",
    cue: "보고서와 같은 작품임을 첫 문장에서 확인시키고 ‘운영에서 검증까지’를 강조합니다."
  },
  {
    id: "problem", time: "00:35", label: "PROBLEM", score: "문제·필요성 15 · 50초",
    note: "대회 공고·신청·제출·심사·수상 기록은 부서별 문서에 흩어지고, 학생이 졸업하면 학교 밖에서 진위와 현재 효력을 확인하기 어렵습니다.",
    cue: "보고서에 적은 두 문제인 ‘운영 분산’과 ‘졸업 후 검증 단절’을 그대로 회수합니다."
  },
  {
    id: "urgency", time: "01:25", label: "WHY NOW", score: "문제 + 혁신 · 40초",
    note: "AI로 자기서술의 완성도가 평준화될수록 잘 쓴 문장보다 누가 언제 무엇을 확정했는지 확인 가능한 발급 근거가 중요해집니다.",
    cue: "AI를 주 문제가 아니라, 보고서 문제의 시급성을 높이는 배경으로만 사용합니다."
  },
  {
    id: "trust", time: "02:05", label: "TRUST MODEL", score: "창의성·혁신성 20 · 45초",
    note: "대학이 현실의 사실을 판단합니다. Trekkey는 발급 당시 내용의 변경을 탐지하고, VALID·REVOKED·SUPERSEDED로 현재 효력을 갱신합니다.",
    cue: "‘모든 것을 바꿀 수 없게’가 아니라 ‘내용은 고정, 효력은 갱신’이라고 말합니다."
  },
  {
    id: "usage", time: "02:50", label: "USER JOURNEY", score: "실용성 10 · 50초",
    note: "학생, 대학 관리자, 심사위원, 외부 검증자가 서로 다른 화면을 사용하지만 하나의 대회 기록과 Credential 흐름으로 연결됩니다.",
    cue: "각 사용자가 기존에 반복하던 일을 무엇으로 줄이는지 한 문장씩 말합니다."
  },
  {
    id: "architecture", time: "03:40", label: "ARCHITECTURE", score: "기술적 완성도 25 · 75초",
    note: "대회 결과 확정, Canonical snapshot, Merkle batch, EIP-712 기관 승인, Kaia 앵커링, 공개 검증까지 E2E로 연결됩니다. 개인정보 원문은 체인에 올리지 않습니다.",
    cue: "Transactional Outbox와 UNKNOWN 재조회까지 짚어 체인 응답 불명확성 처리도 구현했음을 보여줍니다."
  },
  {
    id: "progress", time: "04:55", label: "REPORT → NOW", score: "완성도 + 결과 · 40초",
    note: "예비보고서에서 향후 계획이었던 심사 운영 화면, 공개 QR·PDF 검증, 외부 증빙 2인 검수, 졸업 자가점검을 실제 화면으로 연결했습니다.",
    cue: "외부 증빙→Credential 자동 발급은 아직 별도라는 경계와 KMS·S3·Mainnet은 다음 단계라고 밝힙니다."
  },
  {
    id: "demo", time: "05:35", label: "LIVE TAMPER LAB", score: "기술 + 시연 · 155초",
    note: "결정적 데모 fixture로 정상 Proof, 한 글자 변조, 폐기, 대체 상태를 실제 브라우저에서 계산합니다. 영상이나 미리 정한 결과가 아닙니다.",
    cue: "‘대상’을 ‘대샹’으로 한 글자만 바꿔 contentHash→leaf→Root 실패를 보여주고 자동 발표 모드로 진행합니다."
  },
  {
    id: "evidence", time: "08:10", label: "EVIDENCE", score: "성능·결과 검증 20 · 70초",
    note: "1,000-leaf 수치는 전체 TPS가 아니라 이 브라우저의 hash·Merkle Tree·Proof 생성 및 검증 시간입니다. 정확성 테스트와 성능 측정을 구분합니다.",
    cue: "화면에 방금 측정된 시간과 PASS가 뜬 것을 읽고, CSV 재현 화면을 엽니다."
  },
  {
    id: "closing", time: "09:20", label: "CLOSING", score: "전체 회수 · 40초",
    note: "Trekkey는 대회 운영으로 검증할 사실을 만들고, Merkle Proof와 Kaia로 그 사실의 무결성과 현재 효력을 학교 밖에서도 확인하게 합니다.",
    cue: "마지막 문장을 천천히 말한 뒤 10분 전에 멈춥니다."
  }
];

const PIPELINE = [
  [UserCheck, "업무 확정", "참가·작품·수상"],
  [Database, "Canonical JSON", "불변 snapshot"],
  [Fingerprint, "Merkle Batch", "여러 leaf → Root"],
  [KeyRound, "기관 승인", "EIP-712 서명"],
  [Layers3, "Kaia Anchor", "Root·상태 기록"],
  [BadgeCheck, "공개 검증", "QR·Proof 확인"]
];

const USER_JOURNEYS = [
  {
    icon: UsersRound,
    actor: "학생",
    outcome: "하나의 포털에서 대회를 끝까지",
    steps: ["대회 조회·참가 신청", "팀 구성·작품 제출", "수상·활동 이력 확인"],
    badge: "PARTICIPANT"
  },
  {
    icon: Database,
    actor: "대학 관리자",
    outcome: "운영과 발급을 한 흐름으로",
    steps: ["신청·제출 관리", "심사 배정·수상 확정", "Credential 발급·앵커링"],
    badge: "OPERATOR"
  },
  {
    icon: ClipboardCheck,
    actor: "심사위원",
    outcome: "배정된 작품에 바로 평가",
    steps: ["전용 링크 접속", "평가 기준별 점수", "의견 제출·완료 추적"],
    badge: "REVIEWER"
  },
  {
    icon: ShieldCheck,
    actor: "외부 검증자",
    outcome: "가입·지갑 없이 즉시 확인",
    steps: ["QR·공개 링크", "기관·내용·효력", "필요 시 Proof 재계산"],
    badge: "PUBLIC"
  }
];

const REPORT_PROGRESS = [
  [ClipboardCheck, "심사 운영 UX", "라운드·심사위원 배정·점수·수상 확정 화면 연결", "계획 → 구현"],
  [BadgeCheck, "공개 검증 패키지", "QR·인쇄/PDF·Proof 재계산·상태 판정", "계획 → 구현"],
  [FileCheck2, "외부 증빙 검수", "서로 다른 관리자 2인의 검수와 졸업 기록 반영", "별도 흐름 구현"],
  [GraduationCap, "졸업 자가점검", "정책 기준일·공식 근거·충족·부족·확인 필요", "자가점검 구현"]
];

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PitchDeckPage() {
  const [slide, setSlide] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [notesVisible, setNotesVisible] = useState(false);
  const [benchmark, setBenchmark] = useState({ status: "idle", result: null });
  const benchmarkStarted = useRef(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Trekkey | 10분 공학경진대회 발표";
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(tag)) return;
      if (slide === 7 && ["ArrowRight", "ArrowLeft", "PageDown", "PageUp", " "].includes(event.key)) return;
      if (["ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        setSlide((value) => Math.min(SLIDES.length - 1, value + 1));
      }
      if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        setSlide((value) => Math.max(0, value - 1));
      }
      if (event.key === "Home") setSlide(0);
      if (event.key === "End") setSlide(SLIDES.length - 1);
      if (event.key.toLowerCase() === "t") setRunning((value) => !value);
      if (event.key.toLowerCase() === "n") setNotesVisible((value) => !value);
      if (event.key.toLowerCase() === "f") {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [slide]);

  useEffect(() => {
    if (SLIDES[slide].id !== "evidence" || benchmarkStarted.current) return;
    benchmarkStarted.current = true;
    setBenchmark({ status: "running", result: null });
    runRuntimeBenchmark([1000])
      .then(([result]) => setBenchmark({ status: "complete", result }))
      .catch(() => setBenchmark({ status: "error", result: null }));
  }, [slide]);

  const reset = () => {
    setElapsed(0);
    setRunning(false);
    setSlide(0);
  };

  const rerunBenchmark = () => {
    setBenchmark({ status: "running", result: null });
    runRuntimeBenchmark([1000])
      .then(([result]) => setBenchmark({ status: "complete", result }))
      .catch(() => setBenchmark({ status: "error", result: null }));
  };

  const handleDemoComplete = useCallback(() => setSlide(8), []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  };

  return (
    <div className={styles.deck}>
      <header className={styles.hud}>
        <Link className={styles.brand} to="/home"><Layers3 size={18} /><strong>Trekkey</strong><span>ENGINEERING PITCH · 10 MIN</span></Link>
        <div className={styles.clock} data-over={elapsed > 600 || undefined} data-warning={(elapsed > 560 && elapsed <= 600) || undefined}>
          <span>LIVE</span><strong>{formatTime(elapsed)}</strong><i>/ 10:00</i>
        </div>
        <div className={styles.tools}>
          <button type="button" onClick={() => setRunning((value) => !value)}>{running ? <Pause size={16} /> : <Play size={16} />}{running ? "정지" : "시작"}</button>
          <button type="button" onClick={() => setNotesVisible((value) => !value)} aria-label="발표 노트"><StickyNote size={16} /></button>
          <button type="button" onClick={reset} aria-label="발표 초기화"><RotateCcw size={16} /></button>
          <button type="button" onClick={toggleFullscreen} aria-label="전체 화면"><Maximize2 size={16} /></button>
        </div>
      </header>

      <main className={styles.stage} data-slide={SLIDES[slide].id}>
        <div className={styles.slideMeta}>
          <span>{SLIDES[slide].label}</span><strong>{SLIDES[slide].score}</strong><time>{SLIDES[slide].time}</time>
        </div>

        {slide === 0 && (
          <section className={`${styles.slide} ${styles.opening}`}>
            <div className={styles.eyebrow}><Sparkles size={15} /> 제22회 공학경진대회 · TREKKEY</div>
            <h1>교내 대회 운영에서,<br /><em>검증 가능한 성과로.</em></h1>
            <p className={styles.technicalTitle}>교내 대회 운영과 성과 검증을 연결하는<br /><strong>Merkle Proof 기반 Credential 플랫폼</strong></p>
            <div className={styles.openingFooter}><span>TREKKEY</span><i /><p>개인정보 원문은 기관에 · 무결성과 현재 효력의 근거는 공개 검증으로</p></div>
          </section>
        )}

        {slide === 1 && (
          <section className={`${styles.slide} ${styles.problem}`}>
            <div className={styles.eyebrow}><CircleAlert size={15} /> PROBLEM DEFINITION</div>
            <h2>학교 안에서 확정된 성과가,<br /><em>학교 밖에서는 다시 문서가 됩니다.</em></h2>
            <div className={styles.problemGrid}>
              <article><Database size={28} /><small>대학 내부</small><strong>운영 기록이<br />부서별 문서에 분산</strong><p>공고·신청·제출·심사·수상 기록이 서로 다른 문서와 시스템에 남습니다.</p></article>
              <div className={styles.gap}><span>졸업 · 공유</span><i /><b>단절</b></div>
              <article><ShieldCheck size={28} /><small>학교 외부</small><strong>진위와 현재 효력을<br />즉시 확인하기 어려움</strong><p>학생이 제출한 PDF와 자기서술만으로는 발급 주체·변경 여부·취소 상태를 알기 어렵습니다.</p></article>
            </div>
            <blockquote>한 대회를 끝냈는데도, 학생에게 남는 것은<br /><strong>학교 밖에서 곧바로 검증할 수 없는 기록</strong>입니다.</blockquote>
          </section>
        )}

        {slide === 2 && (
          <section className={`${styles.slide} ${styles.thesis}`}>
            <div className={styles.eyebrow}><BrainCircuit size={15} /> WHY NOW</div>
            <h2>AI가 글을 평준화할수록,<br /><em>발급 근거가 더 중요해집니다.</em></h2>
            <div className={styles.layerFlow}>
              <article><span>01</span><BrainCircuit size={26} /><small>SELF NARRATIVE</small><strong>누구나 작성</strong><p>문장은 더 좋아졌지만 실제 활동 여부는 문장만으로 확인하기 어렵습니다.</p></article>
              <ChevronRight size={24} />
              <article><span>02</span><GraduationCap size={26} /><small>UNIVERSITY RECORD</small><strong>대학이 확정</strong><p>누가·언제·무엇을 했는지 담당자가 근거와 함께 확정합니다.</p></article>
              <ChevronRight size={24} />
              <article><span>03</span><ShieldCheck size={26} /><small>PUBLIC PROOF</small><strong>누구나 확인</strong><p>발급기관·공개 내용·변경 여부·현재 효력을 로그인 없이 확인합니다.</p></article>
            </div>
            <div className={styles.kick}><ShieldCheck size={20} /><strong>AI는 문제의 배경</strong><span>핵심은 발급자 · 무결성 · 현재 효력</span></div>
          </section>
        )}

        {slide === 3 && (
          <section className={`${styles.slide} ${styles.trust}`}>
            <div className={styles.eyebrow}><ShieldCheck size={15} /> TRUST MODEL</div>
            <h2>발급 내용은 고정하고,<br /><em>현재 효력은 갱신합니다.</em></h2>
            <div className={styles.trustGrid}>
              <article><GraduationCap size={25} /><small>01 · REALITY</small><strong>대학이 사실을 판단</strong><p>참가·작품·수상 근거를 확인하고 발급 여부를 결정합니다.</p></article>
              <article><Fingerprint size={25} /><small>02 · INTEGRITY</small><strong>변경을 즉시 탐지</strong><p>Canonical snapshot의 한 글자 변경도 다른 contentHash와 leaf를 만듭니다.</p></article>
              <article><Activity size={25} /><small>03 · VALIDITY</small><strong>효력 상태를 갱신</strong><p>VALID · REVOKED · SUPERSEDED로 진짜 기록의 현재 사용 가능 여부를 구분합니다.</p></article>
            </div>
            <div className={styles.proofFormula}>
              <div><small>APPROVED CLAIMS</small><strong>canonical JSON</strong></div><ChevronRight size={19} />
              <div><small>CONTENT HASH</small><strong>SHA-256</strong></div><ChevronRight size={19} />
              <div><small>TREKKEY LEAF</small><strong>6 × bytes32</strong></div><ChevronRight size={19} />
              <div className={styles.formulaPass}><small>MERKLE ROOT</small><strong><Check size={15} /> Kaia 기준값</strong></div>
            </div>
            <div className={styles.precisionNote}><CircleAlert size={18} /><p><strong>블록체인이 진실을 결정하지 않습니다.</strong> 대학이 사실성을 책임지고, Trekkey는 승인 이후의 내용 무결성과 현재 효력을 검증합니다.</p></div>
          </section>
        )}

        {slide === 4 && (
          <section className={`${styles.slide} ${styles.usage}`}>
            <div className={styles.eyebrow}><UsersRound size={15} /> USER JOURNEY</div>
            <h2>하나의 검증 가능한 흐름으로<br /><em>네 사용자의 일을 줄입니다.</em></h2>
            <div className={styles.journeyGrid}>
              {USER_JOURNEYS.map(({ icon: Icon, actor, outcome, steps, badge }) => (
                <article key={actor}>
                  <header><Icon size={23} /><span>{badge}</span></header>
                  <small>{actor}</small>
                  <strong>{outcome}</strong>
                  <ol>{steps.map((step, index) => <li key={step}><b>0{index + 1}</b><span>{step}</span></li>)}</ol>
                </article>
              ))}
            </div>
            <div className={styles.journeyOutcome}><Network size={19} /><strong>하나의 기록</strong><span>운영에서 사실을 만들고</span><i /><span>Credential로 묶고</span><i /><span>공개 Proof로 검증합니다</span></div>
          </section>
        )}

        {slide === 5 && (
          <section className={`${styles.slide} ${styles.architecture}`}>
            <div className={styles.eyebrow}><Workflow size={15} /> END-TO-END ARCHITECTURE</div>
            <h2>업무 확정부터 Kaia 검증까지<br /><em>한 번도 끊기지 않습니다.</em></h2>
            <div className={styles.pipeline}>
              {PIPELINE.map(([Icon, title, body], index) => (
                <React.Fragment key={title}>{index > 0 && <ChevronRight className={styles.pipelineArrow} size={18} />}<article><span>0{index + 1}</span><Icon size={22} /><strong>{title}</strong><p>{body}</p></article></React.Fragment>
              ))}
            </div>
            <div className={styles.runtimeSplit}>
              <article><Server size={18} /><div><small>INSTITUTION SERVER</small><strong>개인정보 원문 · 업무 근거</strong></div></article>
              <article><Fingerprint size={18} /><div><small>PUBLIC VERIFICATION</small><strong>동의된 요약 · Proof 재계산</strong></div></article>
              <article><Layers3 size={18} /><div><small>KAIA KAIROS</small><strong>Root · 발급자 · 현재 상태</strong></div></article>
            </div>
            <div className={styles.reliabilityStrip}><Activity size={17} /><strong>체인 장애도 업무 유실 없이</strong><span>Transactional Outbox</span><i /><span>UNKNOWN 상태</span><i /><span>동일 트랜잭션 재조회</span></div>
            <p className={styles.scopeLine}>Java · JavaScript · Solidity가 같은 fixture로 leaf와 Root를 교차 재현합니다.</p>
          </section>
        )}

        {slide === 6 && (
          <section className={`${styles.slide} ${styles.progress}`}>
            <div className={styles.eyebrow}><Trophy size={15} /> REPORT → NOW</div>
            <h2>예비보고서의 계획이,<br /><em>실제 사용 화면이 되었습니다.</em></h2>
            <div className={styles.progressGrid}>
              {REPORT_PROGRESS.map(([Icon, title, body, status]) => (
                <article key={title}><header><Icon size={22} /><span>{status}</span></header><strong>{title}</strong><p>{body}</p></article>
              ))}
            </div>
            <div className={styles.progressEvidence}>
              <article><small>예비보고서</small><strong>Java 322 tests</strong><span>대회·Credential 핵심</span></article>
              <ChevronRight size={18} />
              <article><small>Credential 공개 릴리스</small><strong>629-case suite</strong><span>604 PASS · 25 MySQL-only SKIP · 0 FAIL</span></article>
              <i />
              <p><strong>구현 경계</strong> 외부 증빙 검수와 졸업 자가점검은 별도 업무 흐름입니다. 자동 Credential 발급과 공식 졸업사정은 후속 범위입니다.</p>
            </div>
          </section>
        )}

        {slide === 7 && (
          <section className={`${styles.slide} ${styles.demo}`}>
            <div className={styles.demoHeading}>
              <div><span className={styles.eyebrow}><Presentation size={15} /> 140-SECOND GUIDED DEMO</span><h2>운영에서 검증까지, <em>한 사건으로 보여드립니다.</em></h2></div>
              <Link target="_blank" rel="noreferrer" to="/tamper-lab?present=1&autoplay=1"><Fingerprint size={15} /> 전체 Tamper Lab <ExternalLink size={13} /></Link>
            </div>
            <PitchDemoTheater autoStart onComplete={handleDemoComplete} />
          </section>
        )}

        {slide === 8 && (
          <section className={`${styles.slide} ${styles.evidence}`}>
            <div className={styles.eyebrow}><BarChart3 size={15} /> REPRODUCIBLE EVIDENCE</div>
            <h2>정확성과 성능을<br /><em>서로 다른 방법으로 검증했습니다.</em></h2>
            <div className={styles.metricGrid}>
              <article className={styles.liveMetric}>
                <small>LIVE · 1,000-LEAF BROWSER CRYPTO</small>
                {benchmark.status === "running" && <><Gauge className={styles.pulse} size={34} /><strong>측정 중…</strong></>}
                {benchmark.status === "complete" && <><Check size={34} /><strong>{benchmark.result.durationMs.toFixed(2)} ms</strong><span>{benchmark.result.proofMatches ? "PROOF PASS" : "CHECK REQUIRED"}</span></>}
                {benchmark.status === "error" && <><CircleAlert size={34} /><strong>측정 재시도</strong><span>브라우저 계산 오류</span></>}
                {benchmark.status === "idle" && <><Gauge size={34} /><strong>준비 중</strong></>}
              </article>
              <article><small>CREDENTIAL RELEASE</small><strong>629-case suite</strong><span>604 PASS · 25 MySQL-only SKIP · 0 FAIL</span></article>
              <article><small>SMART CONTRACT</small><strong>12 PASS</strong><span>Root·서명·권한·상태 전이</span></article>
              <article><small>FRONTEND</small><strong>19 PASS</strong><span>해시 fixture·API·Proof 재현</span></article>
            </div>
            <div className={styles.evidenceActions}>
              <button type="button" onClick={rerunBenchmark} disabled={benchmark.status === "running"}><TimerReset size={16} /> 다시 측정</button>
              <Link target="_blank" rel="noreferrer" to="/evidence-report"><BarChart3 size={16} /> 원시 결과·CSV 열기 <ExternalLink size={13} /></Link>
            </div>
            <p className={styles.measureScope}><Gauge size={17} /><strong>측정 범위</strong> SHA-256 · leaf · Merkle Tree · 중앙 Proof 생성·검증. 전체 TPS나 네트워크·DB·체인 확정 시간은 포함하지 않습니다.</p>
          </section>
        )}

        {slide === 9 && (
          <section className={`${styles.slide} ${styles.closing}`}>
            <div className={styles.eyebrow}><ShieldCheck size={15} /> FROM OPERATION TO VERIFICATION</div>
            <h2>대회 운영으로 사실을 만들고,<br /><em>학교 밖에서도 검증하게 합니다.</em></h2>
            <div className={styles.outcomes}>
              <article><GraduationCap size={23} /><small>대학</small><strong>운영과 발급을 한 흐름으로</strong><p>기존 업무의 확정 결과가 검증 가능한 기록이 됩니다.</p></article>
              <article><UserCheck size={23} /><small>학생</small><strong>한 번 승인받고 계속 공유</strong><p>발급 시 공개에 동의한 요약만 링크와 QR로 제시합니다.</p></article>
              <article><ShieldCheck size={23} /><small>외부 검증자</small><strong>로그인·지갑 없이 즉시 확인</strong><p>발급기관·내용 무결성·현재 효력을 공개 Proof로 확인합니다.</p></article>
            </div>
            <div className={styles.roadmapStrip}><span>NOW</span><strong>대회 운영 E2E · Credential · Merkle/Kaia · 공개 검증 · Tamper Lab</strong><i /><span>EXTEND</span><p>외부 증빙 검수 · 졸업 자가점검</p><i /><span>NEXT</span><p>S3·KMS·모니터링 · 내부 베타 후 Mainnet 검토</p></div>
            <blockquote>Trekkey는 모든 경험의 진실을 판정하지 않습니다.<br /><strong>대학이 승인한 기록이 이후 변조되지 않았고 지금도 유효한지를 누구나 검증하게 합니다.</strong></blockquote>
          </section>
        )}
      </main>

      {notesVisible && (
        <aside className={styles.presenterNotes} aria-live="polite">
          <div><span>PRESENTER NOTE · {SLIDES[slide].time}</span><button type="button" onClick={() => setNotesVisible(false)} aria-label="발표 노트 닫기"><X size={15} /></button></div>
          <p>{SLIDES[slide].note}</p><strong>NEXT CUE</strong><small>{SLIDES[slide].cue}</small>
        </aside>
      )}

      <footer className={styles.controls}>
        <button type="button" onClick={() => setSlide((value) => Math.max(0, value - 1))} disabled={slide === 0}><ChevronLeft size={18} /> 이전</button>
        <nav aria-label="발표 슬라이드">{SLIDES.map((item, index) => <button key={item.id} type="button" aria-label={`${index + 1}번 슬라이드`} className={slide === index ? styles.activeDot : ""} onClick={() => setSlide(index)} />)}</nav>
        <span>{String(slide + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}</span>
        <button type="button" onClick={() => setSlide((value) => Math.min(SLIDES.length - 1, value + 1))} disabled={slide === SLIDES.length - 1}>다음 <ChevronRight size={18} /></button>
      </footer>
    </div>
  );
}
