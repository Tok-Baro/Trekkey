import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Database,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  Gauge,
  GraduationCap,
  KeyRound,
  Layers3,
  Link2,
  LockKeyhole,
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
  UserCheck,
  Workflow,
  X
} from "lucide-react";
import { runRuntimeBenchmark } from "../../lib/tamperLab.js";
import styles from "./PitchDeckPage.module.scss";

const SLIDES = [
  {
    id: "opening", time: "00:00", label: "OPENING", score: "첫 35초",
    note: "AI가 경험을 대신 서술하는 시대입니다. Trekkey는 문장이 아니라 그 문장 뒤의 사실을 검증합니다.",
    cue: "‘경험을 주장하는 방식에서 검증하는 방식으로 바꿉니다.’"
  },
  {
    id: "problem", time: "00:35", label: "PROBLEM", score: "문제·필요성 15",
    note: "학생은 같은 경험을 반복해서 증명하고, 기업은 자기서술을 다시 확인하며, 대학의 승인 기록은 학교 밖에서 검증하기 어렵습니다.",
    cue: "핵심은 경험 부족이 아니라 검증 가능한 경험 부족입니다."
  },
  {
    id: "thesis", time: "01:20", label: "SOLUTION", score: "창의성·혁신성 20",
    note: "블록체인이 현실의 사실을 만들지는 않습니다. 사실 판단은 대학이 하고, Trekkey는 승인 이후 내용과 효력이 바뀌지 않았는지 검증합니다.",
    cue: "대학 승인 → 최소 공개 → 누구나 검증의 세 층을 짚습니다."
  },
  {
    id: "architecture", time: "02:05", label: "ARCHITECTURE", score: "기술적 완성도 25",
    note: "대회 참가·작품·수상 확정이라는 기존 업무 이벤트가 Credential 발급 원천입니다. Canonical JSON, Merkle batch, EIP-712 승인, Kaia 앵커링, 공개 검증까지 이어집니다.",
    cue: "별도 수기 등록이 아니라 기존 대학 업무가 발급 트리거라는 점을 강조합니다."
  },
  {
    id: "privacy", time: "03:05", label: "PRIVACY", score: "혁신성 + 기술",
    note: "개인정보 원문은 기관 서버, 동의한 요약과 Proof는 공개 검증, 체인에는 Root·발급자·상태만 둡니다. Merkle Proof는 ZKP가 아니라 포함·무결성 증명입니다.",
    cue: "‘위변조 불가능’이 아니라 ‘한 글자 변조도 탐지’라고 말합니다."
  },
  {
    id: "usage", time: "04:00", label: "USER JOURNEY", score: "실용성 10",
    note: "대학 관리자는 기존 업무에서 승인하고, 학생은 활동과 증빙을 관리해 링크로 공유하며, 외부 검증자는 가입 없이 확인합니다. 세 화면을 실제로 열 수 있습니다.",
    cue: "기술이 아니라 각 사용자가 줄이는 일을 한 문장씩 말합니다."
  },
  {
    id: "services", time: "04:50", label: "IMPLEMENTED", score: "구현 범위 · 30초",
    note: "프로토콜 위에 대회관리, 외부증빙 2인 검수, 졸업 자가점검, 공개 검증이 작동합니다. 졸업 기능은 공식 판정이 아닌 자가점검입니다.",
    cue: "외부증빙의 온체인 Credential 자동 발급은 다음 연계 범위라고 경계를 밝힙니다."
  },
  {
    id: "demo", time: "05:20", label: "LIVE USAGE", score: "기술 + 시연 · 140초",
    note: "운영 데이터를 새로 발급하거나 변경하지 않습니다. 학생 증빙, 관리자 2인 검수, 졸업 자가점검을 먼저 보여주고, 별도 ANCHORED 대회 Credential로 공개 검증과 변조 탐지를 보여줍니다.",
    cue: "탭 순서: 학생 외부 증빙 → 관리자 검수 → 졸업 자가점검 → 공개 검증 → Tamper Lab."
  },
  {
    id: "evidence", time: "07:40", label: "EVIDENCE", score: "성능·결과 검증 20",
    note: "1,000개 수치는 전체 TPS가 아니라 이 브라우저의 hash·Merkle Tree·Proof 생성 및 검증 시간입니다. 네트워크·DB·체인 확정은 제외됩니다.",
    cue: "화면에 방금 측정된 시간과 PASS가 뜬 것을 읽고, CSV 재현 화면을 엽니다."
  },
  {
    id: "closing", time: "09:00", label: "CLOSING", score: "전체 회수 · 60초",
    note: "대학은 반복 확인 비용을 줄이고, 개인은 승인된 경험을 재사용하며, 외부 검증자는 로그인 없이 확인합니다. Trekkey는 경험 기록 앱이 아니라 신뢰 인프라입니다.",
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

const SERVICES = [
  [Workflow, "대회 운영", "신청·제출·심사·수상 확정이 Credential 발급 원천", "Credential 연계"],
  [FileCheck2, "외부 증빙", "PDF·이미지 제출과 서로 다른 관리자 2인의 L2 검수", "2인 승인"],
  [GraduationCap, "졸업 자가점검", "성적표·비교과 자료를 정책 기준일의 공식 근거와 비교", "자가점검"],
  [ShieldCheck, "외부 공개 검증", "계정·지갑 없이 기관·내용·현재 효력·Proof 확인", "로그인 불필요"]
];

const USER_JOURNEYS = [
  {
    icon: GraduationCap,
    actor: "대학 관리자",
    outcome: "기존 업무가 발급·검수 근거가 됩니다",
    steps: ["대회 결과 확정", "외부 증빙 2인 검수", "대회 Credential 앵커링"],
    path: "/credentials",
    linkLabel: "관리자 원장"
  },
  {
    icon: UserCheck,
    actor: "학생",
    outcome: "승인된 경험을 계속 재사용합니다",
    steps: ["활동·증빙 관리", "공개 링크·QR 공유", "졸업요건 자가점검"],
    path: "/participant/activity",
    linkLabel: "학생 활동"
  },
  {
    icon: BriefcaseBusiness,
    actor: "기업·외부 기관",
    outcome: "가입 없이 즉시 검증합니다",
    steps: ["링크·QR 열기", "기관·내용·효력 확인", "필요 시 Proof 재계산"],
    path: "/verify",
    linkLabel: "공개 검증"
  }
];

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PitchDeckPage() {
  const [searchParams] = useSearchParams();
  const [slide, setSlide] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [notesVisible, setNotesVisible] = useState(false);
  const [benchmark, setBenchmark] = useState({ status: "idle", result: null });
  const benchmarkStarted = useRef(false);
  const credentialId = searchParams.get("credential")?.trim() || "";
  const encodedCredentialId = encodeURIComponent(credentialId);
  const tamperPath = credentialId
    ? `/tamper-lab?mode=live&credential=${encodedCredentialId}`
    : "/tamper-lab";

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
  }, []);

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

      <main className={styles.stage}>
        <div className={styles.slideMeta}>
          <span>{SLIDES[slide].label}</span><strong>{SLIDES[slide].score}</strong><time>{SLIDES[slide].time}</time>
        </div>

        {slide === 0 && (
          <section className={`${styles.slide} ${styles.opening}`}>
            <div className={styles.eyebrow}><Sparkles size={15} /> HANSUNG ENGINEERING COMPETITION 2026</div>
            <h1>경험을 <em>말하지 말고,</em><br />증명하게 하자.</h1>
            <p className={styles.technicalTitle}>Merkle Proof 기반 개인정보 보호형<br />대학 활동 Credential 발급·검증 플랫폼</p>
            <div className={styles.openingFooter}><span>TREKKEY</span><i /><p>대학의 승인에서 외부 검증까지 이어지는 신뢰 인프라</p></div>
          </section>
        )}

        {slide === 1 && (
          <section className={`${styles.slide} ${styles.problem}`}>
            <div className={styles.eyebrow}><BrainCircuit size={15} /> PROBLEM DEFINITION</div>
            <h2>AI 시대, <em>잘 쓴 경험</em>과<br /><em>실제로 한 경험</em>의 경계가 사라졌습니다.</h2>
            <div className={styles.problemGrid}>
              <article><GraduationCap size={28} /><small>개인</small><strong>경험은 많지만<br />신뢰받기 어렵다</strong><p>자기소개서만으로 활동의 주체·시점·성과를 증명하기 어렵습니다.</p></article>
              <div className={styles.gap}><span>TRUST</span><i /><b>GAP</b></div>
              <article><BriefcaseBusiness size={28} /><small>기업·기관</small><strong>지원자는 많지만<br />검증 비용이 커진다</strong><p>자격과 활동을 문서·전화·사이트로 다시 확인해야 합니다.</p></article>
            </div>
            <blockquote>취업난과 구인난이 동시에 존재하는 이유 중 하나는<br /><strong>경험의 부족이 아니라, 검증 가능한 경험의 부족</strong>입니다.</blockquote>
          </section>
        )}

        {slide === 2 && (
          <section className={`${styles.slide} ${styles.thesis}`}>
            <div className={styles.eyebrow}><Network size={15} /> OUR THESIS</div>
            <h2>블록체인이 사실을 만드는 것이 아니라,<br /><em>대학이 승인한 사실을 바꿀 수 없게</em> 만듭니다.</h2>
            <div className={styles.layerFlow}>
              <article><span>01</span><GraduationCap size={26} /><small>UNIVERSITY</small><strong>사실 승인</strong><p>참가·작품·수상·외부 증빙을 담당자가 확정</p></article>
              <ChevronRight size={24} />
              <article><span>02</span><LockKeyhole size={26} /><small>PROTOCOL</small><strong>최소 공개</strong><p>원문 대신 hash·Merkle Proof·상태만 검증 가능</p></article>
              <ChevronRight size={24} />
              <article><span>03</span><ShieldCheck size={26} /><small>PUBLIC SERVICE</small><strong>즉시 검증</strong><p>누구나 QR 하나로 기관·내용·변조 여부를 확인</p></article>
            </div>
            <div className={styles.kick}><ShieldCheck size={20} /><strong>판단의 주체</strong><span>대학</span><i /><strong>무결성의 근거</strong><span>Merkle Proof + Kaia</span></div>
          </section>
        )}

        {slide === 3 && (
          <section className={`${styles.slide} ${styles.architecture}`}>
            <div className={styles.eyebrow}><Workflow size={15} /> END-TO-END ARCHITECTURE</div>
            <h2>기존 대학 업무의 <em>확정 이벤트</em>가<br />곧 Credential의 발급 원천입니다.</h2>
            <div className={styles.pipeline}>
              {PIPELINE.map(([Icon, title, body], index) => (
                <React.Fragment key={title}>{index > 0 && <ChevronRight className={styles.pipelineArrow} size={18} />}<article><span>0{index + 1}</span><Icon size={22} /><strong>{title}</strong><p>{body}</p></article></React.Fragment>
              ))}
            </div>
            <div className={styles.runtimeSplit}>
              <article><Server size={18} /><div><small>SPRING + MYSQL</small><strong>업무·원문·승인·Outbox</strong></div></article>
              <article><Fingerprint size={18} /><div><small>REACT BROWSER</small><strong>공개 leaf·Proof 재계산</strong></div></article>
              <article><Layers3 size={18} /><div><small>KAIA KAIROS</small><strong>Root·발급자·현재 상태</strong></div></article>
            </div>
            <p className={styles.scopeLine}>Java · JavaScript · Solidity가 같은 fixture로 leaf와 Root를 교차 재현합니다.</p>
          </section>
        )}

        {slide === 4 && (
          <section className={`${styles.slide} ${styles.privacy}`}>
            <div className={styles.eyebrow}><LockKeyhole size={15} /> PRIVACY BY PLACEMENT</div>
            <h2>개인정보를 체인에 올리지 않고도<br /><em>한 글자 변조를 탐지</em>합니다.</h2>
            <div className={styles.privacyZones}>
              <article><Database size={24} /><span>PRIVATE</span><strong>기관 서버</strong><p>학번·이메일·증빙 원문<br />업무상 접근 권한으로 보호</p></article>
              <article><BadgeCheck size={24} /><span>CONSENTED PUBLIC</span><strong>검증 화면</strong><p>동의된 이름·활동 요약<br />Credential payload·Proof</p></article>
              <article><Layers3 size={24} /><span>ON-CHAIN</span><strong>Kaia</strong><p>Merkle Root·발급자·상태<br />개인정보 원문 없음</p></article>
            </div>
            <div className={styles.proofFormula}>
              <div><small>공개 CLAIMS</small><strong>H(canonical JSON)</strong></div><ChevronRight size={19} />
              <div><small>TREKKEY V1 LEAF</small><strong>6 × bytes32</strong></div><ChevronRight size={19} />
              <div><small>MERKLE PROOF</small><strong>siblings 접기</strong></div><ChevronRight size={19} />
              <div className={styles.formulaPass}><small>ANCHORED ROOT</small><strong><Check size={15} /> 일치</strong></div>
            </div>
            <div className={styles.precisionNote}><CircleAlert size={18} /><p><strong>Merkle Proof는 ZKP가 아닙니다.</strong> 공개된 내용의 포함 여부와 무결성을 최소한의 sibling hash로 증명합니다.</p></div>
          </section>
        )}

        {slide === 5 && (
          <section className={`${styles.slide} ${styles.usage}`}>
            <div className={styles.eyebrow}><UserCheck size={15} /> WHO USES TREKKEY</div>
            <h2>한 번의 대학 승인으로<br /><em>세 사용자의 일을 줄입니다.</em></h2>
            <div className={styles.journeyGrid}>
              {USER_JOURNEYS.map(({ icon: Icon, actor, outcome, steps, path, linkLabel }) => (
                <article key={actor}>
                  <header><Icon size={23} /><span>{actor}</span></header>
                  <strong>{outcome}</strong>
                  <ol>{steps.map((step, index) => <li key={step}><b>0{index + 1}</b><span>{step}</span></li>)}</ol>
                  <Link target="_blank" rel="noreferrer" to={path}>{linkLabel} 열기 <ExternalLink size={13} /></Link>
                </article>
              ))}
            </div>
            <div className={styles.journeyOutcome}><Network size={19} /><strong>하나의 신뢰 구조</strong><span>대학은 승인·발급하고</span><i /><span>학생은 관리·공유하고</span><i /><span>외부 기관은 검증합니다</span></div>
          </section>
        )}

        {slide === 6 && (
          <section className={`${styles.slide} ${styles.services}`}>
            <div className={styles.eyebrow}><Activity size={15} /> PROTOCOL → PLATFORM → SERVICES</div>
            <h2>검증 프로토콜 위에<br /><em>실제로 쓰는 네 가지 서비스</em>가 작동합니다.</h2>
            <div className={styles.serviceGrid}>
              {SERVICES.map(([Icon, title, body, badge]) => <article key={title}><div><Icon size={23} /><em>IMPLEMENTED</em></div><strong>{title}</strong><p>{body}</p><span>{badge}</span></article>)}
            </div>
            <div className={styles.serviceBoundary}><GraduationCap size={19} /><p><strong>졸업 기능은 공식 졸업 판정이 아닌 자가점검입니다.</strong> 외부 증빙 2인 승인 결과는 현재 졸업 기록에 반영되며, 온체인 Credential 자동 발급은 다음 연계 범위입니다.</p></div>
          </section>
        )}

        {slide === 7 && (
          <section className={`${styles.slide} ${styles.demo}`}>
            <div className={styles.eyebrow}><Presentation size={15} /> 140-SECOND LIVE USAGE</div>
            <h2>학생의 제출부터 외부 검증까지,<br /><em>실제로 사용해 보겠습니다.</em></h2>
            <div className={styles.demoTimeline}>
              <article><time>00–20s</time><span>01</span><FileCheck2 size={23} /><strong>학생 증빙</strong><p>2/2 검수 완료 상태 확인</p></article>
              <article><time>20–42s</time><span>02</span><UserCheck size={23} /><strong>관리자 검수</strong><p>완료 건의 2인 승인 이력</p></article>
              <article><time>42–72s</time><span>03</span><GraduationCap size={23} /><strong>졸업 자가점검</strong><p>충족·부족·확인 필요</p></article>
              <article><time>72–105s</time><span>04</span><Link2 size={23} /><strong>공개 검증</strong><p>별도 ANCHORED 기록 확인</p></article>
              <article><time>105–135s</time><span>05</span><Fingerprint size={23} /><strong>Proof·변조</strong><p>leaf → Root, 한 글자 변경</p></article>
            </div>
            <div className={styles.demoActions}>
              <Link target="_blank" rel="noreferrer" to="/participant/evidence"><FileCheck2 size={17} /> 학생 외부 증빙 <ExternalLink size={14} /></Link>
              <Link target="_blank" rel="noreferrer" to="/evidence"><UserCheck size={17} /> 관리자 검수 <ExternalLink size={14} /></Link>
              <Link target="_blank" rel="noreferrer" to="/participant/graduation"><GraduationCap size={17} /> 졸업 자가점검 <ExternalLink size={14} /></Link>
              {credentialId && <Link target="_blank" rel="noreferrer" to={`/verify/${encodedCredentialId}`}><ShieldCheck size={17} /> 공개 검증 <ExternalLink size={14} /></Link>}
              <Link target="_blank" rel="noreferrer" to={tamperPath}><Fingerprint size={17} /> Tamper Lab <ExternalLink size={14} /></Link>
            </div>
            <div className={styles.credentialReady} data-ready={Boolean(credentialId) || undefined}>
              <span>{credentialId ? "LIVE CREDENTIAL CONNECTED" : "PREFLIGHT"}</span>
              <strong>{credentialId || "발표 전 ANCHORED Credential을 ?credential={publicId}로 연결하세요."}</strong>
            </div>
            <p className={styles.demoCaveat}><strong>정확한 구현 경계</strong> 증빙 2인 검수→졸업 자가점검은 대학 업무 경로이며, 공개 Proof는 별도로 발급·앵커링된 대회 Credential입니다. 두 경로의 자동 발급 연계는 다음 범위입니다. 브라우저는 공개 Proof를 재계산하고 Kaia 상태는 서버 조회와 Explorer로 교차 확인합니다.</p>
          </section>
        )}

        {slide === 8 && (
          <section className={`${styles.slide} ${styles.evidence}`}>
            <div className={styles.eyebrow}><BarChart3 size={15} /> REPRODUCIBLE EVIDENCE</div>
            <h2>구현했다고 말하는 대신,<br /><em>지금 이 브라우저에서 다시 측정</em>합니다.</h2>
            <div className={styles.metricGrid}>
              <article className={styles.liveMetric}>
                <small>LIVE · 1,000 CREDENTIAL BATCH</small>
                {benchmark.status === "running" && <><Gauge className={styles.pulse} size={34} /><strong>측정 중…</strong></>}
                {benchmark.status === "complete" && <><Check size={34} /><strong>{benchmark.result.durationMs.toFixed(2)} ms</strong><span>{benchmark.result.proofMatches ? "PROOF PASS" : "CHECK REQUIRED"}</span></>}
                {benchmark.status === "error" && <><CircleAlert size={34} /><strong>측정 재시도</strong><span>브라우저 계산 오류</span></>}
                {benchmark.status === "idle" && <><Gauge size={34} /><strong>준비 중</strong></>}
              </article>
              <article><small>BACKEND</small><strong>629-case suite</strong><span>604 PASS · MySQL-only 25 SKIP</span></article>
              <article><small>SMART CONTRACT</small><strong>12 PASS</strong><span>Root·서명·권한·상태 전이</span></article>
              <article><small>FRONTEND</small><strong>19 PASS</strong><span>해시 fixture·API·Proof 재현</span></article>
            </div>
            <div className={styles.evidenceActions}>
              <button type="button" onClick={rerunBenchmark} disabled={benchmark.status === "running"}><TimerReset size={16} /> 다시 측정</button>
              <Link target="_blank" rel="noreferrer" to="/evidence-report"><BarChart3 size={16} /> 원시 결과·CSV 열기 <ExternalLink size={13} /></Link>
            </div>
            <p className={styles.measureScope}><Gauge size={17} /><strong>측정 범위</strong> SHA-256 · leaf · Merkle Tree · 중앙 Proof 생성·검증. 네트워크·DB·체인 확정 시간은 포함하지 않습니다.</p>
          </section>
        )}

        {slide === 9 && (
          <section className={`${styles.slide} ${styles.closing}`}>
            <div className={styles.eyebrow}><ShieldCheck size={15} /> VERIFIED EXPERIENCE INFRASTRUCTURE</div>
            <h2>경험을 주장하는 시대에서,<br /><em>경험을 증명하는 시대로.</em></h2>
            <div className={styles.outcomes}>
              <article><GraduationCap size={23} /><small>대학</small><strong>승인과 발급을 한 흐름으로</strong><p>기존 업무 확정이 검증 가능한 기록이 됩니다.</p></article>
              <article><UserCheck size={23} /><small>개인</small><strong>한 번 승인받고 계속 재사용</strong><p>필요한 정보만 링크와 QR로 제시합니다.</p></article>
              <article><BriefcaseBusiness size={23} /><small>기업·기관</small><strong>로그인 없이 즉시 검증</strong><p>전화·문서 확인 비용을 공개 Proof로 줄입니다.</p></article>
            </div>
            <div className={styles.roadmapStrip}><span>NOW</span><strong>발급 · Merkle 앵커링 · 공개 검증 · 증빙 2인 검수 · 졸업 자가점검</strong><i /><span>NEXT</span><p>외부증빙 Credential 자동 연계 · 공식 학사데이터 연동 · 취소·정정 운영 UX 고도화</p></div>
            <blockquote>“Trekkey는 경험을 기록하는 서비스가 아니라,<br /><strong>그 경험이 사실임을 개인정보 원문 노출 없이 증명하는 기반</strong>입니다.”</blockquote>
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
