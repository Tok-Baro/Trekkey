import React, { useEffect, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { getGraduationAcademicUnits, getGraduationCourses, importGraduationTranscript, updateGraduationCourse } from "../../api/graduationApi.js";
import styles from "./TranscriptImportCard.module.scss";

export function TranscriptImportCard({ onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [courses, setCourses] = useState([]);
  const [academicUnits, setAcademicUnits] = useState([]);
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([getGraduationCourses(), getGraduationAcademicUnits()])
      .then(([courseItems, unitItems]) => { setCourses(courseItems); setAcademicUnits(unitItems); })
      .catch(() => setCourses([]));
  }, []);

  const inspect = async () => {
    if (!file) return setMessage("종합정보시스템에서 출력한 PDF 또는 CSV를 선택해주세요.");
    setPending("preview");
    try {
      setPreview(await importGraduationTranscript(file, false));
      setMessage("미리보기 결과를 원본 성적표와 대조해주세요.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "성적표를 읽지 못했습니다."));
    } finally {
      setPending("");
    }
  };

  const apply = async () => {
    if (!file) {
      setMessage("종합정보시스템에서 출력한 PDF 또는 CSV를 선택해주세요.");
      return;
    }
    setPending("apply");
    try {
      const result = await importGraduationTranscript(file, true);
      setPreview({ ...result, courses: null });
      setCourses(await getGraduationCourses());
      setMessage(`${result.courseCount}개 과목을 학적정보에 반영했습니다.`);
      onImported?.();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "성적표를 반영하지 못했습니다."));
    } finally {
      setPending("");
    }
  };

  const visible = preview?.courses ?? courses;

  const changeCategory = async (course, category) => {
    if (!course.publicId) return;
    try {
      const saved = await updateGraduationCourse(course.publicId, { category, academicUnitPublicId: course.academicUnitPublicId });
      setCourses((current) => current.map((item) => item.publicId === saved.publicId ? saved : item));
      setMessage(`${saved.courseName}의 이수구분을 수정했습니다.`);
    } catch (error) {
      setMessage(getApiErrorMessage(error, "이수구분을 수정하지 못했습니다."));
    }
  };

  const changeUnit = async (course, academicUnitPublicId) => {
    if (!course.publicId) return;
    try {
      const saved = await updateGraduationCourse(course.publicId, { category: course.category, academicUnitPublicId: academicUnitPublicId || null });
      setCourses((current) => current.map((item) => item.publicId === saved.publicId ? saved : item));
      setMessage(`${saved.courseName}의 전공·트랙 연결을 수정했습니다.`);
    } catch (error) { setMessage(getApiErrorMessage(error, "전공·트랙 연결을 수정하지 못했습니다.")); }
  };

  return (
    <section className={styles.card}>
      <header><div className={styles.icon}><FileSpreadsheet size={22} /></div><div>
        <span>종합정보시스템 자료 가져오기</span><h2>성적표 PDF·CSV</h2>
        <p>한성대 비밀번호는 저장하지 않습니다. 종정시의 성적조회(누적) 출력 파일만 처리합니다.</p>
      </div></header>

      <div className={styles.importer}>
        <label><Upload size={17} /><span>{file?.name ?? "PDF 또는 CSV 선택"}</span>
          <input type="file" accept=".pdf,.csv,application/pdf,text/csv" onChange={(event) => {
            setFile(event.target.files?.[0] ?? null); setPreview(null); setMessage("");
          }} />
        </label>
        <button type="button" onClick={inspect} disabled={!file || Boolean(pending)}>{pending === "preview" ? "분석 중…" : "미리보기"}</button>
        <button className={styles.apply} type="button" onClick={apply} disabled={!file || Boolean(pending)}>{pending === "apply" ? "반영 중…" : "학적정보에 반영"}</button>
      </div>

      {message && <p className={styles.message}>{message}</p>}
      {preview && <dl className={styles.summary}>
        <div><dt>과목</dt><dd>{preview.courseCount}개</dd></div>
        <div><dt>총 학점</dt><dd>{preview.detectedTotalCredits ?? "확인 필요"}</dd></div>
        <div><dt>누적 평점</dt><dd>{preview.detectedGpa ?? "확인 필요"}</dd></div>
        <div><dt>최근 학기</dt><dd>{preview.latestTerm ?? "-"}</dd></div>
      </dl>}
      {(preview?.warnings ?? []).map((warning) => <p className={styles.warning} key={warning}>{warning}</p>)}

      {visible.length > 0 && <div className={styles.tableWrap}><table><thead><tr>
        <th>학기</th><th>과목명</th><th>이수구분</th><th>전공·트랙</th><th>학점</th><th>성적</th><th>출처</th>
      </tr></thead><tbody>{visible.map((course, index) => <tr key={course.publicId ?? `${course.term}-${course.courseCode}-${index}`}>
        <td>{course.term}</td><td>{course.courseName}</td><td>{course.publicId ? <select value={course.category} onChange={(event) => changeCategory(course, event.target.value)}>
          <option value="GENERAL_REQUIRED">교양필수</option><option value="GENERAL_DISTRIBUTION">교양배분</option><option value="GENERAL_ELECTIVE">교양선택</option>
          <option value="MAJOR_FOUNDATION">전공기초</option><option value="MAJOR_REQUIRED">전공필수</option><option value="MAJOR_ELECTIVE">전공선택</option>
          <option value="FREE_ELECTIVE">일반선택</option><option value="GRADUATE_COURSE">대학원과목</option>
        </select> : course.category}</td><td>{course.publicId ? <select value={course.academicUnitPublicId ?? ""} onChange={(event) => changeUnit(course, event.target.value)}><option value="">공통·미지정</option>{academicUnits.map((unit) => <option key={unit.publicId} value={unit.publicId}>{unit.name}</option>)}</select> : "반영 후 지정"}</td><td>{course.credits}</td><td>{course.grade ?? "-"}</td><td>{course.sourceType ?? preview?.sourceType}</td>
      </tr>)}</tbody></table></div>}
    </section>
  );
}
