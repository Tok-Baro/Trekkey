import React, { useState } from "react";
import { ExternalLink, GraduationCap, RefreshCw } from "lucide-react";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { syncHansungGraduationSources } from "../../api/graduationApi.js";
import styles from "./GraduationPolicyPage.module.scss";

export function GraduationPolicyPage() {
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const sync = async () => {
    setPending(true);
    try { setResult(await syncHansungGraduationSources()); setMessage("한성대 공식 출처를 확인했습니다."); }
    catch (error) { setMessage(getApiErrorMessage(error, "공식 출처를 확인하지 못했습니다.")); }
    finally { setPending(false); }
  };

  return <section className={styles.page}>
    <header><div><span>GRADUATION POLICY</span><h1>졸업요건 공식 출처</h1><p>공개된 한성대·학과 공지를 해시로 비교하고, 변경된 정책은 자동 적용하지 않고 검토 대상으로 표시합니다.</p></div><GraduationCap size={36} /></header>
    <div className={styles.actions}><button type="button" onClick={sync} disabled={pending}><RefreshCw size={16} className={pending ? styles.spin : ""} />{pending ? "확인 중…" : "공식 출처 동기화"}</button><span>종합정보시스템과 스마트자기관리시스템의 개인 로그인 영역은 크롤링하지 않습니다.</span></div>
    {message && <p className={styles.message}>{message}</p>}
    <div className={styles.list}>{(result?.sources ?? []).map((source) => <article key={source.policyCode} data-status={source.status}>
      <div><small>{source.policyCode}</small><strong>{source.title}</strong><p>{source.message}</p></div><div><em>{source.status}</em><a href={source.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> 원문</a></div>
    </article>)}</div>
  </section>;
}
