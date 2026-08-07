import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Blocks,
  ExternalLink,
  KeyRound,
  RefreshCcw,
  Search,
  ShieldCheck
} from "lucide-react";
import {
  approveBatch,
  approveStatusEvent,
  getBatchApproval,
  getStatusEventApproval,
  listBlockchainBatches,
  listBlockchainStatusEvents,
  listContestCredentials,
  listStudentCredentials,
  listTeamCredentials,
  reconcileBatch,
  reconcileStatusEvent,
  renewBatchApproval,
  renewStatusEventApproval,
  requestCredentialStatusChange,
  sealCredentialBatch,
  syncIssuerKey
} from "../../api/adminCredentialApi.js";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { ContestScopeBar, EmptyState, PanelHeader, StatusBadge } from "../../components/common/CommonUi.jsx";
import styles from "./CredentialsPage.module.scss";

const schemaProfiles = [
  {
    label: "참가 이력",
    value: "trekkey:participation:v1:jcs-rfc8785:unicode-nfc-1"
  },
  {
    label: "작품 이력",
    value: "trekkey:work:v1:jcs-rfc8785:unicode-nfc-1"
  },
  {
    label: "수상 이력",
    value: "trekkey:award:v1:jcs-rfc8785:unicode-nfc-1"
  }
];

const credentialTypeLabels = {
  PARTICIPATION: "참가 이력",
  WORK: "작품 이력",
  AWARD: "수상 이력"
};

const credentialStatusLabels = {
  READY: "발급 준비",
  BATCHED: "배치 포함",
  ANCHORED: "블록체인 기록 완료",
  REVOKED: "폐기",
  SUPERSEDED: "대체"
};

const credentialRoleLabels = {
  TEAM: "팀",
  REPRESENTATIVE: "대표자",
  PARTICIPANT: "참가자",
  AWARDEE: "수상자"
};

const batchStatusLabels = {
  SEALED: "서명 대기",
  SIGNED: "전송 대기",
  ANCHORING: "블록체인 기록 중",
  ANCHORED: "기록 완료",
  FAILED: "처리 실패"
};

const statusEventActionLabels = {
  REVOKED: "폐기",
  SUPERSEDED: "대체"
};

const transactionStatusLabels = {
  PENDING: "전송 대기",
  PREPARED: "전송 준비",
  SUBMITTED: "확인 대기",
  CONFIRMED: "처리 완료",
  UNKNOWN: "확인 필요",
  FAILED: "처리 실패"
};

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR");
}

function isApprovalExpired(deadline) {
  if (!deadline) {
    return false;
  }
  const timestamp = new Date(deadline).getTime();
  return !Number.isNaN(timestamp) && timestamp <= Date.now();
}

function getBatchProgress(batch) {
  if (batch.status === "SEALED" && isApprovalExpired(batch.approvalDeadline)) {
    return "승인 만료";
  }
  return batchStatusLabels[batch.status] ?? batch.status;
}

function normalizeCredential(item) {
  return {
    ...item,
    id: item.credentialPublicId,
    typeLabel: credentialTypeLabels[item.credentialType] ?? item.credentialType,
    statusLabel: credentialStatusLabels[item.status] ?? item.status,
    issuedAtLabel: formatDateTime(item.issuedAt)
  };
}

function getStatusEventProgress(event) {
  if (event.credentialStatus === event.nextStatus) {
    return "처리 완료";
  }
  if (!event.approved) {
    return isApprovalExpired(event.approvalDeadline) ? "승인 만료" : "서명 대기";
  }
  return transactionStatusLabels[event.transactionStatus] ?? "전송 대기";
}

