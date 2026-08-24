import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Download,
  Fingerprint,
  Gauge,
  Layers3,
  Play,
  RefreshCw,
  ShieldCheck,
  TimerReset
} from "lucide-react";
import { AppFooter } from "../../components/common/AppFooter.jsx";
import { downloadCsv } from "../../lib/exportCsv.js";
import { ANCHOR_BATCH_GAS_SAMPLE, runRuntimeBenchmark } from "../../lib/tamperLab.js";
import styles from "./EvidenceReportPage.module.scss";

const BENCHMARK_SIZES = [1, 10, 100, 500, 1000];

function formatDateTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(value);
}

function runtimeLabel() {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Microsoft Edge";
  if (ua.includes("Chrome/")) return "Google Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  if (ua.includes("Firefox/")) return "Firefox";
  return "현재 브라우저";
}

export function EvidenceReportPage() {
  const [results, setResults] = useState([]);
  const [measuredAt, setMeasuredAt] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setRunning(true);
    setError("");
    try {
      const nextResults = await runRuntimeBenchmark(BENCHMARK_SIZES);
      setResults(nextResults);
      setMeasuredAt(new Date());
    } catch {
      setError("이 브라우저에서 암호 계산 벤치마크를 실행하지 못했습니다.");
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const summary = useMemo(() => {
    if (!results.length) return null;
    const largest = results.at(-1);
    return {
      largest,
      allProofsValid: results.every((item) => item.proofMatches)
    };
  }, [results]);

  const exportReport = () => {
    if (!results.length || !measuredAt) return;
    downloadCsv(`trekkey-benchmark-${measuredAt.toISOString().slice(0, 10)}.csv`, [
      ["Trekkey Credential Evidence Benchmark"],
      ["측정 시각", measuredAt.toISOString()],
      ["실행 환경", runtimeLabel()],
      ["논리 프로세서", navigator.hardwareConcurrency || "미제공"],
      ["anchorBatch gas 표본", ANCHOR_BATCH_GAS_SAMPLE],
      [],
      ["배치 크기", "총 계산 시간(ms)", "Credential당 시간(ms)", "Proof 깊이", "Proof 검증", "Credential당 gas 모델", "분담 절감률(%)"],
      ...results.map((item) => [
        item.size,
        item.durationMs.toFixed(4),
        item.perCredentialMs.toFixed(6),
        item.proofDepth,
        item.proofMatches ? "PASS" : "FAIL",
        item.gasPerCredential.toFixed(2),
        item.amortizedReductionPercent.toFixed(2)
      ])
    ]);
  };

  const maxDuration = Math.max(...results.map((item) => item.durationMs), 1);

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} to="/home"><Layers3 size={18} /><strong>Trekkey</strong></Link>
        <nav aria-label="정량 검증 메뉴">
          <Link to="/demo">5분 심사 시연</Link>
          <Link to="/tamper-lab">Tamper Lab</Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}><BarChart3 size={15} /> Reproducible Evidence</span>
            <h1>주장이 아니라,<br /><em>다시 실행할 수 있는 결과</em></h1>
            <p>현재 브라우저가 Credential 해시·Trekkey V1 leaf·Merkle Tree·Proof를 직접 만들고 검증합니다.</p>
            <div className={styles.heroActions}>
              <button type="button" onClick={run} disabled={running}>
                {running ? <RefreshCw className={styles.spin} size={17} /> : <Play size={17} />}
                {running ? "측정 중" : "다시 측정"}
              </button>
              <button className={styles.secondary} type="button" onClick={exportReport} disabled={!results.length}>
                <Download size={17} /> CSV 리포트
              </button>
            </div>
          </div>
          <dl className={styles.environmentCard}>
            <div><dt>측정 환경</dt><dd>{runtimeLabel()}</dd></div>
            <div><dt>논리 프로세서</dt><dd>{navigator.hardwareConcurrency || "-"}</dd></div>
            <div><dt>측정 시각</dt><dd>{measuredAt ? formatDateTime(measuredAt) : "준비 중"}</dd></div>
            <div><dt>개인정보</dt><dd>사용하지 않음</dd></div>
          </dl>
        </section>

        <section className={styles.container}>
          {error && <div className={styles.error} role="alert">{error}</div>}

          <div className={styles.metricGrid}>
            <article><strong>629</strong><span>Java 서버 테스트</span><small>발급·배치·검증 전체 회귀</small></article>
            <article><strong>12</strong><span>Solidity 테스트</span><small>Root·서명·권한·상태</small></article>
            <article><strong>18</strong><span>프런트 테스트</span><small>fixture·운영 Proof 교차 재현</small></article>
            <article><strong>{ANCHOR_BATCH_GAS_SAMPLE.toLocaleString("ko-KR")}</strong><span>anchorBatch gas 표본</span><small>Hardhat 실행 표본</small></article>
          </div>

          <section className={styles.chartPanel}>
            <div className={styles.sectionHead}>
              <div><span>LIVE BENCHMARK</span><h2>배치 크기별 브라우저 계산 시간</h2></div>
              {summary && <b><Check size={16} /> {summary.allProofsValid ? "모든 Proof 검증 성공" : "검증 실패 확인 필요"}</b>}
            </div>
            <div className={styles.chart} aria-label="배치 크기별 실행 시간 막대 그래프">
              {results.map((item) => (
                <div className={styles.barRow} key={item.size}>
                  <span>{item.size.toLocaleString("ko-KR")}개</span>
                  <div><i style={{ width: `${Math.max(2, (item.durationMs / maxDuration) * 100)}%` }} /></div>
                  <strong>{item.durationMs.toFixed(2)} ms</strong>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.tablePanel}>
            <div className={styles.sectionHead}>
              <div><span>RAW RESULTS</span><h2>재현 가능한 원시 결과</h2></div>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>배치</th><th>총 시간</th><th>개당 시간</th><th>Proof 깊이</th><th>Proof</th><th>개당 gas 모델</th><th>분담 절감</th></tr></thead>
                <tbody>
                  {results.map((item) => (
                    <tr key={item.size}>
                      <td><strong>{item.size.toLocaleString("ko-KR")}</strong></td>
                      <td>{item.durationMs.toFixed(2)} ms</td>
                      <td>{item.perCredentialMs.toFixed(4)} ms</td>
                      <td>{item.proofDepth}</td>
                      <td className={item.proofMatches ? styles.pass : styles.fail}>{item.proofMatches ? "PASS" : "FAIL"}</td>
                      <td>{Math.round(item.gasPerCredential).toLocaleString("ko-KR")}</td>
                      <td>{item.amortizedReductionPercent.toFixed(item.size > 100 ? 1 : 0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.interpretation}>
            <article><Gauge size={22} /><div><strong>측정 범위</strong><p>SHA-256, leaf 생성, Merkle Tree 구성, 중앙 Credential Proof 생성·검증 시간을 포함합니다.</p></div></article>
            <article><Layers3 size={22} /><div><strong>gas 모델의 의미</strong><p>한 번의 Root 앵커링 표본을 배치 크기로 나눈 분담값입니다. 실제 Kaia 수수료나 발급 단가를 보장하지 않습니다.</p></div></article>
            <article><Fingerprint size={22} /><div><strong>재현 조건</strong><p>브라우저·기기 부하에 따라 시간은 달라집니다. 같은 화면에서 다시 실행하고 CSV 원시값을 비교할 수 있습니다.</p></div></article>
          </section>

          {summary && (
            <section className={styles.conclusion}>
              <ShieldCheck size={28} />
              <div>
                <span>MEASURED CONCLUSION</span>
                <h2>{summary.largest.size.toLocaleString("ko-KR")}개 배치에서도 Proof 검증까지 {summary.largest.durationMs.toFixed(2)}ms</h2>
                <p>이 수치는 현재 브라우저에서 방금 계산한 값이며 네트워크 전송·DB 저장·체인 확정 시간은 포함하지 않습니다.</p>
              </div>
            </section>
          )}

          <div className={styles.bottomActions}>
            <Link to="/demo"><TimerReset size={17} /> 5분 심사 시연으로</Link>
            <Link className={styles.secondaryLink} to="/tamper-lab"><ArrowLeft size={17} /> Tamper Lab</Link>
          </div>
        </section>
      </main>
      <AppFooter variant="public" />
    </div>
  );
}
