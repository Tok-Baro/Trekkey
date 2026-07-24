import React, { useState } from "react";
import { Send } from "lucide-react";
import { TeamRosterField } from "./TeamRosterField.jsx";
import { createInitialRoster, sanitizeRoster } from "../../lib/roster.js";

export function ContestApplicationForm({ contest, session, onSubmit, onClose }) {
  const isIndividual = contest.type === "개인전";
  const maxMembers = isIndividual ? 1 : 5;
  const [form, setForm] = useState({
    contestId: contest.id,
    teamName: isIndividual ? session.name : `${session.name} 팀`,
    roster: createInitialRoster(session, { isIndividual }),
    email: session.email,
    phone: "010-1234-5678",
    motivation: "대회 주제에 맞는 아이디어를 구체적인 결과물로 발전시키고 싶습니다."
  });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        const roster = sanitizeRoster(form.roster, { maxMembers });
        onSubmit({
          ...form,
          roster,
          leader: roster[0].name,
          major: roster[0].major,
          members: roster.length
        });
      }}
    >
      <label>
        <span>{isIndividual ? "참가자명" : "팀명"}</span>
        <input value={form.teamName} onChange={(event) => update("teamName", event.target.value)} required />
      </label>

      <TeamRosterField
        value={form.roster}
        onChange={(roster) => update("roster", roster)}
        maxMembers={maxMembers}
        isIndividual={isIndividual}
      />

      <div className="field-row">
        <label>
          <span>이메일</span>
          <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
        </label>
        <label>
          <span>연락처</span>
          <input value={form.phone} onChange={(event) => update("phone", event.target.value)} required />
        </label>
      </div>
      <label>
        <span>지원 동기</span>
        <textarea value={form.motivation} onChange={(event) => update("motivation", event.target.value)} required />
      </label>
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          취소
        </button>
        <button className="primary-button" type="submit">
          <Send size={17} aria-hidden="true" />
          신청 제출
        </button>
      </div>
    </form>
  );
}
