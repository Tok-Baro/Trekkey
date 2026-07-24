export const LEADER_ROLE = "리더";
export const MEMBER_ROLE = "팀원";
export const MAX_TEAM_MEMBERS = 5;

let rosterSeq = 0;

function nextRosterId() {
  rosterSeq += 1;
  return `MEMBER-${Date.now().toString(36)}-${rosterSeq}`;
}

export function createRosterMember(overrides = {}) {
  return {
    id: overrides.id || nextRosterId(),
    name: overrides.name ?? "",
    studentId: overrides.studentId ?? "",
    major: overrides.major ?? "",
    role: overrides.role === LEADER_ROLE ? LEADER_ROLE : MEMBER_ROLE
  };
}

// 첫 번째 구성원은 항상 리더, 나머지는 팀원으로 역할을 고정한다.
export function normalizeRoster(members = []) {
  const source = Array.isArray(members) && members.length ? members : [createRosterMember({ role: LEADER_ROLE })];

  return source.map((member, index) =>
    createRosterMember({ ...member, role: index === 0 ? LEADER_ROLE : MEMBER_ROLE })
  );
}

// 신규 신청서의 초기 명단. 리더는 현재 로그인한 참가자로 채운다.
export function createInitialRoster(session = {}, { isIndividual = false } = {}) {
  const leader = createRosterMember({
    name: session.name ?? "",
    studentId: session.studentId ?? "",
    major: session.major ?? "",
    role: LEADER_ROLE
  });

  if (isIndividual) {
    return [leader];
  }

  return [leader, createRosterMember({ role: MEMBER_ROLE })];
}

// 기존 팀 레코드에서 편집용 명단을 만든다. roster가 없으면 leader/members 수로 복원한다.
export function getEditableRoster(team = {}) {
  if (Array.isArray(team.roster) && team.roster.length) {
    return normalizeRoster(team.roster);
  }

  const count = Math.max(Number(team.members) || 1, 1);
  const leader = createRosterMember({ name: team.leader ?? "", major: team.major ?? "", role: LEADER_ROLE });
  const rest = Array.from({ length: count - 1 }, () => createRosterMember({ role: MEMBER_ROLE }));

  return [leader, ...rest];
}

// 표시용 명단. 명시적으로 입력된 roster가 있을 때만 반환하고, 없으면 null.
export function getDisplayRoster(team = {}) {
  if (Array.isArray(team.roster) && team.roster.length) {
    return normalizeRoster(team.roster);
  }

  return null;
}

// 저장 직전 정리: 공백 제거, 리더 외 이름이 빈 행 제외, 최대 인원 제한.
export function sanitizeRoster(members = [], { maxMembers = MAX_TEAM_MEMBERS } = {}) {
  const normalized = normalizeRoster(members).map((member) => ({
    ...member,
    name: member.name.trim(),
    studentId: member.studentId.trim(),
    major: member.major.trim()
  }));

  const [leader, ...rest] = normalized;
  const filledMembers = rest.filter((member) => member.name);

  return [leader, ...filledMembers].slice(0, Math.max(maxMembers, 1));
}

// 카드/표에서 쓰는 한 줄 요약. roster가 없으면 인원 수만 표시한다.
export function formatRosterSummary(team = {}) {
  const roster = getDisplayRoster(team);

  if (!roster) {
    return `${Math.max(Number(team.members) || 1, 1)}명`;
  }

  const names = roster.map((member) => member.name).filter(Boolean);

  if (!names.length) {
    return `${roster.length}명`;
  }

  return `${names.join(", ")} (${roster.length}명)`;
}
