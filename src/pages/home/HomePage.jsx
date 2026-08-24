import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  Fingerprint,
  Gauge,
  GitCompareArrows,
  ImageOff,
  Layers3,
  LockKeyhole,
  ScrollText,
  ShieldCheck,
  Trophy,
  UserRoundCheck,
  Users
} from "lucide-react";
import { AppFooter } from "../../components/common/AppFooter.jsx";
import { getLoginPath } from "../../routeConfig.js";
import styles from "./HomePage.module.scss";

/* 01 — 운영: 위저드 대형 카드 + 보조 카드 2장(비대칭 스택) */
const WIZARD_STEPS = ["기본 정보", "접수·제출 기간", "심사 라운드", "공고 발행"];

const OPS_CARDS = [
  {
    icon: CalendarClock,
    title: "일정·기간 관리",
    body: "접수와 제출 마감을 한 화면에서 관리하고 상태를 자동으로 갱신합니다."
  },
  {
    icon: Users,
    title: "신청·팀 승인",
    body: "참가 신청을 검토하고 팀 구성과 보완요청을 빠르게 처리합니다."
  }
];

/* 02 — 심사: 가로 스텝 플로우 */
const JUDGE_STEPS = [
  {
    icon: FileCheck2,
    title: "제출물 접수",
    body: "제출 파일과 메타데이터를 정리하고 해시로 무결성을 확인합니다."
  },
  {
    icon: Gauge,
    title: "심사 배정",
    body: "라운드별로 심사위원을 배정하고 미완료 심사를 한눈에 추적합니다."
  },
  {
    icon: Trophy,
    title: "수상 확정",
    body: "집계 결과를 검토하고 수상자를 확정해 명단을 내보냅니다."
  }
];

/* 03 — 참가: 포털 목업 + 세로 타임라인 */
const PORTAL_TABS = ["둘러보기", "내 신청", "제출물", "결과"];

const PORTAL_ROWS = [
  { icon: ScrollText, title: "전공 역량 아이디어 공모전", meta: "접수 07.12까지", state: "신청 완료" },
  { icon: FileCheck2, title: "AI 리터러시와 미래역량", meta: "제출 07.09까지", state: "제출 대기" },
  { icon: Trophy, title: "진로설계 프로젝트", meta: "심사 종료", state: "수상" }
];

const JOIN_STEPS = [
  {
    icon: ScrollText,
    title: "대회 찾기·신청",
    body: "공개 공고를 둘러보고 팀 정보와 함께 참가 신청을 제출합니다."
  },
  {
    icon: UserRoundCheck,
    title: "제출·팀 관리",
    body: "내 신청 상태와 제출물, 팀 구성을 한 곳에서 관리합니다."
  },
  {
    icon: CheckCircle2,
    title: "결과·활동 이력",
    body: "심사 결과와 수상 내역, 활동 이력을 참가자 포털에서 확인합니다."
  }
];

/* 마퀴: 그룹 2개를 복제해 translateX(-50%)로 무한 루프.
   두 그룹 폭이 정확히 같아야 하므로 gap은 트랙이 아닌 그룹 내부에만 두고,
   그룹 끝 이음새 간격은 그룹의 padding-right로 맞춘다(HomePage.module.scss 참고). */
const MARQUEE_ITEMS = [
  "INSTITUTION APPROVED",
  "CANONICAL JSON",
  "MERKLE PROOF",
  "ISSUER SIGNATURE",
  "TAMPER DETECTION",
  "REVOCATION",
  "CORRECTION LINEAGE",
  "PRIVACY BY PLACEMENT"
];
/* 초광폭 화면에서도 트랙이 뷰포트보다 넓도록 그룹당 아이템을 2배로 채운다 */
const MARQUEE_GROUP = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

/* 심사 진행 링 — r=30 원둘레. 표시 숫자와 stroke-dashoffset을 같은 값에서 계산 */
const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function scrollBehavior() {
  return prefersReducedMotion() ? "auto" : "smooth";
}

/* 포스터 폴백용 이니셜 — 앞의 연도/기수 표기를 걷어내고 앞 두 글자 */
function contestInitials(title = "") {
  const cleaned = title.replace(/^[\d\s.\-–—()]+/, "").trim();
  return (cleaned || title).slice(0, 2) || "TK";
}

