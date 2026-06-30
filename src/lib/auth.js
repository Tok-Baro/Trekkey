import { demoAccounts } from "../data/competitionData.js";

export function getLoginFormDefaults(role) {
  const account = demoAccounts[role] ?? demoAccounts.admin;
  return {
    role,
    name: account.name,
    email: account.email,
    employeeId: account.employeeId ?? "",
    studentId: account.studentId ?? "",
    major: account.major ?? "",
    password: "demo1234"
  };
}

export function getParticipantKey(session) {
  return session?.studentId || session?.email || session?.name || "guest";
}