function ApprovalCard({ title, approval, onCopy }) {
  if (!approval) {
    return (
      <div className={styles.approvalEmpty}>
        <ShieldCheck size={22} aria-hidden="true" />
        <strong>{title}</strong>
        <span>승인 정보를 조회하거나 새로 발급하면 서명 대상이 표시됩니다.</span>
      </div>
    );
  }

  return (
    <div className={styles.approvalCard}>
      <div className={styles.approvalHeader}>
        <div>
          <span>{title}</span>
          <strong>{approval.aggregateType} · {approval.aggregateId}</strong>
        </div>
        <button className="secondary-button" type="button" onClick={() => onCopy(approval.typedDataJson)}>
          서명 데이터 복사
        </button>
      </div>
      <dl className={styles.approvalMeta}>
        <div>
          <dt>Digest</dt>
          <dd>{approval.digestHex}</dd>
        </div>
        <div>
          <dt>Nonce</dt>
          <dd>{approval.approvalNonce}</dd>
        </div>
        <div>
          <dt>승인 기한</dt>
          <dd>{formatDateTime(approval.deadline)}</dd>
        </div>
      </dl>
      <details className={styles.typedData}>
        <summary>Typed data JSON 보기</summary>
        <pre>{approval.typedDataJson}</pre>
      </details>
    </div>
  );
}

