import React, { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Save } from "lucide-react";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { getGraduationAcademicUnits, getGraduationProfile, saveGraduationProfile } from "../../api/graduationApi.js";
import styles from "./AcademicProfileCard.module.scss";

const SELECT_OPTIONS = {
  admissionType: [
    ["FRESHMAN", "신입학"],
    ["GENERAL_TRANSFER", "일반편입"],
    ["BACHELOR_TRANSFER", "학사편입"],
    ["INTERNATIONAL_TRANSFER_2", "외국인 편입(2학년)"],
    ["INTERNATIONAL_TRANSFER_3", "외국인 편입(3학년)"],
    ["INTERNATIONAL_TRANSFER_4", "외국인 편입(4학년)"]
  ],
  graduationPath: [
    ["REGULAR", "일반 졸업"],
    ["EARLY", "조기 졸업"],
    ["BACHELOR_MASTER_LINKED_7", "학석사 연계 7학기"],
    ["BACHELOR_MASTER_LINKED_8", "학석사 연계 8학기"]
  ],
  majorPlanType: [
    ["INTENSIVE", "심화전공"],
    ["CONVERGENCE_I", "융합전공 I"],
    ["CONVERGENCE_II", "융합전공 II"],
    ["CREATIVE_CONVERGENCE_COLLEGE", "창의융합대학"],
    ["CONVERGENCE_I_WITH_MINOR", "융합전공 I + 부전공"],
    ["CONVERGENCE_I_WITH_MICRO_DEGREE", "융합전공 I + 마이크로디그리"]
  ],
  inputMode: [
    ["SUMMARY_ONLY", "학적 요약으로 입력"],
    ["COURSE_DETAIL", "과목 상세까지 입력"]
  ],
  recordCompleteness: [
    ["UNKNOWN", "확인 전"],
    ["PARTIAL", "일부 입력"],
    ["COMPLETE", "전체 입력 완료"]
  ],
  failHistoryStatus: [
    ["UNKNOWN", "확인하지 않음"],
    ["NONE", "F 이력 없음"],
    ["EXISTS", "F 이력 있음"]
  ]
};

function defaultForm() {
  const now = new Date();
  const year = now.getFullYear();
  return {
    admissionYear: year,
    curriculumYear: year,
    admissionType: "FRESHMAN",
    graduationPath: "REGULAR",
    majorPlanType: "INTENSIVE",
    registeredSemesters: 0,
    totalCredits: 0,
    hansungCredits: 0,
    transferRecognizedCredits: 0,
    cumulativeGpa: 0,
    gpaScale: 4.5,
    activityPoints: 0,
    internationalStudent: false,
    teachingProgram: false,
    inputMode: "SUMMARY_ONLY",
    recordCompleteness: "PARTIAL",
    summaryAsOfTerm: `${year}-${now.getMonth() < 6 ? 1 : 2}`,
    expectedGraduationYear: year + 4,
    expectedGraduationMonth: 2,
    academicUnitPublicId: "",
    primaryTrackPublicId: "",
    secondaryTrackPublicId: "",
    failHistoryStatus: "UNKNOWN",
    recordCompletenessConfirmed: false,
    version: null
  };
}

function toForm(profile) {
  if (!profile?.configured) return defaultForm();
  const defaults = defaultForm();
  const form = Object.fromEntries(Object.keys(defaults).map((key) => [
    key,
    key === "recordCompletenessConfirmed" ? profile.recordCompleteness === "COMPLETE" : profile[key] ?? defaults[key]
  ]));
  const selections = profile.academicUnits ?? [];
  form.academicUnitPublicId = selections.find((item) => ["DIVISION", "DEPARTMENT", "MAJOR"].includes(item.unitType))?.publicId ?? "";
  const tracks = selections.filter((item) => item.unitType === "TRACK");
  form.primaryTrackPublicId = tracks.find((item) => item.roleType === "PRIMARY")?.publicId ?? tracks[0]?.publicId ?? "";
  form.secondaryTrackPublicId = tracks.find((item) => item.roleType === "SECONDARY")?.publicId ?? tracks[1]?.publicId ?? "";
  return form;
}

