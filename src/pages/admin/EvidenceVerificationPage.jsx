import React, { useEffect, useState } from "react";
import { CheckCircle2, Download, FileSearch, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { downloadAdminEvidenceFile, listEvidenceVerificationQueue, reviewEvidence } from "../../api/evidenceApi.js";
import { evidenceStatus, evidenceTypeLabel, saveBlob } from "../../lib/evidence.js";
import styles from "./EvidenceVerificationPage.module.scss";

export function EvidenceVerificationPage({ onNotify }) {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("");
  const [note, setNote] = useState("");
  const [officialReferenceUrl, setOfficialReferenceUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      const result = await listEvidenceVerificationQueue(filter);
      setItems(result);
      setSelectedId((current) => result.some((item) => item.casePublicId === current)
        ? current : result[0]?.casePublicId ?? "");
      setError("");
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "검수 큐를 불러오지 못했습니다."));
    } finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);
  const selected = items.find((item) => item.casePublicId === selectedId) ?? null;

  const review = async (result) => {
    if (!selected || selected.caseStatus === "VERIFIED" || selected.caseStatus === "REJECTED" || selected.caseStatus === "INCONCLUSIVE") return;
    setIsReviewing(true);
    try {
      const response = await reviewEvidence(selected.casePublicId, {
        result,
        assuranceLevel: "L2",
        reasonCode: result === "APPROVE" ? "OFFICIAL_SOURCE_MATCH" : "OFFICIAL_SOURCE_MISMATCH",
        officialReferenceUrl: officialReferenceUrl || null,
        note: note || null
      });
      const message = response.finalDecision
        ? `최종 판정: ${response.finalDecision}`
        : "1차 검수를 저장했습니다. 다른 관리자의 2차 검수가 필요합니다.";
      onNotify?.(message, response.finalDecision === "VERIFIED" ? "success" : "info");
      setNote("");
      setOfficialReferenceUrl("");
      await load();
    } catch (reviewError) {
      onNotify?.(getApiErrorMessage(reviewError, "검수 의견을 저장하지 못했습니다."), "error");
    } finally { setIsReviewing(false); }
  };

  const download = async (file) => {
    try { saveBlob(await downloadAdminEvidenceFile(file.publicId, file.originalName)); }
    catch (downloadError) { onNotify?.(getApiErrorMessage(downloadError, "원본을 내려받지 못했습니다."), "error"); }
  };

  return <div className={styles.page}>
    <header className={styles.header}><div><span>EXTERNAL EVIDENCE</span><h1>외부 증빙 검수</h1><p>학생 자료를 공식 조회 결과와 대조하고 서로 다른 두 관리자가 확인합니다.</p></div>
      <button type="button" onClick={load}><RefreshCw size={16} /> 새로고침</button></header>
    <div className={styles.filters}>{[
      ["", "전체"], ["MANUAL_REVIEW", "1차 대기"], ["AWAITING_SECOND_REVIEW", "2차 대기"], ["VERIFIED", "완료"], ["INCONCLUSIVE", "추가 확인"]
    ].map(([value, label]) => <button data-active={filter === value} key={value} type="button" onClick={() => setFilter(value)}>{label}</button>)}</div>
    {error && <p className={styles.error}><ShieldAlert size={17} /> {error}</p>}
    <div className={styles.layout}>
      <aside className={styles.queue}>
        {isLoading ? <p>불러오는 중…</p> : items.length === 0 ? <p>해당 검수 건이 없습니다.</p> : items.map((item) => {
          const status = evidenceStatus(item.status);
          return <button data-active={selectedId === item.casePublicId} key={item.casePublicId} type="button" onClick={() => setSelectedId(item.casePublicId)}>
            <span>{evidenceTypeLabel(item.evidenceType)} · {item.reviewCount}/2</span><strong>{item.title}</strong><small>{item.subjectName} · {item.studentId || "학번 없음"}</small><em data-tone={status.tone}>{status.label}</em>
          </button>;
        })}
      </aside>
      <main className={styles.detail}>
        {!selected ? <div className={styles.empty}><FileSearch size={38} /><p>검수할 증빙을 선택하세요.</p></div> : <>
          <div className={styles.title}><div><span>{evidenceTypeLabel(selected.evidenceType)}</span><h2>{selected.title}</h2><p>{selected.issuerName}</p></div><strong>{selected.reviewCount}/2명 확인</strong></div>
          <dl className={styles.meta}>
            <div><dt>학생</dt><dd>{selected.subjectName}</dd></div><div><dt>학번</dt><dd>{selected.studentId || "-"}</dd></div>
            <div><dt>발급일</dt><dd>{selected.issuedAt || "-"}</dd></div><div><dt>만료일</dt><dd>{selected.expiresAt || "없음"}</dd></div>
            <div><dt>기관 코드</dt><dd>{selected.issuerCode || "미등록"}</dd></div><div><dt>번호</dt><dd>{selected.credentialNumberMasked || "파일 확인"}</dd></div>
            <div><dt>신청 등급·수치</dt><dd>{selected.numericValue ?? "해당 없음"}</dd></div>
          </dl>
          <section className={styles.files}><h3>제출 원본</h3>{selected.files?.map((file) => <button key={file.publicId} type="button" onClick={() => download(file)}><Download size={16} /><span>{file.originalName}<small>{Math.ceil(file.sizeBytes / 1024)} KB · {file.safetyStatus}</small></span></button>)}</section>
          {!['VERIFIED','REJECTED','INCONCLUSIVE'].includes(selected.caseStatus) && <section className={styles.review}>
            <h3>{selected.reviewCount === 0 ? "1차 검수 의견" : "2차 검수 의견"}</h3>
            <p>공식 진위확인 화면·공고·기관 회신과 이름, 번호, 등급, 유효기간을 모두 대조하세요.</p>
            <input type="url" value={officialReferenceUrl} onChange={(e) => setOfficialReferenceUrl(e.target.value)} placeholder="https:// 공식 진위확인·수상공고 URL (승인 시 필수)" />
            <textarea maxLength="1000" value={note} onChange={(e) => setNote(e.target.value)} placeholder="개인정보를 제외한 확인 근거와 특이사항" />
            <div><button disabled={isReviewing} type="button" onClick={() => review("REJECT")}><XCircle size={17} /> 불일치·반려</button>
              <button disabled={isReviewing} type="button" onClick={() => review("APPROVE")}><CheckCircle2 size={17} /> 공식 자료 일치</button></div>
          </section>}
          {['VERIFIED','REJECTED','INCONCLUSIVE'].includes(selected.caseStatus) && <p className={styles.closed}>최종 상태: {evidenceStatus(selected.status).label}</p>}
        </>}
      </main>
    </div>
  </div>;
}
