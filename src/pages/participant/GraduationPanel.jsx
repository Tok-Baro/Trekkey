import React, { useState } from "react";
import { CircleAlert, CircleCheck, CircleHelp, ExternalLink, GraduationCap, RefreshCw } from "lucide-react";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { runGraduationEvaluation } from "../../api/graduationApi.js";
import styles from "./GraduationPanel.module.scss";

const OVERALL = {
  ELIGIBLE: { label: "충족 예상", tone: "success" },
  NOT_ELIGIBLE: { label: "미충족", tone: "danger" },
  INDETERMINATE: { label: "판단 보류", tone: "warning" }
};

const REQUIREMENT = {
  SATISFIED: { label: "충족", tone: "success", Icon: CircleCheck },
  UNSATISFIED: { label: "미충족", tone: "danger", Icon: CircleAlert },
  UNKNOWN: { label: "확인 필요", tone: "warning", Icon: CircleHelp },
  NOT_APPLICABLE: { label: "해당 없음", tone: "muted", Icon: CircleHelp }
};

export function GraduationPanel() {
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");

  const evaluate = async () => {
    setIsRunning(true);
    try {
      setResult(await runGraduationEvaluation());
      setMessage("");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "졸업요건 자가점검을 실행하지 못했습니다."));
    } finally {
      setIsRunning(false);
    }
  };

  const overall = result ? OVERALL[result.status] ?? OVERALL.INDETERMINATE : null;

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>GRADUATION SELF-CHECK</span>
          <h2>졸업요건 자가점검</h2>
          <p>학적 요약과 검증된 외부 증빙을 기준으로 현재 시점의 졸업요건 충족 여부를 미리 점검합니다.</p>
        </div>
        <GraduationCap size={34} aria-hidden="true" />
      </header>

      {message && <p className={styles.message} role="status">{message}</p>}

      <div className={styles.actionRow}>
        <button className={styles.runButton} type="button" disabled={isRunning} onClick={evaluate}>
          <RefreshCw size={16} className={isRunning ? styles.spinning : undefined} />
          {isRunning ? "점검 중…" : result ? "다시 점검" : "자가점검 실행"}
        </button>
        {result && (
          <span className={styles.meta}>
            정책 기준일 {result.policyAsOf} · 실행 {String(result.evaluatedAt).replace("T", " ").slice(0, 16)}
          </span>
        )}
      </div>

      {!result && !message && (
        <p className={styles.empty}>아직 점검 결과가 없습니다. 자가점검을 실행해 현재 상태를 확인해보세요.</p>
      )}

      {result && (
        <>
          <section className={styles.overview}>
            <article className={styles.overall} data-tone={overall.tone}>
              <small>종합 결과</small>
              <strong>{overall.label}</strong>
            </article>
            <dl className={styles.summary}>
              <div data-tone="success"><dt>충족</dt><dd>{result.summary?.satisfied ?? 0}</dd></div>
              <div data-tone="danger"><dt>미충족</dt><dd>{result.summary?.unsatisfied ?? 0}</dd></div>
              <div data-tone="warning"><dt>확인 필요</dt><dd>{result.summary?.unknown ?? 0}</dd></div>
            </dl>
          </section>

          <section className={styles.requirements}>
            <h3>요건별 판정</h3>
            {(result.requirements ?? []).map((item) => {
              const status = REQUIREMENT[item.status] ?? REQUIREMENT.UNKNOWN;
              const StatusIcon = status.Icon;
              return (
                <article key={item.code} className={styles.requirement} data-tone={status.tone}>
                  <div className={styles.requirementTop}>
                    <StatusIcon size={18} aria-hidden="true" />
                    <strong>{item.title}</strong>
                    <em>{status.label}</em>
                  </div>
                  <dl>
                    <div><dt>현재</dt><dd>{item.currentValue ?? "-"}</dd></div>
                    <div><dt>기준</dt><dd>{item.requiredValue ?? "-"}</dd></div>
                    <div><dt>남은 값</dt><dd>{item.remainingValue ?? "-"}</dd></div>
                  </dl>
                  {item.message && <p>{item.message}</p>}
                  {item.source?.url && (
                    <a href={item.source.url} target="_blank" rel="noreferrer">
                      <ExternalLink size={13} /> {item.source.title ?? "근거 규정"}
                    </a>
                  )}
                </article>
              );
            })}
          </section>

          {(result.policies ?? []).length > 0 && (
            <section className={styles.policies}>
              <h3>적용된 정책</h3>
              <ul>
                {result.policies.map((policy) => (
                  <li key={policy.publicId}>{policy.title} <span>{policy.policyCode} · v{policy.version}</span></li>
                ))}
              </ul>
            </section>
          )}

          {result.disclaimer && <p className={styles.disclaimer}>{result.disclaimer}</p>}
        </>
      )}
    </section>
  );
}