function SelectField({ label, name, value, options, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <select name={name} value={value} onChange={onChange}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function NumberField({ label, name, value, onChange, step = "1", min = "0", max }) {
  return (
    <label>
      <span>{label}</span>
      <input type="number" name={name} value={value} min={min} max={max} step={step} onChange={onChange} required />
    </label>
  );
}

export function AcademicProfileCard({ studentNumber }) {
  const [profile, setProfile] = useState(null);
  const [academicUnits, setAcademicUnits] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getGraduationProfile(), getGraduationAcademicUnits()])
      .then(([result, units]) => {
        if (!active) return;
        setProfile(result);
        setForm(toForm(result));
        setAcademicUnits(units ?? []);
      })
      .catch((nextError) => active && setError(getApiErrorMessage(nextError, "학적정보를 불러오지 못했습니다.")))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, []);

  const programUnits = useMemo(
    () => academicUnits.filter((item) => ["DIVISION", "DEPARTMENT", "MAJOR"].includes(item.unitType)),
    [academicUnits]
  );
  const selectedProgram = academicUnits.find((item) => item.publicId === form.academicUnitPublicId);
  const trackUnits = useMemo(
    () => academicUnits.filter((item) => item.unitType === "TRACK" && (!selectedProgram || item.parentPublicId === selectedProgram.publicId)),
    [academicUnits, selectedProgram]
  );

  const completenessHelp = useMemo(() => {
    if (form.recordCompleteness === "COMPLETE") return "입력한 학적 요약이 빠짐없이 정확한지 확인해주세요.";
    if (form.recordCompleteness === "PARTIAL") return "일부 정보만 입력한 경우 자가점검 결과가 보류될 수 있습니다.";
    return "학적정보를 확인하기 전 상태입니다.";
  }, [form.recordCompleteness]);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "academicUnitPublicId" ? { primaryTrackPublicId: "", secondaryTrackPublicId: "" } : {})
    }));
    setMessage("");
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (form.recordCompleteness === "COMPLETE" && !form.recordCompletenessConfirmed) {
      setError("전체 입력 완료로 저장하려면 정확성 확인에 체크해주세요.");
      return;
    }
    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      const {
        academicUnitPublicId,
        primaryTrackPublicId,
        secondaryTrackPublicId,
        ...profileFields
      } = form;
      const academicUnitSelections = [];
      if (academicUnitPublicId) academicUnitSelections.push({ academicUnitPublicId, roleType: "PRIMARY", sequenceNo: 1 });
      if (primaryTrackPublicId) academicUnitSelections.push({ academicUnitPublicId: primaryTrackPublicId, roleType: "PRIMARY", sequenceNo: 2 });
      if (secondaryTrackPublicId) academicUnitSelections.push({ academicUnitPublicId: secondaryTrackPublicId, roleType: "SECONDARY", sequenceNo: 3 });
      const saved = await saveGraduationProfile({
        ...profileFields,
        admissionYear: Number(form.admissionYear),
        curriculumYear: Number(form.curriculumYear),
        expectedGraduationYear: Number(form.expectedGraduationYear),
        expectedGraduationMonth: Number(form.expectedGraduationMonth),
        registeredSemesters: Number(form.registeredSemesters),
        totalCredits: Number(form.totalCredits),
        hansungCredits: Number(form.hansungCredits),
        transferRecognizedCredits: Number(form.transferRecognizedCredits),
        cumulativeGpa: Number(form.cumulativeGpa),
        gpaScale: Number(form.gpaScale),
        activityPoints: Number(form.activityPoints),
        academicUnits: academicUnitSelections,
        version: profile?.configured ? profile.version : null
      });
      setProfile(saved);
      setForm(toForm(saved));
      setMessage("학적정보를 저장했습니다. 졸업 자가점검에 바로 반영됩니다.");
    } catch (nextError) {
      setError(getApiErrorMessage(nextError, "학적정보를 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.icon}><BookOpenCheck size={22} aria-hidden="true" /></div>
        <div>
          <span>졸업 자가점검 기준</span>
          <h2>학적정보</h2>
          <p>학번 {studentNumber || profile?.studentNumber || "-"} · {profile?.organization?.name || "한성대학교"}</p>
        </div>
        <em data-configured={profile?.configured ? "true" : "false"}>
          {profile?.configured ? "설정 완료" : "설정 필요"}
        </em>
      </header>

      {isLoading ? <p className={styles.status}>학적정보를 불러오는 중입니다…</p> : (
        <form className={styles.form} onSubmit={submit}>
          <fieldset>
            <legend>입학 및 졸업 과정</legend>
            <div className={styles.grid}>
              <NumberField label="입학 연도" name="admissionYear" value={form.admissionYear} min="1900" max={new Date().getFullYear()} onChange={change} />
              <NumberField label="적용 교육과정 연도" name="curriculumYear" value={form.curriculumYear} min="1900" max={new Date().getFullYear()} onChange={change} />
              <SelectField label="입학 유형" name="admissionType" value={form.admissionType} options={SELECT_OPTIONS.admissionType} onChange={change} />
              <SelectField label="졸업 과정" name="graduationPath" value={form.graduationPath} options={SELECT_OPTIONS.graduationPath} onChange={change} />
              <SelectField label="전공 이수 유형" name="majorPlanType" value={form.majorPlanType} options={SELECT_OPTIONS.majorPlanType} onChange={change} />
              <NumberField label="등록 학기" name="registeredSemesters" value={form.registeredSemesters} max="30" onChange={change} />
              <NumberField label="졸업예정 연도" name="expectedGraduationYear" value={form.expectedGraduationYear} min={form.admissionYear} max={new Date().getFullYear() + 10} onChange={change} />
              <label><span>졸업예정 월</span><select name="expectedGraduationMonth" value={form.expectedGraduationMonth} onChange={change}><option value="2">2월</option><option value="8">8월</option></select></label>
              <label><span>소속 학과·학부</span><select name="academicUnitPublicId" value={form.academicUnitPublicId} onChange={change} required><option value="">선택해주세요</option>{programUnits.map((unit) => <option key={unit.publicId} value={unit.publicId}>{unit.name}</option>)}</select></label>
              <label><span>제1트랙</span><select name="primaryTrackPublicId" value={form.primaryTrackPublicId} onChange={change} disabled={trackUnits.length === 0}><option value="">선택 안 함</option>{trackUnits.map((unit) => <option key={unit.publicId} value={unit.publicId}>{unit.name}</option>)}</select></label>
              <label><span>제2트랙</span><select name="secondaryTrackPublicId" value={form.secondaryTrackPublicId} onChange={change} disabled={trackUnits.length === 0}><option value="">선택 안 함</option>{trackUnits.filter((unit) => unit.publicId !== form.primaryTrackPublicId).map((unit) => <option key={unit.publicId} value={unit.publicId}>{unit.name}</option>)}</select></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>학점 및 성적</legend>
            <div className={styles.grid}>
              <NumberField label="총 이수학점" name="totalCredits" value={form.totalCredits} step="0.5" onChange={change} />
              <NumberField label="한성대 취득학점" name="hansungCredits" value={form.hansungCredits} step="0.5" onChange={change} />
              <NumberField label="편입 인정학점" name="transferRecognizedCredits" value={form.transferRecognizedCredits} step="0.5" onChange={change} />
              <NumberField label="누적 평점" name="cumulativeGpa" value={form.cumulativeGpa} step="0.01" onChange={change} />
              <NumberField label="평점 만점" name="gpaScale" value={form.gpaScale} step="0.1" min="0.1" onChange={change} />
              <NumberField label="비교과 포인트" name="activityPoints" value={form.activityPoints} onChange={change} />
            </div>
          </fieldset>

          <fieldset>
            <legend>기록 상태</legend>
            <div className={styles.grid}>
              <SelectField label="입력 방식" name="inputMode" value={form.inputMode} options={SELECT_OPTIONS.inputMode} onChange={change} />
              <SelectField label="입력 완전성" name="recordCompleteness" value={form.recordCompleteness} options={SELECT_OPTIONS.recordCompleteness} onChange={change} />
              <SelectField label="F 이력" name="failHistoryStatus" value={form.failHistoryStatus} options={SELECT_OPTIONS.failHistoryStatus} onChange={change} />
              <label>
                <span>기준 학기</span>
                <input name="summaryAsOfTerm" value={form.summaryAsOfTerm} pattern="\d{4}-[12]" placeholder="2026-2" onChange={change} />
              </label>
            </div>
            <p className={styles.help}>{completenessHelp}</p>
            <div className={styles.toggles}>
              <label><input type="checkbox" name="internationalStudent" checked={form.internationalStudent} onChange={change} /> 외국인 학생</label>
              <label><input type="checkbox" name="teachingProgram" checked={form.teachingProgram} onChange={change} /> 교직 과정 이수 중</label>
              {form.recordCompleteness === "COMPLETE" && (
                <label className={styles.confirm}><input type="checkbox" name="recordCompletenessConfirmed" checked={form.recordCompletenessConfirmed} onChange={change} /> 입력한 학적정보가 정확하고 빠짐없음을 확인합니다.</label>
              )}
            </div>
          </fieldset>

          {error && <p className={styles.error} role="alert">{error}</p>}
          {message && <p className={styles.success} role="status">{message}</p>}

          <div className={styles.actions}>
            <button type="submit" disabled={isSaving}>
              <Save size={16} aria-hidden="true" /> {isSaving ? "저장 중…" : "학적정보 저장"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
