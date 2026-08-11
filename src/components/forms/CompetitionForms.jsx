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

const serverContestStatusOptions = [
  { value: "PREPARING", label: "준비중" },
  { value: "APPLICATION_OPEN", label: "접수중" },
  { value: "REVIEWING", label: "심사중" },
  { value: "AWARDED", label: "수상확정" }
];

const serverParticipationTypeOptions = [
  { value: "TEAM", label: "팀전" },
  { value: "INDIVIDUAL", label: "개인전" },
  { value: "BOTH", label: "개인/팀" }
];

const DEFAULT_MAX_TEAM_MEMBERS = 5;

const serverDecisionOptions = ["top-n", "score-min", "manual"];

function toDateTimeLocal(value) {
  return typeof value === "string" ? value.slice(0, 16) : "";
}

function toServerContestStatus(value) {
  const byLabel = Object.fromEntries(serverContestStatusOptions.map((option) => [option.label, option.value]));
  return byLabel[value] ?? value ?? "PREPARING";
}

function toServerParticipationType(value) {
  const byLabel = Object.fromEntries(serverParticipationTypeOptions.map((option) => [option.label, option.value]));
  return byLabel[value] ?? value ?? "TEAM";
}

function isIndividualParticipationType(value) {
  return value === "INDIVIDUAL" || value === "개인전";
}

function getServerOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getRoundStatusLabel(status) {
  return {
    PREPARING: "준비중",
    OPEN: "평가중",
    FINALIZED: "완료"
  }[status] ?? status ?? "준비중";
}

function createSafeCriterionCode(criteria, index) {
  const usedCodes = new Set(criteria.map((criterion) => criterion.code).filter(Boolean));
  const base = `criterion_${index + 1}`;
  let code = base;
  let suffix = 2;

  while (usedCodes.has(code)) {
    code = `${base}_${suffix}`;
    suffix += 1;
  }
  return code;
}

function createServerEvaluationRound(contestId = "contest", order = 1) {
  return {
    id: `${contestId}-round-${order}`,
    serverId: null,
    order,
    name: `${order}차 심사`,
    status: "PREPARING",
    startsAt: "",
    endsAt: "",
    targetType: order === 1 ? "all-submissions" : "previous-passed",
    passRule: "manual",
    passCount: "",
    minScore: "",
    criteria: [
      {
        id: "criterion_1",
        serverId: null,
        code: "criterion_1",
        label: "평가 기준",
        max: 100
      }
    ]
  };
}

function normalizeContestFormRounds(rounds, contestId, serverBacked) {
  const source = serverBacked && (!Array.isArray(rounds) || rounds.length === 0)
    ? [createServerEvaluationRound(contestId)]
    : rounds;
  const normalized = normalizeEvaluationRounds(source, contestId);

  if (!serverBacked) {
    return normalized;
  }

  return normalized.map((round, roundIndex) => {
    const sourceRound = source?.find((item) => String(item.id) === String(round.id)) ?? source?.[roundIndex];
    return {
      ...round,
      serverId: sourceRound?.serverId ?? (typeof sourceRound?.id === "number" ? sourceRound.id : null),
      status: sourceRound?.status ?? "PREPARING",
      startsAt: toDateTimeLocal(sourceRound?.startsAt),
      endsAt: toDateTimeLocal(sourceRound?.endsAt),
      criteria: round.criteria.map((criterion, criterionIndex) => {
        const sourceCriterion = sourceRound?.criteria?.find(
          (item) => String(item.id) === String(criterion.id) || item.code === criterion.id
        ) ?? sourceRound?.criteria?.[criterionIndex];
        const code = sourceCriterion?.code ?? createSafeCriterionCode(sourceRound?.criteria ?? [], criterionIndex);
        return {
          ...criterion,
          id: sourceCriterion?.id ?? criterion.id ?? code,
          serverId: sourceCriterion?.serverId
            ?? (typeof sourceCriterion?.id === "number" ? sourceCriterion.id : null),
          code
        };
      })
    };
  });
}

