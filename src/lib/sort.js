export function compareValues(a, b) {
  const first = String(a ?? "").trim();
  const second = String(b ?? "").trim();
  const firstNumber = Number(first.replace(/[,%점건명팀]/g, ""));
  const secondNumber = Number(second.replace(/[,%점건명팀]/g, ""));

  if (first !== "" && second !== "" && !Number.isNaN(firstNumber) && !Number.isNaN(secondNumber)) {
    return firstNumber - secondNumber;
  }

  return first.localeCompare(second, "ko");
}

export function sortRecords(records, sort) {
  if (!sort.key) {
    return records;
  }

  return [...records].sort((a, b) => {
    const order = compareValues(a[sort.key], b[sort.key]);
    return sort.direction === "asc" ? order : -order;
  });
}

export function toggleSortState(current, key) {
  return current.key === key
    ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" };
}
