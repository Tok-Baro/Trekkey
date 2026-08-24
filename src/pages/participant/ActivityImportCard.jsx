import React, { useState } from "react";
import { Activity, Upload } from "lucide-react";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { importGraduationActivities } from "../../api/graduationApi.js";
import styles from "./TranscriptImportCard.module.scss";

export function ActivityImportCard({ onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");

  const run = async (apply) => {
    if (!file) return setMessage("스마트자기관리시스템에서 저장한 PDF 또는 CSV를 선택해주세요.");
    setPending(apply ? "apply" : "preview");
    try {
      const result = await importGraduationActivities(file, apply);
      setPreview(result);
      setMessage(apply ? `${result.detectedPoints}포인트를 학적정보에 반영했습니다.` : "누적 포인트를 원본과 대조해주세요.");
      if (apply) onImported?.();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "비교과 자료를 읽지 못했습니다."));
    } finally { setPending(""); }
  };

  return <section className={styles.card}>
    <header><div className={styles.icon}><Activity size={22} /></div><div>
      <span>스마트자기관리시스템 자료 가져오기</span><h2>비교과 포인트 PDF·CSV</h2>
      <p>개인 로그인 화면을 크롤링하지 않고, 학생이 내려받은 자료만 명시적으로 가져옵니다.</p>
    </div></header>
    <div className={styles.importer}>
      <label><Upload size={17} /><span>{file?.name ?? "PDF 또는 CSV 선택"}</span><input type="file" accept=".pdf,.csv,application/pdf,text/csv" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); }} /></label>
      <button type="button" onClick={() => run(false)} disabled={!file || Boolean(pending)}>{pending === "preview" ? "분석 중…" : "미리보기"}</button>
      <button className={styles.apply} type="button" onClick={() => run(true)} disabled={!preview || Boolean(pending)}>{pending === "apply" ? "반영 중…" : "포인트 반영"}</button>
    </div>
    {message && <p className={styles.message}>{message}</p>}
    {preview && <dl className={styles.summary}><div><dt>누적 포인트</dt><dd>{preview.detectedPoints}</dd></div><div><dt>개별 활동</dt><dd>{preview.activityCount}건</dd></div><div><dt>자료 형식</dt><dd>{preview.sourceType}</dd></div><div><dt>반영 상태</dt><dd>{preview.applied ? "반영 완료" : "미리보기"}</dd></div></dl>}
    {(preview?.warnings ?? []).map((warning) => <p className={styles.warning} key={warning}>{warning}</p>)}
  </section>;
}
