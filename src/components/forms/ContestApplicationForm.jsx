import React, { useEffect, useState } from "react";
import { Plus, Send, X } from "lucide-react";

export function ContestApplicationForm({ contest, session, onSubmit, onClose, onSearchParticipants }) {
  const isIndividual = contest.type === "개인전";
  const [form, setForm] = useState({
    contestId: contest.id,
    teamName: isIndividual ? session.name : `${session.name} 팀`,
    leaderName: session.name,
    major: session.major ?? "",
    contactEmail: session.email,
    phone: "",
    motivation: ""
  });
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    const keyword = memberQuery.trim();
    if (isIndividual || !keyword || !onSearchParticipants) {
      setMemberResults([]);
      setIsSearching(false);
      setSearchError("");
      return undefined;
    }

    let isActive = true;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const results = await onSearchParticipants(keyword);
        if (isActive) {
          setMemberResults(results.filter((result) => !selectedMembers.some((member) => member.userId === result.userId)));
        }
      } catch (error) {
        if (isActive) {
          setMemberResults([]);
          setSearchError(error?.message || "팀원을 검색하지 못했습니다.");
        }
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [isIndividual, memberQuery, onSearchParticipants, selectedMembers]);

  const addMember = (member) => {
    if (selectedMembers.length >= 4 || selectedMembers.some((item) => item.userId === member.userId)) {
      return;
    }
    setSelectedMembers((current) => [...current, member]);
    setMemberQuery("");
    setMemberResults([]);
  };

  const removeMember = (userId) => {
    setSelectedMembers((current) => current.filter((member) => member.userId !== userId));
  };

  return (
    <form
      className="form-stack"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
          await onSubmit({
            ...form,
            memberUserIds: selectedMembers.map((member) => member.userId)
          });
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="field-row">
        <label>
          <span>{isIndividual ? "참가자명" : "팀명"}</span>
          <input value={form.teamName} onChange={(event) => update("teamName", event.target.value)} required />
        </label>
        <label>
          <span>대표자</span>
          <input value={form.leaderName} onChange={(event) => update("leaderName", event.target.value)} required />
        </label>
      </div>
      <div className="field-row">
        <label>
          <span>소속</span>
          <input value={form.major} onChange={(event) => update("major", event.target.value)} required />
        </label>
        <label>
          <span>참가 인원</span>
          <input type="number" value={1 + selectedMembers.length} readOnly />
        </label>
      </div>

      {!isIndividual && (
        <section className="member-picker" aria-labelledby="member-picker-title">
          <div className="member-picker-head">
            <div>
              <strong id="member-picker-title">팀원 선택</strong>
              <span>이름이나 학번으로 검색해 대표자 외 최대 4명을 추가하세요.</span>
            </div>
            <b>{selectedMembers.length}/4명</b>
          </div>
          <label>
            <span>팀원 검색</span>
            <input
              type="search"
              value={memberQuery}
              placeholder="이름 또는 학번 입력"
              onChange={(event) => setMemberQuery(event.target.value)}
              disabled={selectedMembers.length >= 4}
            />
          </label>
          {isSearching && <p className="member-picker-message">검색 중...</p>}
          {searchError && <p className="member-picker-error">{searchError}</p>}
          {!isSearching && memberQuery.trim() && memberResults.length === 0 && !searchError && (
            <p className="member-picker-message">검색 결과가 없습니다.</p>
          )}
          {memberResults.length > 0 && (
            <div className="member-search-results">
              {memberResults.map((member) => (
                <button key={member.userId} type="button" onClick={() => addMember(member)}>
                  <span>
                    <strong>{member.name}</strong>
                    <small>{member.studentId || "학번 없음"} · {member.major || "소속 없음"}</small>
                  </span>
                  <Plus size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
          {selectedMembers.length > 0 && (
            <div className="selected-members">
              {selectedMembers.map((member) => (
                <div key={member.userId}>
                  <span>
                    <strong>{member.name}</strong>
                    <small>{member.studentId || "학번 없음"} · {member.major || "소속 없음"}</small>
                  </span>
                  <button type="button" aria-label={`${member.name} 팀원 제거`} onClick={() => removeMember(member.userId)}>
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="field-row">
        <label>
          <span>이메일</span>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(event) => update("contactEmail", event.target.value)}
            required
          />
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
        <button className="secondary-button" type="button" onClick={onClose} disabled={isSubmitting}>
          취소
        </button>
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          <Send size={17} aria-hidden="true" />
          {isSubmitting ? "신청 중..." : "신청 제출"}
        </button>
      </div>
    </form>
  );
}
