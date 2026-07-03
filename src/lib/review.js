export const reviewCriteria = [
  { id: "creativity", label: "창의성", max: 30 },
  { id: "completion", label: "구현 완성도", max: 30 },
  { id: "impact", label: "문제 해결성", max: 25 },
  { id: "delivery", label: "발표 전달력", max: 15 }
];

const criterionColors = ["var(--blue)", "var(--teal)", "var(--purple)", "var(--amber)", "var(--green)"];

export const roundTargetLabels = {
  "all-submissions": "전체 제출팀",
  "previous-passed": "이전 라운드 통과팀",
  manual: "관리자 지정팀"
};

export const passRuleLabels = {
  "top-n": "상위 N팀",
  "score-min": "기준 점수 이상",
  manual: "관리자 확정",
  final: "최종 결과"
};

export function createEvaluationRound({ contestId = "contest", order = 1, name, targetType, passRule } = {}) {
  return {
    id: `${contestId}-round-${order}`,
    order,
    name: name || (order === 1 ? "최종 심사" : `${order}차 평가`),
    status: order === 1 ? "평가중" : "준비중",
    targetType: targetType || (order === 1 ? "all-submissions" : "previous-passed"),
    passRule: passRule || (order === 1 ? "final" : "manual"),
    passCount: order === 1 ? "" : 10,
    minScore: "",
    criteria: reviewCriteria.map((criterion) => ({
      id: criterion.id,
      label: criterion.label,
      max: criterion.max
    }))
  };
}

export function normalizeEvaluationRounds(rounds, contestId = "contest") {
  const source = Array.isArray(rounds) && rounds.length ? rounds : [createEvaluationRound({ contestId, order: 1 })];

  return source
    .map((round, index) => {
      const order = Number(round.order || index + 1);
      const fallback = createEvaluationRound({ contestId, order });

      return {
        ...fallback,
        ...round,
        id: round.id || `${contestId}-round-${order}`,
        order,
        name: round.name?.trim() || fallback.name,
        criteria: normalizeRoundCriteria(round.criteria)
      };
    })
    .sort((a, b) => a.order - b.order)
    .map((round, index) => ({
      ...round,
      order: index + 1
    }));
}

export function normalizeRoundCriteria(criteria) {
  const source = Array.isArray(criteria) && criteria.length ? criteria : reviewCriteria;

  return source.map((criterion, index) => ({
    id: criterion.id || `criterion-${index + 1}`,
    label: criterion.label || criterion.name || `기준 ${index + 1}`,
    max: Number(criterion.max ?? criterion.score ?? criterion.value ?? 0)
  }));
}

export function getRoundScoreCriteria(round) {
  return normalizeRoundCriteria(round?.criteria).map((criterion, index) => ({
    ...criterion,
    value: criterion.max,
    color: criterionColors[index % criterionColors.length]
  }));
}

export function getPrimaryRound(contest) {
  return normalizeEvaluationRounds(contest?.evaluationRounds, contest?.id)[0];
}

export function getRoundIdForRecord(record, contestOrRounds) {
  if (record?.roundId) {
    return record.roundId;
  }

  const rounds = Array.isArray(contestOrRounds)
    ? normalizeEvaluationRounds(contestOrRounds)
    : normalizeEvaluationRounds(contestOrRounds?.evaluationRounds, contestOrRounds?.id);
  return rounds[0]?.id;
}

export function isRecordInRound(record, round, contestOrRounds) {
  return getRoundIdForRecord(record, contestOrRounds) === round?.id;
}

export function getReviewTotal(record) {
  return Object.values(record.scores).reduce((sum, score) => sum + Number(score || 0), 0);
}

export function getAverage(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
