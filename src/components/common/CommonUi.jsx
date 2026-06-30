import React from "react";
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  FileCheck2,
  Gavel,
  Hourglass,
  Info,
  X
} from "lucide-react";
import { statusTone } from "../../data/competitionData.js";

export function DetailList({ items }) {
  return (
    <dl className="modal-detail-list">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PanelHeader({ title, action }) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PriorityCard({ icon: Icon, tone, label, title, meta, action, onClick }) {
  return (
    <article className={`priority-card ${tone}`}>
      <div className="priority-icon">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="priority-copy">
        <span>{label}</span>
        <strong>{title}</strong>
        <p>{meta}</p>
      </div>
      <button className="priority-action" type="button" onClick={onClick}>
        {action}
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </article>
  );
}

export function ContestScopeBar({ contests, selectedContest, selectedContestId, setSelectedContestId }) {
  return (
    <section className="contest-context wide" aria-label="선택 대회">
      <div className="contest-context-main">
        <div className="context-title-line">
          <strong>{selectedContest.title}</strong>
          <StatusBadge status={selectedContest.status} />
        </div>
        <p>
          {selectedContest.department} · {selectedContest.owner} · 접수 {selectedContest.applicationPeriod} · 제출 마감{" "}
          {selectedContest.submissionDue}
        </p>
      </div>
      <div className="contest-context-tools">
        <label className="contest-context-select">
          <select value={selectedContestId} onChange={(event) => setSelectedContestId(event.target.value)}>
            {contests.map((contest) => (
              <option key={contest.id} value={contest.id}>
                {contest.title}
              </option>
            ))}
          </select>
        </label>
        <dl className="contest-context-meta">
          <div>
            <dt>참가</dt>
            <dd>{selectedContest.teams}팀</dd>
          </div>
          <div>
            <dt>제출</dt>
            <dd>{selectedContest.submissions}건</dd>
          </div>
          <div>
            <dt>심사위원</dt>
            <dd>{selectedContest.judges}명</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

export function StatusBadge({ status }) {
  const Icon = statusIcon[status] ?? CircleDot;
  return (
    <span className={`status-badge ${statusTone[status] ?? "neutral"}`} data-status={status}>
      <Icon size={12} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

const statusIcon = {
  준비중: Clock3,
  접수중: Info,
  심사중: Gavel,
  수상확정: Award,
  승인: CheckCircle2,
  보완요청: AlertTriangle,
  검토중: Hourglass,
  배정완료: Gavel,
  심사완료: CheckCircle2,
  수상후보: Award,
  미배정: AlertTriangle,
  접수완료: FileCheck2,
  대기: Hourglass,
  확정대기: Hourglass,
  확정: CheckCircle2,
  보류: AlertTriangle
};

export function ProgressBar({ value }) {
  return (
    <div className="progress-bar" aria-label={`진행률 ${value}%`}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

export function ProgressRing({ value }) {
  return (
    <div className="progress-ring" style={{ "--value": `${value}%` }}>
      <span>{value}</span>
    </div>
  );
}

export function IconButton({ label, children, onClick }) {
  return (
    <button className="icon-button" type="button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

export function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="segmented-control">
      {options.map((option) => (
        <button
          key={option}
          className={option === value ? "active" : ""}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function TaskItem({ icon: Icon, tone, title, meta }) {
  return (
    <div className={`task-item ${tone}`}>
      <div className="task-icon">
        <Icon size={18} aria-hidden="true" />
      </div>
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
    </div>
  );
}

export function RuleItem({ label, value }) {
  return (
    <div className="rule-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function FlowStep({ label, active }) {
  return (
    <div className={`flow-step ${active ? "active" : ""}`}>
      <span />
      <strong>{label}</strong>
    </div>
  );
}

export function ChecklistItem({ done, label, meta }) {
  return (
    <div className="checklist-item">
      <div className={done ? "check-dot done" : "check-dot"}>
        {done ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
      </div>
      <div>
        <strong>{label}</strong>
        <span>{meta}</span>
      </div>
    </div>
  );
}

export function ScoreItem({ label, value }) {
  return (
    <div className="score-item">
      <div>
        <strong>{label}</strong>
        <span>{value}점</span>
      </div>
      <ProgressBar value={value * 2.5} />
    </div>
  );
}