function createServerContestForm(contest) {
  const applicationStage = contest?.stages?.find((stage) => stage.stageType === "APPLICATION");
  const submissionStage = contest?.stages?.find((stage) => stage.stageType === "SUBMISSION");
  const contestId = contest?.id ?? "contest";
  const participationType = toServerParticipationType(contest?.participationType ?? contest?.type);

  return {
    ...(contest ?? {}),
    _draftKey: contest?._draftKey ?? (contest ? null : `contest-draft-${Date.now()}-${Math.random()}`),
    title: contest?.title ?? "",
    department: contest?.department ?? "",
    owner: contest?.owner ?? "",
    status: toServerContestStatus(contest?.status),
    type: participationType,
    maxTeamMembers: participationType === "INDIVIDUAL"
      ? 1
      : Number(contest?.maxTeamMembers ?? DEFAULT_MAX_TEAM_MEMBERS),
    awards: Number(contest?.awardCount ?? contest?.awards ?? 0),
    posterUrl: contest?.posterUrl ?? "",
    summary: contest?.summary ?? "",
    target: contest?.target ?? "",
    applicationMethod: contest?.applicationMethod ?? "",
    benefits: contest?.benefits ?? "",
    tags: Array.isArray(contest?.tags) ? contest.tags.join(",") : contest?.tags ?? "",
    detailHtml: contest?.detailHtml ?? "",
    applicationStartsAt: toDateTimeLocal(applicationStage?.startsAt ?? contest?.applicationStartsAt),
    applicationEndsAt: toDateTimeLocal(applicationStage?.endsAt ?? contest?.applicationEndsAt),
    submissionStartsAt: toDateTimeLocal(submissionStage?.startsAt ?? contest?.submissionStartsAt),
    submissionEndsAt: toDateTimeLocal(submissionStage?.endsAt ?? contest?.submissionEndsAt),
    evaluationRounds: normalizeContestFormRounds(contest?.evaluationRounds, contestId, true)
  };
}

function getServerContestValidationMessage(form, rounds) {
  const requiredStrings = [
    [form.title, "대회명"],
    [form.department, "주관부서"],
    [form.summary, "한 줄 소개"],
    [form.target, "참가 대상"],
    [form.applicationMethod, "접수 방법"],
    [form.benefits, "시상 및 혜택"],
    [form.detailHtml, "상세 본문"]
  ];
  const missingString = requiredStrings.find(([value]) => !String(value ?? "").trim());
  if (missingString) {
    return `${missingString[1]}을(를) 입력해 주세요.`;
  }

  const stageDates = [
    [form.applicationStartsAt, "신청 시작"],
    [form.applicationEndsAt, "신청 종료"],
    [form.submissionStartsAt, "제출 시작"],
    [form.submissionEndsAt, "제출 종료"]
  ];
  const missingStageDate = stageDates.find(([value]) => !value);
  if (missingStageDate) {
    return `${missingStageDate[1]} 시각을 입력해 주세요.`;
  }
  if (form.applicationStartsAt >= form.applicationEndsAt || form.submissionStartsAt >= form.submissionEndsAt) {
    return "단계 종료 시각은 시작 시각보다 늦어야 합니다.";
  }
  if (!Number.isFinite(Number(form.awards)) || Number(form.awards) < 0) {
    return "시상 수는 0 이상이어야 합니다.";
  }
  if (!Number.isInteger(Number(form.maxTeamMembers)) || Number(form.maxTeamMembers) < 1) {
    return "팀당 최대 인원은 1명 이상인 정수여야 합니다.";
  }
  if (!rounds.length) {
    return "심사 라운드를 하나 이상 추가해 주세요.";
  }

  for (const [roundIndex, round] of rounds.entries()) {
    if (!String(round.name ?? "").trim()) {
      return "모든 심사 라운드의 이름을 입력해 주세요.";
    }
    if (!round.startsAt || !round.endsAt) {
      return `${round.name} 심사 기간을 입력해 주세요.`;
    }
    if (round.startsAt >= round.endsAt) {
      return `${round.name} 종료 시각은 시작 시각보다 늦어야 합니다.`;
    }
    if (roundIndex === 0 && round.startsAt < form.submissionEndsAt) {
      return "첫 심사 라운드는 제출 종료 시각 이후에 시작해야 합니다.";
    }
    if (roundIndex === 0 && round.targetType === "previous-passed") {
      return "첫 심사 라운드는 이전 라운드 통과팀을 대상으로 선택할 수 없습니다.";
    }
    if (!serverDecisionOptions.includes(round.passRule)) {
      return `${round.name} 통과 방식을 확인해 주세요.`;
    }
    if (round.passRule === "top-n" && Number(round.passCount) < 1) {
      return `${round.name} 선정 팀 수를 입력해 주세요.`;
    }
    if (
      round.passRule === "score-min"
      && (!String(round.minScore ?? "").trim() || !Number.isFinite(Number(round.minScore)) || Number(round.minScore) < 0)
    ) {
      return `${round.name} 기준 점수를 입력해 주세요.`;
    }
    if (!round.criteria.length) {
      return `${round.name} 평가 기준을 추가해 주세요.`;
    }
    const codes = round.criteria.map((criterion) => criterion.code);
    if (new Set(codes).size !== codes.length) {
      return `${round.name} 평가 기준 코드가 중복됩니다.`;
    }
    const invalidCriterion = round.criteria.find(
      (criterion) =>
        !String(criterion.label ?? "").trim()
        || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(criterion.code ?? "")
        || !Number.isInteger(Number(criterion.max))
        || Number(criterion.max) < 1
    );
    if (invalidCriterion) {
      return `${round.name} 평가 기준의 이름과 배점을 확인해 주세요.`;
    }
  }

  return "";
}

