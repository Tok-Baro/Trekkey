import { BadgeCheck, FileArchive, Gavel, Home, PanelsTopLeft, Trophy, UsersRound } from "lucide-react";

export const navItems = [
  { id: "dashboard", label: "대시보드", icon: Home },
  { id: "contests", label: "대회", icon: PanelsTopLeft },
  { id: "teams", label: "신청/팀", icon: UsersRound },
  { id: "submissions", label: "제출물", icon: FileArchive },
  { id: "judging", label: "심사", icon: Gavel },
  { id: "awards", label: "수상 확정", icon: Trophy },
  { id: "credentials", label: "검증 원장", icon: BadgeCheck }
];