function useReveal() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    const targets = Array.from(root.querySelectorAll("[data-reveal]"));

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => el.classList.add(styles.in));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.in);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return rootRef;
}

function CountUpStat({ value, label }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return undefined;
    }

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return undefined;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          observer.unobserve(entry.target);
          const duration = 800;
          const start = performance.now();
          const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * value));
            if (progress < 1) {
              frame = requestAnimationFrame(step);
            }
          };
          frame = requestAnimationFrame(step);
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [value]);

  return (
    <div className={styles.statItem} ref={ref}>
      <b className={styles.statNum}>{display.toLocaleString("ko-KR")}</b>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

/* 레일 카드 — 상단 포스터 + 하단 텍스트. 포스터 로드 실패는 카드별 state로 폴백 처리 */
function RailCard({ contest, onOpen }) {
  const [posterFailed, setPosterFailed] = useState(false);
  const showPoster = Boolean(contest.posterUrl) && !posterFailed;

  return (
    <button className={styles.railCard} type="button" onClick={() => onOpen?.(contest.id)}>
      <span className={styles.railPoster}>
        {showPoster ? (
          <img
            className={styles.railPosterImg}
            src={contest.posterUrl}
            alt={`${contest.title} 포스터`}
            loading="lazy"
            onError={() => setPosterFailed(true)}
          />
        ) : (
          <span className={styles.railPosterFallback} aria-hidden="true">
            <ImageOff size={22} />
            <span className={styles.railPosterInitials}>{contestInitials(contest.title)}</span>
          </span>
        )}
        <span className={`${styles.miniBadge} ${styles.railBadge}`}>{contest.status}</span>
      </span>
      <span className={styles.railBody}>
        <strong className={styles.railTitle}>{contest.title}</strong>
        <span className={styles.railDept}>{contest.department}</span>
        <span className={styles.railSummary}>{contest.summary}</span>
        <span className={styles.railFoot}>
          <span>접수 {contest.applicationPeriod}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}

export function HomePage({ contests = [], onOpenContest }) {
  const navigate = useNavigate();
  const rootRef = useReveal();
  const [navSolid, setNavSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goToLogin = () => navigate(getLoginPath());
  const goToVerify = () => navigate("/verify");
  const goToTamperLab = () => navigate("/tamper-lab");
  const goToJudgeDemo = () => navigate("/demo");
  const goToTop = () => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  };
  const goToContests = () => {
    const target = document.getElementById("contests");
    if (target) {
      target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    }
  };

  const railContests = contests.filter((contest) => contest.status === "접수중").slice(0, 6);
  const previewContest = contests[0];

  const ringProgress = Math.max(0, Math.min(100, previewContest?.progress ?? 46));
  const ringOffset = RING_CIRCUMFERENCE * (1 - ringProgress / 100);

  const stats = [
    { value: 629, label: "서버 자동화 테스트" },
    { value: 12, label: "스마트컨트랙트 테스트" },
    { value: 18, label: "프런트 검증 테스트" }
  ];

  return (
    <div className={styles.page} ref={rootRef}>
      <header className={`${styles.nav} ${navSolid ? styles.navSolid : ""}`}>
        <div className={styles.navInner}>
          <button className={styles.brand} type="button" onClick={goToTop} aria-label="Trekkey 홈 맨 위로">
            <span className={styles.brandMark} aria-hidden="true">
              <Layers3 size={18} />
            </span>
            <span className={styles.brandName}>Trekkey</span>
          </button>
          <div className={styles.navActions}>
            <button className={styles.navLink} type="button" onClick={goToJudgeDemo}>
              <Gauge size={16} aria-hidden="true" /> 5분 심사 시연
            </button>
            <button className={styles.navLink} type="button" onClick={goToTamperLab}>
              <Fingerprint size={16} aria-hidden="true" /> Tamper Lab
            </button>
            <button className={styles.navLink} type="button" onClick={goToVerify}>
              <BadgeCheck size={16} aria-hidden="true" /> 증명서 확인
            </button>
            <button className={styles.navLink} type="button" onClick={goToContests}>
              대회 둘러보기
            </button>
            <button className={styles.btnSecondary} type="button" onClick={goToLogin}>
              로그인
            </button>
            <button className={styles.btnPrimary} type="button" onClick={goToLogin}>
              시작하기
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main} id="top">
        <section className={styles.hero}>
          <div className={styles.heroBg} aria-hidden="true">
            <span className={`${styles.orb} ${styles.orb1}`} />
            <span className={`${styles.orb} ${styles.orb2}`} />
            <span className={`${styles.orb} ${styles.orb3}`} />
          </div>
          <div className={styles.heroGrid} aria-hidden="true" />

          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className={`${styles.eyebrow} ${styles.heroEnter} ${styles.d0}`}>검증 가능한 대학 활동 Credential 플랫폼</span>
              <h1 className={styles.heroTitle}>
                <span className={`${styles.heroLine} ${styles.heroEnter} ${styles.d1}`}>AI가 대신 쓴 경험이 아닌,</span>
                <span className={`${styles.heroLine} ${styles.heroEnter} ${styles.d2}`}>
                  <span className={styles.accent}>대학이 승인한 사실을.</span>
                </span>
              </h1>
              <p className={`${styles.lead} ${styles.heroEnter} ${styles.d3}`}>
                대회 운영에서 생성된 활동 증거를 표준 Credential로 발급하고,
                <br />
                개인정보 원문을 공개하지 않고도 변조와 현재 효력을 검증합니다.
              </p>
              <div className={`${styles.heroCta} ${styles.heroEnter} ${styles.d4}`}>
                <button className={styles.btnPrimaryLg} type="button" onClick={goToJudgeDemo}>
                  5분 심사 시연 시작
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                <button className={styles.btnSecondaryLg} type="button" onClick={goToTamperLab}>
                  Tamper Lab 실행
                </button>
              </div>
            </div>

            <div className={`${styles.heroPreview} ${styles.heroEnter} ${styles.d5}`} aria-hidden="true">
              <div className={`${styles.floatCard} ${styles.floatContest}`}>
                <span className={styles.miniBadge}>접수중</span>
                <strong>{previewContest?.title ?? "전공 역량 비교과 공모전"}</strong>
                <span className={styles.floatMeta}>{previewContest?.department ?? "전공교육지원센터"}</span>
                <div className={styles.floatStats}>
                  <div>
                    <b>{previewContest?.teams ?? 31}</b>
                    <span>신청 팀</span>
                  </div>
                  <div>
                    <b>{previewContest?.submissions ?? 12}</b>
                    <span>제출물</span>
                  </div>
                </div>
              </div>

              <div className={`${styles.floatCard} ${styles.floatRing}`}>
                <svg viewBox="0 0 72 72" className={styles.ring} aria-hidden="true">
                  <circle className={styles.ringTrack} cx="36" cy="36" r={RING_RADIUS} />
                  <circle
                    className={styles.ringValue}
                    cx="36"
                    cy="36"
                    r={RING_RADIUS}
                    style={{ strokeDasharray: RING_CIRCUMFERENCE, strokeDashoffset: ringOffset }}
                  />
                </svg>
                <div className={styles.ringLabel}>
                  <b>{ringProgress}%</b>
                  <span>심사 진행</span>
                </div>
              </div>

              <div className={`${styles.floatCard} ${styles.floatStatus}`}>
                <span className={styles.statusDot} aria-hidden="true" />
                <div>
                  <strong>수상 확정 대기</strong>
                  <span>2건 검토 필요</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.marquee} aria-hidden="true">
            <div className={styles.marqueeTrack}>
              {[0, 1].map((clone) => (
                <div className={styles.marqueeGroup} key={clone}>
                  {MARQUEE_GROUP.map((item, index) => (
                    <React.Fragment key={`${clone}-${index}`}>
                      <span className={styles.marqueeItem}>{item}</span>
                      <span className={styles.marqueeDot}>·</span>
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.stats}>
          <div className={`${styles.statsInner} ${styles.reveal}`} data-reveal>
            {stats.map((stat) => (
              <CountUpStat key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </section>

        <section className={styles.proofIntro}>
          <div className={styles.container}>
            <div className={`${styles.proofIntroHead} ${styles.reveal}`} data-reveal>
              <span className={styles.eyebrow}>검증 가능한 경험</span>
              <h2>서술을 믿으라고 요구하지 않고,<br />증거를 직접 확인하게 합니다.</h2>
              <p>대학의 승인, 개인정보 최소 공개, 취소·정정 이력을 하나의 검증 흐름으로 연결합니다.</p>
            </div>
            <div className={`${styles.proofPillars} ${styles.reveal} ${styles.stagger}`} data-reveal>
              <article>
                <span><ShieldCheck size={20} /></span>
                <h3>기관 승인</h3>
                <p>누구나 입력한 경력이 아니라 담당자가 근거를 확인하고 승인한 활동입니다.</p>
              </article>
              <article>
                <span><LockKeyhole size={20} /></span>
                <h3>최소 공개 검증</h3>
                <p>학번·이메일·원문은 온체인에 올리지 않고 동의된 요약과 Proof만 공개합니다.</p>
              </article>
              <article>
                <span><GitCompareArrows size={20} /></span>
                <h3>정정 가능한 신뢰</h3>
                <p>발급 후에도 취소와 정정 계보를 확인해 현재 사용할 수 있는 기록을 찾습니다.</p>
              </article>
            </div>
            <button className={`${styles.proofCta} ${styles.reveal}`} data-reveal type="button" onClick={goToTamperLab}>
              한 글자 변조 실험 직접 실행
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* 01 — 운영 · 좌측 고정 텍스트 + 우측 비대칭 카드 스택 */}
        <section className={`${styles.feature} ${styles.featureOps}`}>
          <div className={styles.container}>
            <div className={styles.opsLayout}>
              <div className={`${styles.opsAside} ${styles.reveal}`} data-reveal>
                <span className={styles.eyebrow}>01 — 운영</span>
                <h2 className={styles.sectionTitle}>대회 생성부터 일정까지, 위저드로 한 번에</h2>
                <p className={styles.sectionLead}>
                  공고 정보와 평가 라운드를 단계별로 입력하면 공개 페이지와 신청 폼이 함께 준비됩니다.
                </p>
                <button className={styles.textLink} type="button" onClick={goToLogin}>
                  운영자로 시작하기
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>

              <div className={styles.opsStack}>
                <article className={`${styles.wizardCard} ${styles.reveal}`} data-reveal>
                  <div className={styles.wizardHead}>
                    <span className={styles.featureIcon} aria-hidden="true">
                      <ClipboardList size={20} />
                    </span>
                    <div className={styles.wizardHeadText}>
                      <h3>대회 생성 위저드</h3>
                      <p>기본 정보·기간·심사 라운드를 단계별로 구성해 공고를 발행합니다.</p>
                    </div>
                  </div>

                  <div className={styles.wizardMock} aria-hidden="true">
                    <ol className={styles.wizardSteps}>
                      {WIZARD_STEPS.map((step, index) => (
                        <li className={styles.wizardStep} key={step} style={{ "--i": index }}>
                          <span className={styles.wizardDot} />
                          <span className={styles.wizardLabel}>{step}</span>
                        </li>
                      ))}
                    </ol>
                    <div className={styles.wizardBar}>
                      <span className={styles.wizardBarFill} />
                    </div>
                  </div>
                </article>

                <div className={`${styles.opsCards} ${styles.reveal} ${styles.stagger}`} data-reveal>
                  {OPS_CARDS.map((card) => {
                    const Icon = card.icon;
                    return (
                      <article className={`${styles.featureCard} ${styles.opsCard}`} key={card.title}>
                        <span className={styles.featureIcon} aria-hidden="true">
                          <Icon size={20} />
                        </span>
                        <div>
                          <h3>{card.title}</h3>
                          <p>{card.body}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 02 — 심사 · 옅은 배경 + 가로 스텝 플로우(연결선 좌→우 드로잉) */}
        <section className={`${styles.feature} ${styles.featureJudge}`}>
          <div className={styles.container}>
            <div className={`${styles.featureHead} ${styles.featureHeadCenter} ${styles.reveal}`} data-reveal>
              <span className={styles.eyebrow}>02 — 심사</span>
              <h2 className={styles.sectionTitle}>제출물 접수부터 수상 확정까지 한 줄기로</h2>
              <p className={styles.sectionLead}>
                제출물을 라운드별로 모으고 심사위원을 배정해 점수와 진행률을 실시간으로 확인합니다.
              </p>
            </div>

            <div className={`${styles.flow} ${styles.reveal}`} data-reveal>
              {JUDGE_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.title}>
                    {index > 0 && (
                      <span className={styles.flowLink} style={{ "--i": index }} aria-hidden="true">
                        <span className={styles.flowLine} />
                        <ChevronRight className={styles.flowArrow} size={16} />
                      </span>
                    )}
                    <article className={styles.flowCard}>
                      <span className={styles.flowNum}>{String(index + 1).padStart(2, "0")}</span>
                      <span className={styles.featureIcon} aria-hidden="true">
                        <Icon size={20} />
                      </span>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </article>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </section>

        {/* 03 — 참가 · 좌우 반전(좌: 포털 목업 / 우: 텍스트 + 세로 타임라인) */}
        <section className={`${styles.feature} ${styles.featureJoin}`}>
          <div className={styles.container}>
            <div className={styles.joinLayout}>
              <div className={`${styles.joinVisual} ${styles.reveal}`} data-reveal>
                <div className={styles.portal} aria-hidden="true">
                  <div className={styles.portalBar}>
                    <span className={styles.portalDot} />
                    <span className={styles.portalDot} />
                    <span className={styles.portalDot} />
                    <span className={styles.portalBarTitle}>참가자 포털</span>
                  </div>
                  <div className={styles.portalTabs}>
                    {PORTAL_TABS.map((tab, index) => (
                      <span
                        className={`${styles.portalTab} ${index === 0 ? styles.portalTabActive : ""}`}
                        key={tab}
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                  <div className={styles.portalList}>
                    {PORTAL_ROWS.map((row, index) => {
                      const Icon = row.icon;
                      return (
                        <div className={styles.portalRow} key={row.title} style={{ "--i": index }}>
                          <span className={styles.portalRowIcon}>
                            <Icon size={16} />
                          </span>
                          <span className={styles.portalRowText}>
                            <b>{row.title}</b>
                            <span>{row.meta}</span>
                          </span>
                          <span className={styles.portalRowState}>{row.state}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className={styles.joinCopy}>
                <div className={styles.reveal} data-reveal>
                  <span className={styles.eyebrow}>03 — 참가</span>
                  <h2 className={styles.sectionTitle}>참가자는 하나의 포털에서 끝까지</h2>
                  <p className={styles.sectionLead}>
                    공개된 대회를 찾아 신청하고, 제출과 결과 확인까지 참가자 포털에서 이어집니다.
                  </p>
                </div>

                <ol className={`${styles.timeline} ${styles.reveal}`} data-reveal>
                  {JOIN_STEPS.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <li className={styles.timelineItem} key={step.title} style={{ "--i": index }}>
                        <span className={styles.timelineMark} aria-hidden="true">
                          <Icon size={16} />
                        </span>
                        <div className={styles.timelineText}>
                          <h3>{step.title}</h3>
                          <p>{step.body}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {railContests.length > 0 && (
          <section className={styles.railSection} id="contests">
            <div className={styles.container}>
              <div className={`${styles.railHead} ${styles.reveal}`} data-reveal>
                <div>
                  <span className={styles.eyebrow}>진행 중 대회</span>
                  <h2 className={styles.sectionTitle}>지금 접수 중인 대회</h2>
                </div>
                <p className={styles.sectionLead}>관심 있는 공고를 눌러 자세히 살펴보세요.</p>
              </div>
            </div>
            <div className={`${styles.rail} ${styles.reveal}`} data-reveal>
              <div className={styles.railTrack}>
                {railContests.map((contest) => (
                  <RailCard contest={contest} key={contest.id} onOpen={onOpenContest} />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className={styles.ctaSection}>
          <div className={styles.container}>
            <div className={`${styles.ctaBand} ${styles.reveal}`} data-reveal>
              <div className={styles.ctaBandBg} aria-hidden="true">
                <span className={`${styles.orb} ${styles.orbCta}`} />
              </div>
              <div className={styles.ctaGrid} aria-hidden="true" />
              <div className={styles.ctaCopy}>
                <h2>지금 트레키로 시작하세요</h2>
                <p>대회 운영과 참가 신청을 하나의 흐름으로. 로그인하고 바로 이어서 진행합니다.</p>
              </div>
              <button className={styles.btnOnDark} type="button" onClick={goToLogin}>
                시작하기
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
