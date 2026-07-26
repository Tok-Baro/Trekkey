import React from "react";
import { Plus, Trash2, UserRound } from "lucide-react";
import {
  LEADER_ROLE,
  MEMBER_ROLE,
  createRosterMember,
  getDisplayRoster,
  normalizeRoster
} from "../../lib/roster.js";

export function TeamRosterField({ value, onChange, maxMembers = 5, isIndividual = false }) {
  const roster = normalizeRoster(value);
  const atMax = roster.length >= maxMembers;

  const updateMember = (id, field, fieldValue) => {
    onChange(roster.map((member) => (member.id === id ? { ...member, [field]: fieldValue } : member)));
  };

  const addMember = () => {
    if (atMax) {
      return;
    }
    onChange([...roster, createRosterMember({ role: MEMBER_ROLE })]);
  };

  const removeMember = (id) => {
    // 리더(첫 행)는 삭제하지 않는다.
    onChange(roster.filter((member, index) => index === 0 || member.id !== id));
  };

  return (
    <div className="roster-field">
      <div className="roster-head">
        <span className="roster-title">{isIndividual ? "참가자 정보" : "팀원 명단"}</span>
        {!isIndividual && <span className="roster-count">{roster.length} / {maxMembers}명</span>}
      </div>

      <div className="roster-list">
        {roster.map((member, index) => {
          const isLeader = index === 0;
          const label = isLeader ? "대표자" : `팀원 ${index}`;

          return (
            <div className="roster-row" key={member.id}>
              <span className={`roster-role${isLeader ? " leader" : ""}`}>
                <UserRound size={13} aria-hidden="true" />
                {isLeader ? LEADER_ROLE : MEMBER_ROLE}
              </span>
              <div className="roster-inputs">
                <input
                  className="roster-name"
                  placeholder={isLeader ? "대표자 이름" : "팀원 이름"}
                  value={member.name}
                  onChange={(event) => updateMember(member.id, "name", event.target.value)}
                  required={isLeader}
                  aria-label={`${label} 이름`}
                />
                <input
                  className="roster-student"
                  placeholder="학번"
                  value={member.studentId}
                  onChange={(event) => updateMember(member.id, "studentId", event.target.value)}
                  inputMode="numeric"
                  aria-label={`${label} 학번`}
                />
                <input
                  className="roster-major"
                  placeholder="전공"
                  value={member.major}
                  onChange={(event) => updateMember(member.id, "major", event.target.value)}
                  aria-label={`${label} 전공`}
                />
              </div>
              {!isIndividual && !isLeader ? (
                <button
                  type="button"
                  className="roster-remove"
                  onClick={() => removeMember(member.id)}
                  aria-label={`${label} 삭제`}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              ) : (
                <span className="roster-remove roster-remove-placeholder" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>

      {!isIndividual && (
        <button type="button" className="roster-add" onClick={addMember} disabled={atMax}>
          <Plus size={15} aria-hidden="true" />
          팀원 추가
        </button>
      )}
    </div>
  );
}

// 읽기 전용 명단 표시. 명시적 roster가 없으면 아무것도 렌더링하지 않는다.
export function TeamRosterSummary({ team, title }) {
  const roster = getDisplayRoster(team);

  if (!roster) {
    return null;
  }

  return (
    <div className="roster-summary">
      {title ? <span className="roster-summary-title">{title}</span> : null}
      <ul className="roster-chips">
        {roster.map((member, index) => (
          <li className={`roster-chip${index === 0 ? " leader" : ""}`} key={member.id}>
            <span className="roster-chip-name">{member.name || "미입력"}</span>
            {member.studentId ? <span className="roster-chip-meta">{member.studentId}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
