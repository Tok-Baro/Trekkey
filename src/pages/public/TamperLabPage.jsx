import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Database,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  Gauge,
  GitCompareArrows,
  KeyRound,
  Layers3,
  LockKeyhole,
  Play,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
  Zap
} from "lucide-react";
import { AppFooter } from "../../components/common/AppFooter.jsx";
import {
  ANCHOR_BATCH_GAS_SAMPLE,
  TAMPER_SCENARIOS,
  createTamperLabFixture,
  evaluateTamperScenario,
  runRuntimeBenchmark,
  shortenHash
} from "../../lib/tamperLab.js";
import styles from "./TamperLabPage.module.scss";

const STATUS_PRESENTATION = {
  VALID: { label: "검증 완료", tone: "success", icon: CheckCircle2 },
  TAMPERED: { label: "변조 감지", tone: "danger", icon: CircleAlert },
  REVOKED: { label: "발급 취소", tone: "danger", icon: Ban },
  SUPERSEDED: { label: "정정 발급", tone: "warning", icon: GitCompareArrows }
};

const TRUST_FLOW = [
  {
    icon: UserCheck,
    label: "대학 담당자",
    title: "현실의 사실 승인",
    body: "참가·작품·수상 근거를 확인하고 발급 여부를 결정합니다.",
    boundary: "사실 판단 책임"
  },
  {
    icon: Server,
    label: "Trekkey Platform",
    title: "Credential 표준화",
    body: "승인된 기록을 정규화하고 해시·기관 서명·Merkle Proof를 생성합니다.",
    boundary: "발급·검증 책임"
  },
  {
    icon: Layers3,
    label: "Kaia 공개 원장",
    title: "변조·상태 이력 고정",
    body: "개인 원문 대신 배치 Root와 취소·정정 상태만 기록합니다.",
    boundary: "공개 대조 기준"
  },
  {
    icon: BadgeCheck,
    label: "외부 검증자",
    title: "현재 효력 확인",
    body: "QR만으로 기관, 내용 일치, 공개 기록, 최신 상태를 확인합니다.",
    boundary: "최종 사용 판단"
  }
];

const PRIVACY_ROWS = [
  {
    place: "기관 서버",
    icon: Database,
    items: "학번·이메일·원문·증빙 파일",
    reason: "업무 처리와 승인 근거",
    tone: "private"
  },
  {
    place: "공개 검증",
    icon: FileCheck2,
    items: "동의된 이름·학교·활동 요약·Proof",
    reason: "채용담당자 등 외부 확인",
    tone: "consented"
  },
  {
    place: "블록체인",
    icon: Layers3,
    items: "Merkle Root·발급자·취소·정정 상태",
    reason: "독립된 변조 대조 기준",
    tone: "public"
  }
];

const DEMO_STEPS = [
  ["00:00", "문제", "AI가 만든 서술과 기관이 승인한 사실을 구분합니다."],
  ["00:35", "정상 검증", "원문→해시→Proof→Root가 일치하는 과정을 실행합니다."],
  ["01:35", "변조 실험", "‘대상’을 ‘최우수상’으로 바꿔 즉시 실패를 확인합니다."],
  ["02:35", "상태 이력", "발급 취소와 정정 발급이 무결성과 다른 축임을 보여줍니다."],
  ["03:35", "개인정보", "원문·공개 요약·온체인 데이터의 저장 위치를 구분합니다."],
  ["04:20", "정량 검증", "배치 크기별 실행 시간과 gas 분담 효과를 설명합니다."]
];

function hashParts(expected, calculated) {
  let firstDifference = -1;
  const length = Math.max(expected?.length ?? 0, calculated?.length ?? 0);
  for (let index = 0; index < length; index += 1) {
    if (expected?.[index] !== calculated?.[index]) {
      firstDifference = index;
      break;
    }
  }
  return firstDifference;
}

