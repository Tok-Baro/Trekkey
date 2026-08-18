import React, { useEffect, useState } from "react";
import { Download, FileCheck2, ShieldCheck, Upload } from "lucide-react";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { downloadMyEvidenceFile, listMyEvidence, submitEvidence } from "../../api/evidenceApi.js";
import { EVIDENCE_TYPES, evidenceStatus, evidenceTypeLabel, saveBlob } from "../../lib/evidence.js";
import styles from "./ExternalEvidencePanel.module.scss";

const initialForm = {
  evidenceType: "QUALIFICATION",
  title: "",
  issuerName: "",
  issuerCode: "",
  credentialNumber: "",
  numericValue: "",
  issuedAt: "",
  expiresAt: ""
};

export function ExternalEvidencePanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      setItems(await listMyEvidence());
      setMessage("");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "증빙 목록을 불러오지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!file) {
      setMessage("PDF, JPG, PNG 원본 파일을 선택해주세요.");
      return;
    }
    const type = EVIDENCE_TYPES.find((item) => item.value === form.evidenceType);
    const values = Object.fromEntries(Object.entries({
      ...form,
      targetRecordType: type?.recordType ?? "OTHER",
      numericValue: form.numericValue === "" ? null : Number(form.numericValue),
      issuerCode: form.issuerCode || null,
      credentialNumber: form.credentialNumber || null,
      issuedAt: form.issuedAt || null,
      expiresAt: form.expiresAt || null
    }).filter(([, value]) => value !== ""));
    setIsSubmitting(true);
    try {
      await submitEvidence({ values, file });
      setForm(initialForm);
      setFile(null);
      event.currentTarget.reset();
      setMessage("증빙을 제출했습니다. 서로 다른 두 관리자가 확인한 뒤 반영됩니다.");
      await load();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "증빙을 제출하지 못했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const download = async (entry) => {
    try {
      saveBlob(await downloadMyEvidenceFile(entry.publicId, entry.originalName));
    } catch (error) {
      setMessage(getApiErrorMessage(error, "파일을 내려받지 못했습니다."));
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div><span>GRADUATION EVIDENCE</span><h2>외부 증빙 제출</h2>
          <p>자격증·공모전 상장·수료증 원본을 제출하면 관리자가 공식 자료와 대조합니다.</p></div>
        <ShieldCheck size={34} aria-hidden="true" />
      </header>

      {message && <p className={styles.message} role="status">{message}</p>}

      <div className={styles.grid}>
        <form className={styles.form} onSubmit={submit}>
          <h3><Upload size={19} /> 새 증빙</h3>
          <label>증빙 유형<select value={form.evidenceType} onChange={(e) => setForm({ ...form, evidenceType: e.target.value })}>
            {EVIDENCE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select></label>
          <label>증빙명<input required maxLength="200" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 정보처리기사" /></label>
          <label>발급기관<input required maxLength="200" value={form.issuerName} onChange={(e) => setForm({ ...form, issuerName: e.target.value })} /></label>
          <div className={styles.row}>
            <label>기관 코드(선택)<input maxLength="100" value={form.issuerCode} onChange={(e) => setForm({ ...form, issuerCode: e.target.value })} placeholder="예: HRDK_QNET" /></label>
            <label>자격·상장번호(선택)<input maxLength="200" value={form.credentialNumber} onChange={(e) => setForm({ ...form, credentialNumber: e.target.value })} /></label>
          </div>
          <div className={styles.row}>
            <label>발급일<input type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} /></label>
            <label>만료일<input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></label>
          </div>
          {form.evidenceType === "LANGUAGE_SCORE" && <label>등급·급수<input type="number" min="0" step="0.01" value={form.numericValue} onChange={(e) => setForm({ ...form, numericValue: e.target.value })} /></label>}
          <label className={styles.file}>원본 파일 <small>PDF/JPG/PNG · 최대 10MB</small>
            <input required type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button disabled={isSubmitting} type="submit">{isSubmitting ? "제출 중…" : "관리자 검수 요청"}</button>
        </form>

        <section className={styles.list}>
          <h3><FileCheck2 size={19} /> 내 증빙</h3>
          {isLoading ? <p className={styles.empty}>불러오는 중…</p> : items.length === 0 ? <p className={styles.empty}>제출한 증빙이 없습니다.</p> : items.map((item) => {
            const status = evidenceStatus(item.status);
            return <article key={item.publicId} className={styles.card}>
              <div className={styles.cardTop}><div><small>{evidenceTypeLabel(item.evidenceType)}</small><strong>{item.title}</strong><span>{item.issuerName}</span></div>
                <em data-tone={status.tone}>{status.label}</em></div>
              <dl><div><dt>검수</dt><dd>{item.reviewCount}/2명</dd></div><div><dt>강도</dt><dd>{item.achievedAssuranceLevel ?? "대기"}</dd></div><div><dt>발급일</dt><dd>{item.issuedAt ?? "-"}</dd></div></dl>
              {item.files?.map((entry) => <button className={styles.download} key={entry.publicId} type="button" onClick={() => download(entry)}><Download size={15} /> {entry.originalName}</button>)}
            </article>;
          })}
        </section>
      </div>
    </section>
  );
}