export function ContestForm({ contest, onSubmit, onClose, initialStepId = "basic", serverBacked = false }) {
  const [form, setForm] = useState(
    serverBacked
      ? createServerContestForm(contest)
      : contest
      ? {
          ...contest,
          ...getDefaultContestPublicFields(contest),
          maxTeamMembers: isIndividualParticipationType(contest.type)
            ? 1
            : Number(contest.maxTeamMembers ?? DEFAULT_MAX_TEAM_MEMBERS),
          evaluationRounds: normalizeEvaluationRounds(contest.evaluationRounds, contest.id)
        }
      : getTestContestFormDefaults()
  );
  const [stepIndex, setStepIndex] = useState(() => Math.max(contestFormSteps.findIndex((step) => step.id === initialStepId), 0));
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateParticipationType = (type) => setForm((current) => ({
    ...current,
    type,
    maxTeamMembers: isIndividualParticipationType(type)
      ? 1
      : current.maxTeamMembers || DEFAULT_MAX_TEAM_MEMBERS
  }));
  const currentStep = contestFormSteps[stepIndex];
  const isLastStep = stepIndex === contestFormSteps.length - 1;
  const canGoNext = stepIndex !== 0 || Boolean(
    form.title.trim() && form.department.trim() && (serverBacked || form.owner.trim())
  );
  const previewContest = useMemo(() => getContestPreviewData(form, serverBacked), [form, serverBacked]);
  const evaluationRounds = useMemo(
    () => normalizeContestFormRounds(form.evaluationRounds, form.id || "contest", serverBacked),
    [form.evaluationRounds, form.id, serverBacked]
  );
  const applicationStage = form.stages?.find((stage) => stage.stageType === "APPLICATION");
  const submissionStage = form.stages?.find((stage) => stage.stageType === "SUBMISSION");
  const applicationStageLocked = serverBacked
    && applicationStage
    && !["PREPARING", "준비중"].includes(applicationStage.status);
  const submissionStageLocked = serverBacked
    && submissionStage
    && !["PREPARING", "준비중"].includes(submissionStage.status);
  const serverValidationMessage = serverBacked ? getServerContestValidationMessage(form, evaluationRounds) : "";
  const submitContest = async () => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({ ...form, evaluationRounds });
    } finally {
      setIsSubmitting(false);
    }
  };
  const goNext = () => setStepIndex((current) => Math.min(current + 1, contestFormSteps.length - 1));
  const goBack = () => setStepIndex((current) => Math.max(current - 1, 0));
  const updateRounds = (nextRounds) => update(
    "evaluationRounds",
    normalizeContestFormRounds(nextRounds, form.id || "contest", serverBacked)
  );
  const updateRound = (roundId, field, value) => {
    updateRounds(evaluationRounds.map((round) => (round.id === roundId ? { ...round, [field]: value } : round)));
  };
  const addRound = () => {
    const nextOrder = evaluationRounds.length + 1;
    if (serverBacked) {
      updateRounds([
        ...evaluationRounds,
        createServerEvaluationRound(form.id || "contest", nextOrder)
      ]);
      return;
    }

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
    const round = evaluationRounds.find((item) => item.id === roundId);
    if (evaluationRounds.length <= 1 || (serverBacked && round?.serverId != null)) {
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
      evaluationRounds.map((round) => {
        if (round.id !== roundId) {
          return round;
        }

        const code = createSafeCriterionCode(round.criteria, round.criteria.length);
        return {
          ...round,
          criteria: [
            ...round.criteria,
            {
              id: serverBacked ? `${round.id}-${code}` : `${round.id}-criterion-${round.criteria.length + 1}`,
              serverId: null,
              code: serverBacked ? code : undefined,
              label: `기준 ${round.criteria.length + 1}`,
              max: 10
            }
          ]
        };
      })
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
                <input
                  value={form.owner}
                  onChange={(event) => update("owner", event.target.value)}
                  required={!serverBacked}
                />
              </label>
            </div>
            <div className="field-row">
              <label>
                <span>상태</span>
                <select
                  value={form.status}
                  disabled={serverBacked && form.status === "AWARDED"}
                  onChange={(event) => update("status", event.target.value)}
                >
                  {serverBacked
                    ? serverContestStatusOptions
                      .filter((option) => option.value !== "AWARDED" || form.status === "AWARDED")
                      .map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))
                    : ["준비중", "접수중", "심사중", "수상확정"].map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                </select>
              </label>
              <label>
                <span>유형</span>
                <select value={form.type} onChange={(event) => updateParticipationType(event.target.value)}>
                  {serverBacked
                    ? serverParticipationTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))
                    : ["팀전", "개인전", "개인/팀"].map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                </select>
              </label>
            </div>
            <label>
              <span>팀당 최대 참가 인원 (대표자 포함)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.maxTeamMembers}
                disabled={isIndividualParticipationType(form.type)}
                onChange={(event) => update("maxTeamMembers", event.target.value)}
                required
              />
            </label>
            {serverBacked ? (
              <>
                <div className="field-row">
                  <label>
                    <span>신청 시작</span>
                    <input
                      type="datetime-local"
                      value={form.applicationStartsAt}
                      disabled={applicationStageLocked}
                      onChange={(event) => update("applicationStartsAt", event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <span>신청 종료</span>
                    <input
                      type="datetime-local"
                      value={form.applicationEndsAt}
                      disabled={applicationStageLocked}
                      onChange={(event) => update("applicationEndsAt", event.target.value)}
                      required
                    />
                  </label>
                </div>
                <div className="field-row">
                  <label>
                    <span>제출 시작</span>
                    <input
                      type="datetime-local"
                      value={form.submissionStartsAt}
                      disabled={submissionStageLocked}
                      onChange={(event) => update("submissionStartsAt", event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <span>제출 종료</span>
                    <input
                      type="datetime-local"
                      value={form.submissionEndsAt}
                      disabled={submissionStageLocked}
                      onChange={(event) => update("submissionEndsAt", event.target.value)}
                      required
                    />
                  </label>
                </div>
              </>
            ) : (
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
            )}
          </>
        )}

        {currentStep.id === "public" && (
          <>
            <label>
              <span>대표 포스터</span>
              {serverBacked ? (
                <input
                  type="url"
                  value={form.posterUrl}
                  onChange={(event) => update("posterUrl", event.target.value)}
                  placeholder="https://example.com/poster.jpg"
                />
              ) : (
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
              )}
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
                min={serverBacked ? "0" : "1"}
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
              <button
                className="secondary-button"
                type="button"
                disabled={serverBacked && form.status === "AWARDED"}
                onClick={addRound}
              >
                <Plus size={16} aria-hidden="true" />
                라운드 추가
              </button>
            </div>

            <div className="round-card-list">
              {evaluationRounds.map((round, roundIndex) => {
                const totalScore = round.criteria.reduce((sum, criterion) => sum + Number(criterion.max || 0), 0);
                const roundLocked = serverBacked
                  && round.serverId != null
                  && !["PREPARING", "준비중"].includes(round.status);

                return (
                  <fieldset className="round-card" disabled={roundLocked} key={round.id}>
                    <div className="round-card-head">
                      <strong>{roundIndex + 1}단계</strong>
                      <div>
                        <span>{totalScore}점 기준</span>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`${round.name} 삭제`}
                          disabled={evaluationRounds.length <= 1 || (serverBacked && round.serverId != null)}
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
                        {serverBacked ? (
                          <input value={getRoundStatusLabel(round.status)} readOnly />
                        ) : (
                          <select value={round.status} onChange={(event) => updateRound(round.id, "status", event.target.value)}>
                            {["준비중", "평가중", "완료"].map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                          </select>
                        )}
                      </label>
                    </div>

                    {serverBacked && (
                      <div className="field-row">
                        <label>
                          <span>심사 시작</span>
                          <input
                            type="datetime-local"
                            value={round.startsAt}
                            onChange={(event) => updateRound(round.id, "startsAt", event.target.value)}
                            required
                          />
                        </label>
                        <label>
                          <span>심사 종료</span>
                          <input
                            type="datetime-local"
                            value={round.endsAt}
                            onChange={(event) => updateRound(round.id, "endsAt", event.target.value)}
                            required
                          />
                        </label>
                      </div>
                    )}

                    <div className="field-row">
                      <label>
                        <span>평가 대상</span>
                        <select value={round.targetType} onChange={(event) => updateRound(round.id, "targetType", event.target.value)}>
                          {Object.entries(roundTargetLabels)
                            .filter(([value]) => !serverBacked || roundIndex > 0 || value !== "previous-passed")
                            .map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        <span>통과 방식</span>
                        <select value={round.passRule} onChange={(event) => updateRound(round.id, "passRule", event.target.value)}>
                          {Object.entries(passRuleLabels)
                            .filter(([value]) => !serverBacked || serverDecisionOptions.includes(value))
                            .map(([value, label]) => (
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
                            min={serverBacked ? "1" : "0"}
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
                            min={serverBacked ? "1" : "0"}
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
                  </fieldset>
                );
              })}
            </div>
          </div>
        )}

        {currentStep.id === "confirm" && (
          <div className="wizard-confirm-grid">
            <SummaryItem label="대회명" value={form.title} />
            <SummaryItem
              label="주관/담당"
              value={serverBacked
                ? [form.department, form.owner].filter(Boolean).join(" · ")
                : `${form.department} · ${form.owner}`}
            />
            <SummaryItem
              label="상태/유형"
              value={serverBacked
                ? `${getServerOptionLabel(serverContestStatusOptions, form.status)} · ${getServerOptionLabel(serverParticipationTypeOptions, form.type)}`
                : `${form.status} · ${form.type}`}
            />
            <SummaryItem label="팀당 최대 인원" value={`${form.maxTeamMembers}명`} />
            <SummaryItem
              label="접수/제출"
              value={serverBacked
                ? `${form.applicationStartsAt || "-"} ~ ${form.applicationEndsAt || "-"} · ${form.submissionStartsAt || "-"} ~ ${form.submissionEndsAt || "-"}`
                : `${form.applicationPeriod} · ${form.submissionDue}`}
            />
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

      {isLastStep && serverValidationMessage && (
        <p className="form-message" role="alert">{serverValidationMessage}</p>
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
            disabled={Boolean(serverValidationMessage) || isSubmitting}
            onClick={submitContest}
          >
            <Check size={17} />
            {isSubmitting ? "저장 중..." : "저장"}
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

function getContestPreviewData(form, serverBacked = false) {
  return {
    ...getDefaultContestPublicFields(form),
    ...form,
    id: form.id || "PREVIEW",
    title: form.title || "대회명 미입력",
    department: form.department || "주관부서 미입력",
    owner: form.owner || "담당자 미입력",
    status: serverBacked
      ? getServerOptionLabel(serverContestStatusOptions, form.status)
      : form.status || "준비중",
    type: serverBacked
      ? getServerOptionLabel(serverParticipationTypeOptions, form.type)
      : form.type || "개인/팀",
    applicationPeriod: serverBacked
      ? `${form.applicationStartsAt || "-"} ~ ${form.applicationEndsAt || "-"}`
      : form.applicationPeriod || "접수 기간 미입력",
    submissionDue: serverBacked
      ? form.submissionEndsAt || "제출 마감 미입력"
      : form.submissionDue || "제출 마감 미입력",
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

export function JudgeForm({ judge, onSubmit, onClose }) {
  const isEdit = Boolean(judge);
  const [form, setForm] = useState({
    id: judge?.id,
    name: judge?.name ?? "",
    role: judge?.role ?? "외부 심사위원"
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
      <label>
        <span>역할</span>
        <select value={form.role} onChange={(event) => update("role", event.target.value)}>
          {["외부 심사위원", "전임교원", "창업지원단", "산학협력 멘토"].map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
      </label>
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