function HashComparison({ label, expected, calculated, passed }) {
  const firstDifference = hashParts(expected, calculated);
  return (
    <article className={`${styles.hashCard} ${passed ? styles.hashPassed : styles.hashFailed}`}>
      <div className={styles.hashHead}>
        <div>
          <span>{label}</span>
          <strong>{passed ? "일치" : `불일치 · 해시 ${firstDifference + 1}번째 문자부터 변경`}</strong>
        </div>
        {passed ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
      </div>
      <dl>
        <div>
          <dt>기록값</dt>
          <dd title={expected}>{shortenHash(expected, 18, 12)}</dd>
        </div>
        <div>
          <dt>계산값</dt>
          <dd title={calculated}>{shortenHash(calculated, 18, 12)}</dd>
        </div>
      </dl>
    </article>
  );
}

function ScenarioResult({ result }) {
  if (!result) {
    return <div className={styles.resultLoading}><RefreshCw size={20} /> 검증 계산 중</div>;
  }
  const presentation = STATUS_PRESENTATION[result.verificationStatus] ?? STATUS_PRESENTATION.TAMPERED;
  const StatusIcon = presentation.icon;
  const scenario = TAMPER_SCENARIOS.find((item) => item.id === result.scenarioId);

  return (
    <div className={`${styles.resultPanel} ${styles[presentation.tone]}`}>
      <div className={styles.resultTitle}>
        <span className={styles.resultIcon}><StatusIcon size={26} aria-hidden="true" /></span>
        <div>
          <small>{presentation.label}</small>
          <h2>{scenario?.headline}</h2>
          <p>{scenario?.description}</p>
        </div>
      </div>
      <div className={styles.checkGrid}>
        {result.checks.map((check) => (
          <div className={check.passed ? styles.checkPassed : styles.checkFailed} key={check.id}>
            {check.passed ? <Check size={16} /> : <X size={16} />}
            <span>{check.label}</span>
          </div>
        ))}
      </div>
      {result.replacementCredentialPublicId && (
        <div className={styles.replacementNotice}>
          <GitCompareArrows size={18} />
          <span>최신 Credential</span>
          <code>{result.replacementCredentialPublicId}</code>
        </div>
      )}
    </div>
  );
}

function BenchmarkTable({ results }) {
  if (!results?.length) {
    return (
      <div className={styles.benchmarkEmpty}>
        <Gauge size={24} aria-hidden="true" />
        <strong>이 브라우저에서 직접 측정합니다</strong>
        <p>1·10·100·500개 Credential의 SHA-256, leaf, Merkle Tree와 Proof를 실제 계산합니다.</p>
      </div>
    );
  }

  const maxDuration = Math.max(...results.map((item) => item.durationMs), 1);
  return (
    <div className={styles.benchmarkTableWrap}>
      <table className={styles.benchmarkTable}>
        <thead>
          <tr>
            <th>배치</th>
            <th>브라우저 계산</th>
            <th>Proof 깊이</th>
            <th>Credential당 gas</th>
            <th>분담 절감률</th>
          </tr>
        </thead>
        <tbody>
          {results.map((item) => (
            <tr key={item.size}>
              <td><strong>{item.size.toLocaleString("ko-KR")}개</strong></td>
              <td>
                <div className={styles.timeCell}>
                  <span style={{ width: `${Math.max(6, (item.durationMs / maxDuration) * 100)}%` }} />
                  <b>{item.durationMs.toFixed(2)} ms</b>
                </div>
              </td>
              <td>{item.proofDepth}단계 {item.proofMatches && <Check size={14} />}</td>
              <td>{Math.round(item.gasPerCredential).toLocaleString("ko-KR")}</td>
              <td>{item.amortizedReductionPercent.toFixed(item.size > 100 ? 1 : 0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TamperLabPage() {
  const [fixture, setFixture] = useState(null);
  const [scenarioId, setScenarioId] = useState("VALID");
  const [changedPrize, setChangedPrize] = useState("최우수상");
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [benchmarkResults, setBenchmarkResults] = useState(null);
  const [benchmarking, setBenchmarking] = useState(false);

  useEffect(() => {
    let alive = true;
    createTamperLabFixture()
      .then((nextFixture) => {
        if (alive) {
          setFixture(nextFixture);
          setLoadError("");
        }
      })
      .catch(() => {
        if (alive) {
          setLoadError("브라우저 암호화 모듈을 준비하지 못했습니다.");
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!fixture) {
      return undefined;
    }
    let alive = true;
    setResult(null);
    evaluateTamperScenario(fixture, scenarioId, changedPrize)
      .then((nextResult) => {
        if (alive) {
          setResult(nextResult);
        }
      })
      .catch(() => {
        if (alive) {
          setLoadError("Credential 재검증 계산에 실패했습니다.");
        }
      });
    return () => {
      alive = false;
    };
  }, [fixture, scenarioId, changedPrize]);

  const selectedScenario = useMemo(
    () => TAMPER_SCENARIOS.find((scenario) => scenario.id === scenarioId),
    [scenarioId]
  );

  const runBenchmark = async () => {
    setBenchmarking(true);
    try {
      setBenchmarkResults(await runRuntimeBenchmark());
    } finally {
      setBenchmarking(false);
    }
  };

  const resetLab = () => {
    setScenarioId("VALID");
    setChangedPrize("최우수상");
    setBenchmarkResults(null);
  };

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} to="/">
          <span><Layers3 size={18} aria-hidden="true" /></span>
          <strong>Trekkey</strong>
        </Link>
        <nav aria-label="기술 검증 페이지 이동">
          <Link to="/verify"><BadgeCheck size={16} /> 실제 증명서 확인</Link>
          <button type="button" onClick={resetLab}><RotateCcw size={16} /> 초기화</button>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroGrid} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}><Sparkles size={15} /> Live Cryptographic Demo</span>
              <h1>한 글자만 바꿔도<br /><em>증거는 거짓말하지 않습니다.</em></h1>
              <p>
                정해진 답을 보여주는 영상이 아닙니다. 이 브라우저가 Credential 원문을 다시 정규화하고
                SHA-256, Trekkey V1 leaf, Merkle Proof를 실제 계산합니다.
              </p>
              <div className={styles.heroFacts}>
                <span><ShieldCheck size={16} /> 실제 암호 계산</span>
                <span><LockKeyhole size={16} /> 개인정보 원문 온체인 미저장</span>
                <span><Zap size={16} /> 지갑 없는 공개 검증</span>
              </div>
            </div>
            <div className={styles.heroQuestion}>
              <span>문제 정의</span>
              <blockquote>“AI가 작성한 경험과<br />기관이 승인한 사실을 어떻게 구분할 것인가?”</blockquote>
              <p>블록체인이 사실을 만드는 것이 아니라, 기관이 승인한 기록의 변조와 현재 효력을 검증합니다.</p>
            </div>
          </div>
        </section>

        <section className={styles.labSection} id="live-lab">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.kicker}>01 · Tamper Lab</span>
                <h2>정상·변조·취소·정정을 같은 증거로 비교</h2>
                <p>암호학적 무결성과 행정적 현재 효력을 별도 축으로 판정합니다.</p>
              </div>
              <span className={styles.fixtureBadge}><Activity size={16} /> 결정적 DEMO fixture · 실제 개인정보 아님</span>
            </div>

            <div className={styles.scenarioTabs} role="tablist" aria-label="Credential 검증 시나리오">
              {TAMPER_SCENARIOS.map((scenario) => (
                <button
                  className={scenario.id === scenarioId ? styles.scenarioActive : ""}
                  key={scenario.id}
                  type="button"
                  role="tab"
                  aria-selected={scenario.id === scenarioId}
                  onClick={() => setScenarioId(scenario.id)}
                >
                  <span>{scenario.label}</span>
                  <small>{scenario.id === "VALID" ? "원문 일치" : scenario.id === "TAMPERED" ? "내용 변경" : scenario.id === "REVOKED" ? "효력 없음" : "새 기록 존재"}</small>
                </button>
              ))}
            </div>

            {loadError && <div className={styles.errorBanner}><CircleAlert size={18} /> {loadError}</div>}

            <div className={styles.labGrid}>
              <article className={styles.credentialCard}>
                <div className={styles.credentialHead}>
                  <div>
                    <small>DEMO AWARD CREDENTIAL</small>
                    <strong>{fixture?.targetCredential.credentialNo ?? "준비 중"}</strong>
                  </div>
                  <Fingerprint size={28} aria-hidden="true" />
                </div>
                <dl className={styles.credentialDetails}>
                  <div><dt>발급기관</dt><dd>한성대학교</dd></div>
                  <div><dt>활동</dt><dd>2026 공학경진대회</dd></div>
                  <div><dt>팀</dt><dd>Trekkey</dd></div>
                  <div>
                    <dt>수상 결과</dt>
                    <dd>
                      {scenarioId === "TAMPERED" ? (
                        <input
                          aria-label="변조할 수상 결과"
                          maxLength={20}
                          value={changedPrize}
                          onChange={(event) => setChangedPrize(event.target.value)}
                        />
                      ) : (
                        result?.candidatePrize ?? "대상"
                      )}
                    </dd>
                  </div>
                </dl>
                <div className={styles.credentialFoot}>
                  <KeyRound size={16} />
                  <span>기관 승인 fixture</span>
                  <code>{shortenHash(fixture?.batch.root, 12, 8)}</code>
                </div>
                {scenarioId === "TAMPERED" && (
                  <p className={styles.editHint}>입력값을 바꾸는 즉시 원문부터 Root까지 다시 계산합니다.</p>
                )}
              </article>

              <ScenarioResult result={result} />
            </div>

            <div className={styles.hashGrid}>
              <HashComparison
                label="Credential contentHash"
                expected={result?.expectedContentHash}
                calculated={result?.calculatedContentHash}
                passed={Boolean(result?.contentMatches)}
              />
              <HashComparison
                label="Trekkey V1 leafHash"
                expected={result?.expectedLeafHash}
                calculated={result?.calculatedLeafHash}
                passed={Boolean(result?.contentMatches)}
              />
              <HashComparison
                label="Merkle Proof 계산 Root"
                expected={result?.expectedRoot}
                calculated={result?.calculatedRoot}
                passed={Boolean(result?.merkleProofMatches)}
              />
            </div>

            <details className={styles.canonicalDetails}>
              <summary><Fingerprint size={17} /> 계산에 사용한 canonical JSON 보기</summary>
              <pre>{result?.canonical ?? "계산 중"}</pre>
            </details>
          </div>
        </section>

        <section className={styles.trustSection}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.kicker}>02 · Trust Boundary</span>
                <h2>블록체인이 사실을 만드는 것이 아닙니다</h2>
                <p>현실의 승인, 기술적 발급, 공개 기록, 최종 판단의 책임을 분리합니다.</p>
              </div>
            </div>
            <div className={styles.trustFlow}>
              {TRUST_FLOW.map((item, index) => {
                const Icon = item.icon;
                return (
                  <React.Fragment key={item.label}>
                    {index > 0 && <ChevronRight className={styles.trustArrow} size={22} aria-hidden="true" />}
                    <article>
                      <span className={styles.trustIcon}><Icon size={20} /></span>
                      <small>{item.label}</small>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                      <b>{item.boundary}</b>
                    </article>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.privacySection}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.kicker}>03 · Privacy by Placement</span>
                <h2>모든 정보를 블록체인에 올리지 않습니다</h2>
                <p>업무에 필요한 원문, 동의된 공개 요약, 독립 대조용 Root를 목적별로 분리합니다.</p>
              </div>
            </div>
            <div className={styles.privacyGrid}>
              {PRIVACY_ROWS.map((row) => {
                const Icon = row.icon;
                return (
                  <article className={styles[row.tone]} key={row.place}>
                    <span><Icon size={20} /></span>
                    <h3>{row.place}</h3>
                    <strong>{row.items}</strong>
                    <p>{row.reason}</p>
                  </article>
                );
              })}
            </div>
            <div className={styles.claimBoundary}>
              <CircleAlert size={20} />
              <p><strong>정확한 주장 범위</strong> Merkle Proof는 배치 포함과 무결성을 증명하며 영지식증명은 아닙니다. 대학 담당자가 승인한 현실의 사실 자체는 대학이 책임집니다.</p>
            </div>
          </div>
        </section>

        <section className={styles.evidenceSection} id="benchmark">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.kicker}>04 · Measured Evidence</span>
                <h2>기능 수가 아니라 재현 가능한 결과로 증명</h2>
                <p>자동화 테스트, 컨트랙트 gas 표본, 현재 브라우저의 암호 계산 결과를 함께 제시합니다.</p>
              </div>
              <button className={styles.runButton} type="button" onClick={runBenchmark} disabled={benchmarking}>
                {benchmarking ? <RefreshCw className={styles.spin} size={17} /> : <Play size={17} />}
                {benchmarking ? "측정 중" : benchmarkResults ? "다시 측정" : "벤치마크 실행"}
              </button>
            </div>

            <div className={styles.evidenceStats}>
              <article><strong>629</strong><span>Java 서버 테스트</span><small>Java 21 전체 회귀</small></article>
              <article><strong>12</strong><span>Solidity 테스트</span><small>Merkle·서명·상태 전이</small></article>
              <article><strong>17</strong><span>프런트 테스트</span><small>동일 fixture 재현 포함</small></article>
              <article><strong>{ANCHOR_BATCH_GAS_SAMPLE.toLocaleString("ko-KR")}</strong><span>anchorBatch gas 표본</span><small>Hardhat 현재 평균</small></article>
            </div>

            <BenchmarkTable results={benchmarkResults} />
            <p className={styles.benchmarkNote}>
              브라우저 시간은 기기별로 달라집니다. gas 분담값은 현재 `anchorBatch` 평균 표본을 배치 크기로 나눈 비교이며 실제 네트워크 수수료를 뜻하지 않습니다.
            </p>
          </div>
        </section>

        <section className={styles.demoSection}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.kicker}>05 · Five-minute Story</span>
                <h2>심사위원이 따라오는 5분 시연 순서</h2>
              </div>
            </div>
            <ol className={styles.demoTimeline}>
              {DEMO_STEPS.map(([time, title, body]) => (
                <li key={time}>
                  <time>{time}</time>
                  <div><strong>{title}</strong><p>{body}</p></div>
                </li>
              ))}
            </ol>
            <div className={styles.finalCta}>
              <div>
                <small>Trekkey Protocol · Platform · Service</small>
                <h2>AI가 대신 쓴 경험이 아닌,<br />대학이 승인한 사실을 증명합니다.</h2>
              </div>
              <div>
                <Link to="/verify">실제 Credential 확인 <ExternalLink size={17} /></Link>
                <Link className={styles.secondaryCta} to="/"><ArrowLeft size={17} /> 서비스 홈</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AppFooter variant="public" />
    </div>
  );
}