export function CredentialsPage({
  contests,
  selectedContest,
  selectedContestId,
  setSelectedContestId,
  onOpenCredential,
  onNotify
}) {
  const requestVersion = useRef(0);
  const blockchainWorkRequestVersion = useRef(0);
  const actionInFlight = useRef(false);
  const [credentials, setCredentials] = useState([]);
  const [batches, setBatches] = useState([]);
  const [statusEvents, setStatusEvents] = useState([]);
  const [lookupCredentials, setLookupCredentials] = useState([]);
  const [lookupTitle, setLookupTitle] = useState("팀·학생 조회 결과");
  const [teamPublicId, setTeamPublicId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBlockchainWorkLoading, setIsBlockchainWorkLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const [error, setError] = useState("");
  const [blockchainWorkError, setBlockchainWorkError] = useState("");
  const [issuerForm, setIssuerForm] = useState({ keyVersion: "1", signerRef: "" });
  const [issuerKey, setIssuerKey] = useState(null);
  const [batchForm, setBatchForm] = useState({ schemaProfileId: schemaProfiles[0].value, keyVersion: "1" });
  const [batchPublicId, setBatchPublicId] = useState("");
  const [batch, setBatch] = useState(null);
  const [batchApproval, setBatchApproval] = useState(null);
  const [batchSignature, setBatchSignature] = useState("");
  const [statusForm, setStatusForm] = useState({
    credentialPublicId: "",
    action: "REVOKE",
    replacementCredentialPublicId: "",
    issuerKeyVersion: "1",
    reasonCode: "ADMIN_REQUEST",
    reasonDetail: ""
  });
  const [statusEventId, setStatusEventId] = useState("");
  const [statusApproval, setStatusApproval] = useState(null);
  const [statusSignature, setStatusSignature] = useState("");

  const displayedLookup = useMemo(() => lookupCredentials.map(normalizeCredential), [lookupCredentials]);
  const contestCredentials = useMemo(() => credentials.map(normalizeCredential), [credentials]);
  const selectedBatch = useMemo(
    () => batches.find((item) => item.publicId === batchPublicId),
    [batchPublicId, batches]
  );
  const selectedStatusEvent = useMemo(
    () => statusEvents.find((item) => String(item.id) === statusEventId),
    [statusEventId, statusEvents]
  );
  const batchApprovalExpired = isApprovalExpired(selectedBatch?.approvalDeadline);
  const canRenewBatch = Boolean(
    selectedBatch
    && batchApprovalExpired
    && ["SEALED", "FAILED"].includes(selectedBatch.status)
  );
  const canReconcileBatch = selectedBatch?.status === "FAILED";
  const canApproveBatch = selectedBatch?.status === "SEALED" && !batchApprovalExpired;
  const statusApprovalExpired = isApprovalExpired(selectedStatusEvent?.approvalDeadline);
  const canRenewStatusEvent = Boolean(
    selectedStatusEvent
    && selectedStatusEvent.credentialStatus !== selectedStatusEvent.nextStatus
    && statusApprovalExpired
    && (!selectedStatusEvent.approved || selectedStatusEvent.transactionStatus === "FAILED")
  );
  const canReconcileStatusEvent = Boolean(
    selectedStatusEvent
    && selectedStatusEvent.credentialStatus !== selectedStatusEvent.nextStatus
    && selectedStatusEvent.transactionStatus === "FAILED"
  );
  const canApproveStatusEvent = Boolean(
    selectedStatusEvent
    && selectedStatusEvent.credentialStatus !== selectedStatusEvent.nextStatus
    && !selectedStatusEvent.approved
    && !statusApprovalExpired
  );

  const loadCredentials = useCallback(async () => {
    if (!selectedContestId) {
      setCredentials([]);
      return;
    }

    const version = ++requestVersion.current;
    setIsLoading(true);
    setError("");
    try {
      const items = await listContestCredentials(selectedContestId);
      if (version === requestVersion.current) {
        setCredentials(items ?? []);
      }
    } catch (nextError) {
      if (version === requestVersion.current) {
        setError(getApiErrorMessage(nextError, "Credential 발급 현황을 불러오지 못했습니다."));
      }
    } finally {
      if (version === requestVersion.current) {
        setIsLoading(false);
      }
    }
  }, [selectedContestId]);

  const loadBlockchainWork = useCallback(async () => {
    const version = ++blockchainWorkRequestVersion.current;
    setIsBlockchainWorkLoading(true);
    setBlockchainWorkError("");
    try {
      const [batchResult, statusEventResult] = await Promise.allSettled([
        listBlockchainBatches(),
        listBlockchainStatusEvents()
      ]);
      if (version !== blockchainWorkRequestVersion.current) {
        return;
      }

      const errors = [];
      if (batchResult.status === "fulfilled") {
        const nextBatches = batchResult.value ?? [];
        setBatches(nextBatches);
        setBatchPublicId((current) => (
          current && nextBatches.some((item) => item.publicId === current)
            ? current
            : nextBatches[0]?.publicId ?? ""
        ));
      } else {
        errors.push(getApiErrorMessage(batchResult.reason, "배치 목록을 불러오지 못했습니다."));
      }

      if (statusEventResult.status === "fulfilled") {
        const nextStatusEvents = statusEventResult.value ?? [];
        setStatusEvents(nextStatusEvents);
        setStatusEventId((current) => (
          current && nextStatusEvents.some((item) => String(item.id) === current)
            ? current
            : String(nextStatusEvents[0]?.id ?? "")
        ));
      } else {
        errors.push(getApiErrorMessage(statusEventResult.reason, "상태 이벤트 목록을 불러오지 못했습니다."));
      }

      if (errors.length > 0) {
        setBlockchainWorkError(errors.join(" "));
      }
    } finally {
      if (version === blockchainWorkRequestVersion.current) {
        setIsBlockchainWorkLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadCredentials();

    return () => {
      requestVersion.current += 1;
    };
  }, [loadCredentials]);

  useEffect(() => {
    loadBlockchainWork();

    return () => {
      blockchainWorkRequestVersion.current += 1;
    };
  }, [loadBlockchainWork]);

  const runAction = async (key, action, successMessage, onSuccess) => {
    if (actionInFlight.current) {
      return null;
    }
    actionInFlight.current = true;
    setPendingAction(key);
    setError("");
    try {
      const result = await action();
      await onSuccess?.(result);
      if (successMessage) {
        onNotify?.(successMessage);
      }
      return result;
    } catch (nextError) {
      const message = getApiErrorMessage(nextError, "요청을 처리하지 못했습니다.");
      setError(message);
      onNotify?.(message);
      return null;
    } finally {
      actionInFlight.current = false;
      setPendingAction("");
    }
  };

  const copyTypedData = async (value) => {
    if (!value || !navigator.clipboard?.writeText) {
      onNotify?.("복사할 승인 데이터가 없습니다.");
      return;
    }
    await navigator.clipboard.writeText(value);
    onNotify?.("서명 데이터를 복사했습니다.");
  };

  const queryTeam = (event) => {
    event.preventDefault();
    const id = teamPublicId.trim();
    if (!id) {
      return;
    }
    runAction(
      "team-query",
      () => listTeamCredentials(id),
      "팀 Credential을 조회했습니다.",
      (items) => {
        setLookupTitle(`팀 ${id} 발급 이력`);
        setLookupCredentials(items ?? []);
      }
    );
  };

  const queryStudent = (event) => {
    event.preventDefault();
    const id = studentId.trim();
    if (!id) {
      return;
    }
    runAction(
      "student-query",
      () => listStudentCredentials(id),
      "학생 Credential을 조회했습니다.",
      (items) => {
        setLookupTitle(`학번 ${id} 발급 이력`);
        setLookupCredentials(items ?? []);
      }
    );
  };

  const selectCredentialForStatusChange = (credentialPublicId) => {
    setStatusForm((current) => ({ ...current, credentialPublicId }));
    document.getElementById("credential-status-workflow")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectBatchWork = (publicId) => {
    setBatchPublicId(publicId);
    setBatchApproval(null);
    setBatchSignature("");
  };

  const selectStatusEventWork = (eventId) => {
    setStatusEventId(eventId);
    setStatusApproval(null);
    setStatusSignature("");
  };

  const createStatusEvent = (event) => {
    event.preventDefault();
    const request = {
      action: statusForm.action,
      replacementCredentialPublicId: statusForm.action === "SUPERSEDE"
        ? statusForm.replacementCredentialPublicId.trim()
        : null,
      issuerKeyVersion: Number(statusForm.issuerKeyVersion),
      reasonCode: statusForm.reasonCode.trim().toUpperCase(),
      reasonDetail: statusForm.reasonDetail.trim() || null
    };
    runAction(
      "status-create",
      () => requestCredentialStatusChange(statusForm.credentialPublicId.trim(), request),
      "Credential 상태 변경 승인을 생성했습니다.",
      async (approval) => {
        setStatusApproval(approval);
        setStatusEventId(String(approval.aggregateId));
        await loadBlockchainWork();
      }
    );
  };

  return (
    <div className={styles.layout}>
      <ContestScopeBar
        contests={contests}
        selectedContest={selectedContest}
        selectedContestId={selectedContestId}
        setSelectedContestId={setSelectedContestId}
      />

      {(error || blockchainWorkError) && (
        <div className={styles.errorBanner} role="alert">{error || blockchainWorkError}</div>
      )}

      <section className={`${styles.hero} wide`}>
        <div>
          <span className={styles.eyebrow}>검증 가능한 활동 원장</span>
          <h2>Credential 발급과 블록체인 기록</h2>
          <p>대회에서 확정된 참가·작품·수상 이력을 확인하고 학교 승인 서명을 거쳐 검증 가능한 기록으로 전환합니다.</p>
        </div>
        <dl>
          <div>
            <dt>전체</dt>
            <dd>{contestCredentials.length}</dd>
          </div>
          <div>
            <dt>기록 완료</dt>
            <dd>{contestCredentials.filter((item) => item.status === "ANCHORED").length}</dd>
          </div>
          <div>
            <dt>처리 필요</dt>
            <dd>{contestCredentials.filter((item) => ["READY", "BATCHED"].includes(item.status)).length}</dd>
          </div>
        </dl>
      </section>

      <section className="panel wide">
        <PanelHeader
          title={`${selectedContest.title} Credential`}
          action={
            <div className={styles.headerActions}>
              <span className={styles.loadingText}>
                {isLoading ? "불러오는 중..." : `${contestCredentials.length}건`}
              </span>
              <button
                className="secondary-button"
                type="button"
                disabled={isLoading || isBlockchainWorkLoading || Boolean(pendingAction)}
                onClick={() => {
                  loadCredentials();
                  loadBlockchainWork();
                }}
              >
                <RefreshCcw size={15} /> 새로고침
              </button>
            </div>
          }
        />
        <CredentialTable
          credentials={contestCredentials}
          emptyTitle="발급된 Credential이 없습니다"
          onOpenCredential={onOpenCredential}
          onSelectStatusChange={selectCredentialForStatusChange}
        />
      </section>

      <section className="panel">
        <PanelHeader title="팀·학생 발급 이력 조회" />
        <div className={styles.lookupForms}>
          <form onSubmit={queryTeam}>
            <label>
              <span>팀 공개 ID</span>
              <input value={teamPublicId} onChange={(event) => setTeamPublicId(event.target.value)} required />
            </label>
            <button className="secondary-button" type="submit" disabled={Boolean(pendingAction)}>
              <Search size={16} /> 팀 조회
            </button>
          </form>
          <form onSubmit={queryStudent}>
            <label>
              <span>학번</span>
              <input value={studentId} onChange={(event) => setStudentId(event.target.value)} required />
            </label>
            <button className="secondary-button" type="submit" disabled={Boolean(pendingAction)}>
              <Search size={16} /> 학생 조회
            </button>
          </form>
        </div>
      </section>

      <section className="panel">
        <PanelHeader title={lookupTitle} />
        <CredentialTable
          credentials={displayedLookup}
          emptyTitle="조회 결과가 없습니다"
          compact
          onOpenCredential={onOpenCredential}
          onSelectStatusChange={selectCredentialForStatusChange}
        />
      </section>

      <section className="panel">
        <PanelHeader title="1. 학교 발급 키 동기화" />
        <form
          className={styles.operationForm}
          onSubmit={(event) => {
            event.preventDefault();
            runAction(
              "issuer-sync",
              () => syncIssuerKey(Number(issuerForm.keyVersion), issuerForm.signerRef.trim()),
              "학교 발급 키를 동기화했습니다.",
              setIssuerKey
            );
          }}
        >
          <div className={styles.fieldRow}>
            <label>
              <span>키 버전</span>
              <input type="number" min="1" value={issuerForm.keyVersion} onChange={(event) => setIssuerForm((current) => ({ ...current, keyVersion: event.target.value }))} required />
            </label>
            <label>
              <span>Signer 참조</span>
              <input value={issuerForm.signerRef} onChange={(event) => setIssuerForm((current) => ({ ...current, signerRef: event.target.value }))} placeholder="school-kms:key-1" required />
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={Boolean(pendingAction)}>
            <KeyRound size={16} /> {pendingAction === "issuer-sync" ? "동기화 중..." : "발급 키 동기화"}
          </button>
        </form>
        {issuerKey && (
          <dl className={styles.resultGrid}>
            <div><dt>버전</dt><dd>{issuerKey.keyVersion}</dd></div>
            <div><dt>Signer</dt><dd>{issuerKey.signerAddress}</dd></div>
            <div><dt>상태</dt><dd>{issuerKey.status}</dd></div>
            <div><dt>유효 시작</dt><dd>{formatDateTime(issuerKey.validFrom)}</dd></div>
          </dl>
        )}
      </section>

      <section className="panel">
        <PanelHeader title="2. Merkle 배치 생성" />
        <form
          className={styles.operationForm}
          onSubmit={(event) => {
            event.preventDefault();
            runAction(
              "batch-seal",
              () => sealCredentialBatch({ ...batchForm, keyVersion: Number(batchForm.keyVersion) }),
              "Credential 배치를 생성했습니다.",
              async (result) => {
                setBatch(result);
                setBatchPublicId(result.publicId);
                setBatchApproval(null);
                await Promise.all([loadCredentials(), loadBlockchainWork()]);
              }
            );
          }}
        >
          <div className={styles.fieldRow}>
            <label>
              <span>Schema profile</span>
              <select value={batchForm.schemaProfileId} onChange={(event) => setBatchForm((current) => ({ ...current, schemaProfileId: event.target.value }))}>
                {schemaProfiles.map((profile) => <option key={profile.value} value={profile.value}>{profile.label}</option>)}
              </select>
            </label>
            <label>
              <span>키 버전</span>
              <input type="number" min="1" value={batchForm.keyVersion} onChange={(event) => setBatchForm((current) => ({ ...current, keyVersion: event.target.value }))} required />
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={Boolean(pendingAction)}>
            <Blocks size={16} /> {pendingAction === "batch-seal" ? "생성 중..." : "READY 기록 배치 생성"}
          </button>
        </form>
        {batch && (
          <dl className={styles.resultGrid}>
            <div><dt>배치 ID</dt><dd>{batch.publicId}</dd></div>
            <div><dt>상태</dt><dd>{batch.status}</dd></div>
            <div><dt>Leaf</dt><dd>{batch.leafCount}건</dd></div>
            <div><dt>Merkle root</dt><dd>{batch.merkleRoot}</dd></div>
          </dl>
        )}
      </section>

      <section className="panel wide">
        <PanelHeader title="3. 배치 승인·전송 복구" />
        <div className={styles.workflowGrid}>
          <div className={styles.workflowControls}>
            <label>
              <span>처리할 배치</span>
              <select
                value={batchPublicId}
                disabled={isBlockchainWorkLoading || Boolean(pendingAction)}
                onChange={(event) => selectBatchWork(event.target.value)}
              >
                <option value="">{isBlockchainWorkLoading ? "배치 목록을 불러오는 중..." : "배치를 선택하세요"}</option>
                {batches.map((item) => (
                  <option key={item.publicId} value={item.publicId}>
                    {item.publicId} · {getBatchProgress(item)} · {item.leafCount}건
                  </option>
                ))}
              </select>
            </label>
            {selectedBatch && (
              <dl className={styles.resultGrid}>
                <div><dt>배치 ID</dt><dd>{selectedBatch.publicId}</dd></div>
                <div><dt>처리 상태</dt><dd>{getBatchProgress(selectedBatch)}</dd></div>
                <div><dt>Credential</dt><dd>{selectedBatch.leafCount}건</dd></div>
                <div><dt>승인 기한</dt><dd>{formatDateTime(selectedBatch.approvalDeadline)}</dd></div>
              </dl>
            )}
            <div className={styles.buttonRow}>
              <button className="secondary-button" type="button" disabled={!batchPublicId || pendingAction} onClick={() => runAction("batch-approval", () => getBatchApproval(batchPublicId), "배치 승인 정보를 조회했습니다.", setBatchApproval)}>
                승인 조회
              </button>
              <button className="secondary-button" type="button" disabled={!canRenewBatch || Boolean(pendingAction)} onClick={() => runAction("batch-renew", () => renewBatchApproval(batchPublicId), "배치 승인 기한을 갱신했습니다.", async (approval) => {
                setBatchApproval(approval);
                await loadBlockchainWork();
              })}>
                <RefreshCcw size={15} /> 승인 갱신
              </button>
              <button className="secondary-button" type="button" disabled={!canReconcileBatch || Boolean(pendingAction)} onClick={() => runAction("batch-reconcile", () => reconcileBatch(batchPublicId), "배치 상태를 온체인 결과와 동기화했습니다.", async (result) => {
                setBatch(result);
                await Promise.all([loadCredentials(), loadBlockchainWork()]);
              })}>
                정합성 복구
              </button>
            </div>
            <form
              className={styles.signatureForm}
              onSubmit={(event) => {
                event.preventDefault();
                const signature = batchSignature.trim();
                if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) {
                  setError("Issuer 서명은 0x로 시작하는 65바이트 hex 값이어야 합니다.");
                  return;
                }
                runAction("batch-approve", () => approveBatch(batchPublicId, signature), "배치 승인을 제출했습니다.", async (result) => {
                  setBatch(result);
                  await Promise.all([loadCredentials(), loadBlockchainWork()]);
                });
              }}
            >
              <label>
                <span>Issuer 서명</span>
                <textarea value={batchSignature} onChange={(event) => setBatchSignature(event.target.value)} placeholder="0x로 시작하는 65바이트 서명" required />
              </label>
              <button className="primary-button" type="submit" disabled={!canApproveBatch || Boolean(pendingAction)}>
                <BadgeCheck size={16} /> 서명 승인 제출
              </button>
            </form>
          </div>
          <ApprovalCard title="배치 EIP-712 승인" approval={batchApproval} onCopy={copyTypedData} />
        </div>
      </section>

      <section className="panel wide" id="credential-status-workflow">
        <PanelHeader title="4. Credential 폐기·대체" />
        <div className={styles.workflowGrid}>
          <form className={styles.operationForm} onSubmit={createStatusEvent}>
            <div className={styles.fieldRow}>
              <label>
                <span>Credential 공개 ID</span>
                <input value={statusForm.credentialPublicId} onChange={(event) => setStatusForm((current) => ({ ...current, credentialPublicId: event.target.value }))} required />
              </label>
              <label>
                <span>처리</span>
                <select value={statusForm.action} onChange={(event) => setStatusForm((current) => ({ ...current, action: event.target.value }))}>
                  <option value="REVOKE">폐기</option>
                  <option value="SUPERSEDE">대체</option>
                </select>
              </label>
            </div>
            {statusForm.action === "SUPERSEDE" && (
              <label>
                <span>대체 Credential 공개 ID</span>
                <input value={statusForm.replacementCredentialPublicId} onChange={(event) => setStatusForm((current) => ({ ...current, replacementCredentialPublicId: event.target.value }))} required />
              </label>
            )}
            <div className={styles.fieldRow}>
              <label>
                <span>Issuer 키 버전</span>
                <input type="number" min="1" value={statusForm.issuerKeyVersion} onChange={(event) => setStatusForm((current) => ({ ...current, issuerKeyVersion: event.target.value }))} required />
              </label>
              <label>
                <span>사유 코드</span>
                <input value={statusForm.reasonCode} onChange={(event) => setStatusForm((current) => ({ ...current, reasonCode: event.target.value }))} pattern="[A-Za-z0-9_]{1,64}" required />
              </label>
            </div>
            <label>
              <span>상세 사유</span>
              <textarea value={statusForm.reasonDetail} onChange={(event) => setStatusForm((current) => ({ ...current, reasonDetail: event.target.value }))} />
            </label>
            <button className="primary-button" type="submit" disabled={Boolean(pendingAction)}>
              상태 변경 승인 생성
            </button>
          </form>
          <ApprovalCard title="상태 변경 EIP-712 승인" approval={statusApproval} onCopy={copyTypedData} />
        </div>

        <div className={styles.statusOperations}>
          <label>
            <span>처리할 상태 이벤트</span>
            <select
              value={statusEventId}
              disabled={isBlockchainWorkLoading || Boolean(pendingAction)}
              onChange={(event) => selectStatusEventWork(event.target.value)}
            >
              <option value="">{isBlockchainWorkLoading ? "상태 이벤트를 불러오는 중..." : "상태 이벤트를 선택하세요"}</option>
              {statusEvents.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  #{item.id} · {item.credentialNo ?? item.credentialPublicId} · {statusEventActionLabels[item.nextStatus] ?? item.nextStatus} · {getStatusEventProgress(item)}
                </option>
              ))}
            </select>
          </label>
          {selectedStatusEvent && (
            <dl className={styles.resultGrid}>
              <div><dt>이벤트 ID</dt><dd>#{selectedStatusEvent.id}</dd></div>
              <div><dt>처리 상태</dt><dd>{getStatusEventProgress(selectedStatusEvent)}</dd></div>
              <div><dt>Credential</dt><dd>{selectedStatusEvent.credentialNo ?? selectedStatusEvent.credentialPublicId}</dd></div>
              <div><dt>상태 변경</dt><dd>{statusEventActionLabels[selectedStatusEvent.nextStatus] ?? selectedStatusEvent.nextStatus}</dd></div>
              <div><dt>사유</dt><dd>{selectedStatusEvent.reasonCode}</dd></div>
              <div><dt>승인 기한</dt><dd>{formatDateTime(selectedStatusEvent.approvalDeadline)}</dd></div>
              {selectedStatusEvent.lastErrorCode && (
                <div><dt>최근 오류</dt><dd>{selectedStatusEvent.lastErrorCode}</dd></div>
              )}
            </dl>
          )}
          <div className={styles.buttonRow}>
            <button className="secondary-button" type="button" disabled={!statusEventId || pendingAction} onClick={() => runAction("status-approval", () => getStatusEventApproval(statusEventId), "상태 변경 승인 정보를 조회했습니다.", setStatusApproval)}>
              승인 조회
            </button>
            <button className="secondary-button" type="button" disabled={!canRenewStatusEvent || Boolean(pendingAction)} onClick={() => runAction("status-renew", () => renewStatusEventApproval(statusEventId), "상태 변경 승인 기한을 갱신했습니다.", async (approval) => {
              setStatusApproval(approval);
              await loadBlockchainWork();
            })}>
              <RefreshCcw size={15} /> 승인 갱신
            </button>
            <button className="secondary-button" type="button" disabled={!canReconcileStatusEvent || Boolean(pendingAction)} onClick={() => runAction("status-reconcile", () => reconcileStatusEvent(statusEventId), "상태 변경 결과를 온체인 상태와 동기화했습니다.", () => Promise.all([loadCredentials(), loadBlockchainWork()]))}>
              정합성 복구
            </button>
          </div>
          <form
            className={styles.signatureInline}
            onSubmit={(event) => {
              event.preventDefault();
              runAction("status-approve", () => approveStatusEvent(statusEventId, statusSignature.trim()), "상태 변경 서명을 제출했습니다.", () => Promise.all([loadCredentials(), loadBlockchainWork()]));
            }}
          >
            <input value={statusSignature} onChange={(event) => setStatusSignature(event.target.value)} placeholder="0x로 시작하는 상태 변경 서명" pattern="0x[0-9a-fA-F]{130}" required />
            <button className="primary-button" type="submit" disabled={!canApproveStatusEvent || Boolean(pendingAction)}>
              서명 승인 제출
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function CredentialTable({ credentials, emptyTitle, compact = false, onOpenCredential, onSelectStatusChange }) {
  if (credentials.length === 0) {
    return <EmptyState title={emptyTitle} description="대회 운영 단계가 확정되면 참가·작품·수상 이력이 자동 발급됩니다." />;
  }

  return (
    <div className={`${styles.tableWrap} ${compact ? styles.tableCompact : ""}`}>
      <table>
        <thead>
          <tr>
            <th>번호</th>
            <th>유형</th>
            <th>팀·대상</th>
            <th>발급일</th>
            <th>상태</th>
            <th aria-label="작업" />
          </tr>
        </thead>
        <tbody>
          {credentials.map((credential) => (
            <tr key={credential.id}>
              <td data-label="번호">
                <strong>{credential.credentialNo}</strong>
                <span>{credential.id}</span>
              </td>
              <td data-label="유형">{credential.typeLabel}</td>
              <td data-label="팀·대상">
                <div className={styles.subjectCell}>
                  <strong>{credential.teamName ?? credential.displayName ?? "-"}</strong>
                  {(credential.contestTitle || credential.roleCode) && (
                    <span>
                      {[credential.contestTitle, credentialRoleLabels[credential.roleCode] ?? credential.roleCode]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </div>
              </td>
              <td data-label="발급일">{credential.issuedAtLabel}</td>
              <td data-label="상태"><StatusBadge status={credential.statusLabel} /></td>
              <td data-label="작업">
                <div className={styles.rowActions}>
                  <button className="secondary-button" type="button" onClick={() => onOpenCredential?.(credential.id)}>
                    <ExternalLink size={15} /> 검증
                  </button>
                  {!["REVOKED", "SUPERSEDED"].includes(credential.status) && (
                    <button className="secondary-button" type="button" onClick={() => onSelectStatusChange?.(credential.id)}>
                      상태 변경
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
