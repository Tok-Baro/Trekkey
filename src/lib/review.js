export const reviewCriteria = [
  { id: "creativity", label: "창의성", max: 30 },
  { id: "completion", label: "구현 완성도", max: 30 },
  { id: "impact", label: "문제 해결성", max: 25 },
  { id: "delivery", label: "발표 전달력", max: 15 }
];

export function getReviewTotal(record) {
  return Object.values(record.scores).reduce((sum, score) => sum + Number(score || 0), 0);
}

export function getAverage(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
