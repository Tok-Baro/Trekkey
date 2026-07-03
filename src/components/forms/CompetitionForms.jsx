import React, { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Check, ChevronLeft, ChevronRight, Eye, FileArchive, ImagePlus, Plus, Type, Upload, X } from "lucide-react";
import { ContestPublicView } from "../public/ContestPublicView.jsx";
import { getDefaultContestPublicFields, getTestContestFormDefaults } from "../../lib/contest.js";
import {
  createEvaluationRound,
  normalizeEvaluationRounds,
  passRuleLabels,
  roundTargetLabels
} from "../../lib/review.js";
import { createSubmissionFileMeta, formatFileSize, SUBMISSION_FILE_ACCEPT } from "../../lib/submissionFiles.js";

const contestFormSteps = [
  { id: "basic", label: "기본 정보" },
  { id: "public", label: "공개 페이지" },
  { id: "content", label: "본문/조건" },
  { id: "evaluation", label: "평가 라운드" },
  { id: "confirm", label: "확인" }
];

export function ContestForm({ contest, onSubmit, onClose, initialStepId = "basic" }) {
  const [form, setForm] = useState(
    contest
      ? {
          ...contest,
          ...getDefaultContestPublicFields(contest),
          evaluationRounds: normalizeEvaluationRounds(contest.evaluationRounds, contest.id)
        }
      : getTestContestFormDefaults()
  );
  const [stepIndex, setStepIndex] = useState(() => Math.max(contestFormSteps.findIndex((step) => step.id === initialStepId), 0));
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const currentStep = contestFormSteps[stepIndex];
  const isLastStep = stepIndex === contestFormSteps.length - 1;
  const canGoNext = stepIndex !== 0 || Boolean(form.title.trim() && form.department.trim() && form.owner.trim());
  const previewContest = useMemo(() => getContestPreviewData(form), [form]);
  const evaluationRounds = useMemo(() => normalizeEvaluationRounds(form.evaluationRounds, form.id || "contest"), [form.evaluationRounds, form.id]);
  const goNext = () => setStepIndex((current) => Math.min(current + 1, contestFormSteps.length - 1));
  const goBack = () => setStepIndex((current) => Math.max(current - 1, 0));
  const updateRounds = (nextRounds) => update("evaluationRounds", normalizeEvaluationRounds(nextRounds, form.id || "contest"));
  const updateRound = (roundId, field, value) => {
    updateRounds(evaluationRounds.map((round) => (round.id === roundId ? { ...round, [field]: value } : round)));
  };
  const addRound = () => {
    const nextOrder = evaluationRounds.length + 1;
    const preparedRounds = evaluationRounds.map((round, index) => {
      if (index !== evaluationRounds.length - 1 || round.passRule !== "final") {
        return round;
      }

      return {
        ...round,
        name: evaluationRounds.length === 1 && round.name === "최종 심사" ? "1차 평가" : round.name,
        passRule: "top-n",
        passCount: round.passCount || 10,
        targetType: index === 0 ? "all-submissions" : round.targetType
      };
    });

    updateRounds([
      ...preparedRounds,
      createEvaluationRound({
        contestId: form.id || "contest",
        order: nextOrder,
        name: nextOrder === 2 ? "최종 평가" : `${nextOrder}차 최종 평가`,
        targetType: "previous-passed",
        passRule: "final"
      })
    ]);
  };
  const removeRound = (roundId) => {
    if (evaluationRounds.length <= 1) {
      return;
    }
    updateRounds(evaluationRounds.filter((round) => round.id !== roundId));
  };
  const updateCriterion = (roundId, criterionId, field, value) => {
    updateRounds(
      evaluationRounds.map((round) =>
        round.id === roundId
          ? {
              ...round,
              criteria: round.criteria.map((criterion) =>
                criterion.id === criterionId ? { ...criterion, [field]: value } : criterion
              )
            }
          : round
      )
    );
  };
  const addCriterion = (roundId) => {
    updateRounds(
      evaluationRounds.map((round) =>
        round.id === roundId
          ? {
              ...round,
              criteria: [
                ...round.criteria,
                {
                  id: `${round.id}-criterion-${round.criteria.length + 1}`,
                  label: `기준 ${round.criteria.length + 1}`,
                  max: 10
                }
              ]
            }
          : round
      )
    );
  };
  const removeCriterion = (roundId, criterionId) => {
    updateRounds(
      evaluationRounds.map((round) =>
        round.id === roundId && round.criteria.length > 1
          ? { ...round, criteria: round.criteria.filter((criterion) => criterion.id !== criterionId) }
          : round
      )
    );
  };
  const handlePosterUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => update("posterUrl", reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="form-stack contest-wizard-form"
      role="form"
      aria-label={contest ? "대회 편집" : "대회 생성"}
    >
      <div className="wizard-steps" role="tablist" aria-label="대회 생성 단계">
        {contestFormSteps.map((step, index) => (
          <button
            className={index === stepIndex ? "active" : ""}
            key={step.id}
            type="button"
            role="tab"
            aria-selected={index === stepIndex}
            onClick={() => setStepIndex(index)}
          >
            <span>{index + 1}</span>
            {step.label}
          </button>
        ))}
      </div>

      <div className="wizard-body">
        <div className="form-divider">
          <strong>{currentStep.label}</strong>
          <span>{getContestStepHelp(currentStep.id)}</span>
        </div>

        {currentStep.id === "basic" && (
          <>
            <label>
              <span>대회명</span>
              <input value={form.title} onChange={(event) => update("title", event.target.value)} required />
            </label>
            <div className="field-row">
              <label>
                <span>주관부서</span>
                <input value={form.department} onChange={(event) => update("department", event.target.value)} required />
              </label>
              <label>
                <span>담당자</span>
                <input value={form.owner} onChange={(event) => update("owner", event.target.value)} required />
              </label>
            </div>
            <div className="field-row">
              <label>
                <span>상태</span>
                <select value={form.status} onChange={(event) => update("status", event.target.value)}>
                  {["준비중", "접수중", "심사중", "수상확정"].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>유형</span>
                <select value={form.type} onChange={(event) => update("type", event.target.value)}>
                  {["팀전", "개인전", "개인/팀"].map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="field-row">
              <label>
                <span>접수 기간</span>
                <input value={form.applicationPeriod} onChange={(event) => update("applicationPeriod", event.target.value)} />
              </label>
              <label>
                <span>제출 마감</span>
                <input value={form.submissionDue} onChange={(event) => update("submissionDue", event.target.value)} />
              </label>
            </div>
          </>
        )}

        {currentStep.id === "public" && (
          <>
            <label>
              <span>대표 포스터</span>
              <div className="poster-upload-field">
                <div className="poster-upload-preview">
                  {form.posterUrl ? (
                    <img src={form.posterUrl} alt="대회 포스터 미리보기" />
                  ) : (
                    <div>
                      <ImagePlus size={28} aria-hidden="true" />
                      <span>포스터 없음</span>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handlePosterUpload} />
              </div>
            </label>
            <label>
              <span>한 줄 소개</span>
              <textarea value={form.summary} onChange={(event) => update("summary", event.target.value)} />
            </label>
            <div className="field-row">
              <label>
                <span>참가 대상</span>
                <input value={form.target} onChange={(event) => update("target", event.target.value)} />
              </label>
              <label>
                <span>태그</span>
                <input value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="AI,광고,공모전" />
              </label>
            </div>
          </>
        )}

        {currentStep.id === "content" && (
          <>
            <label>
              <span>접수 방법</span>
              <input value={form.applicationMethod} onChange={(event) => update("applicationMethod", event.target.value)} />
            </label>
            <label>
              <span>시상 및 혜택</span>
              <input value={form.benefits} onChange={(event) => update("benefits", event.target.value)} />
            </label>
            <label>
              <span>시상 수</span>
              <input
                type="number"
                min="1"
                value={form.awards}
                onChange={(event) => update("awards", event.target.value)}
              />
            </label>
            <div className="editor-field">
              <span>상세 본문</span>
              <RichTextEditor value={form.detailHtml} onChange={(html) => update("detailHtml", html)} />
            </div>
          </>
        )}

        {currentStep.id === "evaluation" && (
          <div className="round-builder">
            <div className="round-builder-head">
              <div>
                <strong>평가 라운드</strong>
                <span>대회마다 필요한 평가 단계와 점수 기준을 다르게 설정합니다.</span>
              </div>
              <button className="secondary-button" type="button" onClick={addRound}>
                <Plus size={16} aria-hidden="true" />
                라운드 추가
              </button>
            </div>

            <div className="round-card-list">
              {evaluationRounds.map((round, roundIndex) => {
                const totalScore = round.criteria.reduce((sum, criterion) => sum + Number(criterion.max || 0), 0);

                return (
                  <section className="round-card" key={round.id}>
                    <div className="round-card-head">
                      <strong>{roundIndex + 1}단계</strong>
                      <div>
                        <span>{totalScore}점 기준</span>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`${round.name} 삭제`}
                          disabled={evaluationRounds.length <= 1}
                          onClick={() => removeRound(round.id)}
                        >
                          <X size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="field-row">
                      <label>
                        <span>라운드명</span>
                        <input value={round.name} onChange={(event) => updateRound(round.id, "name", event.target.value)} />
                      </label>
                      <label>
                        <span>상태</span>
                        <select value={round.status} onChange={(event) => updateRound(round.id, "status", event.target.value)}>
                          {["준비중", "평가중", "완료"].map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="field-row">
                      <label>
                        <span>평가 대상</span>
                        <select value={round.targetType} onChange={(event) => updateRound(round.id, "targetType", event.target.value)}>
                          {Object.entries(roundTargetLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>통과 방식</span>
                        <select value={round.passRule} onChange={(event) => updateRound(round.id, "passRule", event.target.value)}>
                          {Object.entries(passRuleLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {round.passRule !== "final" && (
                      <div className="field-row">
                        <label>
                          <span>통과 팀 수</span>
                          <input
                            type="number"
                            min="0"
                            value={round.passCount ?? ""}
                            onChange={(event) => updateRound(round.id, "passCount", event.target.value)}
                            placeholder="예: 10"
                          />
                        </label>
                        <label>
                          <span>기준 점수</span>
                          <input
                            type="number"
                            min="0"
                            value={round.minScore ?? ""}
                            onChange={(event) => updateRound(round.id, "minScore", event.target.value)}
                            placeholder="선택"
                          />
                        </label>
                      </div>
                    )}

                    <div className="criteria-builder">
                      <div className="criteria-builder-head">
                        <span>점수 기준</span>
                        <button type="button" onClick={() => addCriterion(round.id)}>
                          <Plus size={14} aria-hidden="true" />
                          기준 추가
                        </button>
                      </div>
                      {round.criteria.map((criterion) => (
                        <div className="criteria-row" key={criterion.id}>
                          <input
                            value={criterion.label}
                            onChange={(event) => updateCriterion(round.id, criterion.id, "label", event.target.value)}
                            aria-label="평가 기준명"
                          />
                          <input
                            type="number"
                            min="0"
                            value={criterion.max}
                            onChange={(event) => updateCriterion(round.id, criterion.id, "max", event.target.value)}
                            aria-label="배점"
                          />
                          <button
                            className="icon-button"
                            type="button"
                            aria-label={`${criterion.label} 삭제`}
                            disabled={round.criteria.length <= 1}
                            onClick={() => removeCriterion(round.id, criterion.id)}
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {currentStep.id === "confirm" && (
          <div className="wizard-confirm-grid">
            <SummaryItem label="대회명" value={form.title} />
            <SummaryItem label="주관/담당" value={`${form.department} · ${form.owner}`} />
            <SummaryItem label="상태/유형" value={`${form.status} · ${form.type}`} />
            <SummaryItem label="접수/제출" value={`${form.applicationPeriod} · ${form.submissionDue}`} />
            <SummaryItem label="대상" value={form.target} />
            <SummaryItem label="시상" value={`${form.awards}개 · ${form.benefits}`} />
            <SummaryItem
              label="평가"
              value={`${evaluationRounds.length}개 라운드 · ${evaluationRounds.map((round) => round.name).join(" → ")}`}
            />
          </div>
        )}
      </div>

      {isPreviewOpen && (
        <div className="contest-preview-layer" role="region" aria-label="공개 페이지 미리보기">
          <div className="contest-preview-header">
            <div>
              <strong>공개 페이지 미리보기</strong>
              <span>저장 전 입력값 기준으로 표시됩니다.</span>
            </div>
            <button className="icon-button" type="button" aria-label="미리보기 닫기" onClick={() => setIsPreviewOpen(false)}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="contest-preview-scroll">
            <main className="contest-public-page contest-public-page--preview">
              <ContestPublicView contest={previewContest} />
            </main>
          </div>
        </div>
      )}

      <div className="modal-actions">
        <button className="secondary-button contest-preview-trigger" type="button" onClick={() => setIsPreviewOpen(true)}>
          <Eye size={17} aria-hidden="true" />
          공개 페이지 미리보기
        </button>
        <button className="secondary-button" type="button" onClick={onClose}>
          취소
        </button>
        {stepIndex > 0 && (
          <button className="secondary-button" type="button" onClick={goBack}>
            <ChevronLeft size={17} />
            이전
          </button>
        )}
        {isLastStep ? (
          <button
            className="primary-button"
            type="button"
            onClick={() => onSubmit({ ...form, evaluationRounds })}
          >
            <Check size={17} />
            저장
          </button>
        ) : (
          <button className="primary-button" type="button" disabled={!canGoNext} onClick={goNext}>
            다음
            <ChevronRight size={17} />
          </button>
        )}
      </div>
    </div>
  );
}

function getContestPreviewData(form) {
  return {
    ...getDefaultContestPublicFields(form),
    ...form,
    id: form.id || "PREVIEW",
    title: form.title || "대회명 미입력",
    department: form.department || "주관부서 미입력",
    owner: form.owner || "담당자 미입력",
    status: form.status || "준비중",
    type: form.type || "개인/팀",
    applicationPeriod: form.applicationPeriod || "접수 기간 미입력",
    submissionDue: form.submissionDue || "제출 마감 미입력",
    awards: form.awards || 0,
    summary: form.summary || "한 줄 소개가 입력되지 않았습니다.",
    target: form.target || "참가 대상 미입력",
    applicationMethod: form.applicationMethod || "접수 방법이 입력되지 않았습니다.",
    benefits: form.benefits || "시상 및 혜택이 입력되지 않았습니다.",
    tags: form.tags || "",
    evaluationRounds: normalizeEvaluationRounds(form.evaluationRounds, form.id || "PREVIEW"),
    detailHtml: form.detailHtml || "<p>상세 본문이 입력되지 않았습니다.</p>"
  };
}

function getContestStepHelp(stepId) {
  const help = {
    basic: "운영 목록과 대시보드에 먼저 노출되는 핵심 정보입니다.",
    public: "참가자가 공개 페이지와 참가자 포털에서 보는 정보입니다.",
    content: "공고 본문과 시상 조건을 정리합니다.",
    evaluation: "라운드 수, 대상, 통과 방식, 점수 기준을 대회별로 설정합니다.",
    confirm: "저장 전 관리자 화면에 반영될 정보를 확인합니다."
  };

  return help[stepId];
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class: "rich-editor-content"
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    }
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="rich-editor-shell">에디터 준비 중</div>;
  }

  return (
    <div className="rich-editor-shell">
      <div className="rich-editor-toolbar">
        <button
          className={editor.isActive("heading", { level: 2 }) ? "active" : ""}
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          className={editor.isActive("heading", { level: 3 }) ? "active" : ""}
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </button>
        <button
          className={editor.isActive("bold") ? "active" : ""}
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          className={editor.isActive("bulletList") ? "active" : ""}
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          목록
        </button>
        <button type="button" onClick={() => editor.chain().focus().setParagraph().run()}>
          <Type size={15} />
          본문
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export function SubmissionForm({ teams, onSubmit, onClose }) {
  const [form, setForm] = useState({
    team: teams[0]?.name ?? "미등록 팀",
    title: "",
    submittedAt: "방금 전"
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileMetas = useMemo(
    () => selectedFiles.map((file, index) => createSubmissionFileMeta(file, index)),
    [selectedFiles]
  );
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const removeFile = (targetIndex) => {
    setSelectedFiles((current) => current.filter((_, index) => index !== targetIndex));
  };

  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          ...form,
          files: fileMetas.length,
          attachments: fileMetas,
          uploadFiles: selectedFiles
        });
      }}
    >
      <label>
        <span>팀</span>
        <select value={form.team} onChange={(event) => update("team", event.target.value)}>
          {teams.length ? (
            teams.map((team) => <option key={team.id}>{team.name}</option>)
          ) : (
            <option>미등록 팀</option>
          )}
        </select>
      </label>
      <label>
        <span>제출물명</span>
        <input value={form.title} onChange={(event) => update("title", event.target.value)} required />
      </label>
      <label className="file-upload-field">
        <span>제출 파일</span>
        <div className="file-upload-drop">
          <FileArchive size={24} aria-hidden="true" />
          <strong>{fileMetas.length ? `${fileMetas.length}개 파일 선택됨` : "파일 선택"}</strong>
          <small>PDF, PPTX, ZIP, 영상 파일 등을 여러 개 선택할 수 있습니다.</small>
          <input
            type="file"
            accept={SUBMISSION_FILE_ACCEPT}
            multiple
            required={selectedFiles.length === 0}
            onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
          />
        </div>
      </label>
      {fileMetas.length > 0 && (
        <div className="file-preview-list" aria-label="선택한 파일">
          {fileMetas.map((file, index) => (
            <div className="file-preview-item" key={file.id}>
              <FileArchive size={16} aria-hidden="true" />
              <div>
                <strong>{file.name}</strong>
                <span>
                  {formatFileSize(file.size)} · {file.type}
                </span>
              </div>
              <button type="button" aria-label={`${file.name} 제거`} onClick={() => removeFile(index)}>
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="field-row">
        <label>
          <span>접수시각</span>
          <input value={form.submittedAt} onChange={(event) => update("submittedAt", event.target.value)} />
        </label>
      </div>
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          취소
        </button>
        <button className="primary-button" type="submit" disabled={selectedFiles.length === 0}>
          <Upload size={17} />
          접수
        </button>
      </div>
    </form>
  );
}

export function JudgeForm({ judge, rounds = [], defaultRoundId, onSubmit, onClose }) {
  const isEdit = Boolean(judge);
  const [form, setForm] = useState({
    id: judge?.id,
    roundId: judge?.roundId ?? defaultRoundId ?? rounds[0]?.id,
    name: judge?.name ?? "",
    role: judge?.role ?? "외부 심사위원",
    assigned: judge?.assigned ?? 5
  });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <label>
        <span>이름</span>
        <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
      </label>
      {rounds.length > 0 && (
        <label>
          <span>평가 라운드</span>
          <select value={form.roundId} onChange={(event) => update("roundId", event.target.value)}>
            {rounds.map((round) => (
              <option key={round.id} value={round.id}>
                {round.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="field-row">
        <label>
          <span>역할</span>
          <select value={form.role} onChange={(event) => update("role", event.target.value)}>
            {["외부 심사위원", "전임교원", "창업지원단", "산학협력 멘토"].map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
        </label>
        <label>
          <span>배정 건수</span>
          <input
            type="number"
            min="1"
            value={form.assigned}
            onChange={(event) => update("assigned", event.target.value)}
            required
          />
        </label>
      </div>
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          취소
        </button>
        <button className="primary-button" type="submit">
          <Plus size={17} />
          {isEdit ? "저장" : "추가"}
        </button>
      </div>
    </form>
  );
}
