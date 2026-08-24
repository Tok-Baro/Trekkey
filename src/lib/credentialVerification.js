const VERIFY_PATH = /\/verify\/([^/?#]+)/i;

export function normalizeCredentialInput(value) {
  const input = String(value ?? "").trim();
  if (!input) {
    return "";
  }

  const pathMatch = input.match(VERIFY_PATH);
  const candidate = pathMatch?.[1] ?? input.replace(/^#/, "");

  try {
    return decodeURIComponent(candidate).trim();
  } catch {
    return candidate.trim();
  }
}

export function buildExplorerUrl(chainId, transactionHash) {
  if (!transactionHash) {
    return "";
  }
  if (Number(chainId) === 1001) {
    return `https://kairos.kaiascan.io/tx/${transactionHash}`;
  }
  if (Number(chainId) === 8217) {
    return `https://kaiascan.io/tx/${transactionHash}`;
  }
  return "";
}

export function verificationSummary(evidence = {}) {
  const contentMatches = [
    evidence.canonicalPayloadMatches,
    evidence.contentHashMatches,
    evidence.fileManifestHashMatches,
    evidence.credentialClaimsMatch,
    evidence.credentialIdMatches
  ].every(Boolean);

  return [
    {
      key: "issuer",
      label: "발급기관 확인",
      description: "학교가 발급한 증명서인지 확인했습니다.",
      passed: Boolean(evidence.issuerId)
    },
    {
      key: "content",
      label: "발급 내용 일치",
      description: "발급 후 내용이 바뀌지 않았습니다.",
      passed: contentMatches
    },
    {
      key: "external",
      label: "외부 기록 확인",
      description: "공개 Proof와 체인 기록 메타데이터를 확인했습니다.",
      passed: Boolean(evidence.merkleProofMatches && evidence.transactionHash)
    }
  ];
}

export function getVerificationPresentation(status, issuerName = "발급기관") {
  const presentations = {
    VALID: {
      label: "검증 완료",
      headline: `${issuerName}가 발급한 유효한 증명서입니다`,
      description: "발급 내용과 외부 등록 기록이 모두 일치합니다.",
      tone: "success"
    },
    PENDING: {
      label: "등록 확인 중",
      headline: "발급된 증명서이며 외부 등록을 기다리고 있습니다",
      description: "학교 발급 정보는 확인됐지만 공개 기록 등록이 아직 완료되지 않았습니다.",
      tone: "pending"
    },
    REVOKED: {
      label: "사용할 수 없음",
      headline: "발급기관이 취소한 증명서입니다",
      description: "현재 효력이 없으므로 제출 증빙으로 사용하면 안 됩니다.",
      tone: "danger"
    },
    SUPERSEDED: {
      label: "새 증명서로 대체됨",
      headline: "더 최신인 증명서가 발급되었습니다",
      description: "아래의 새 증명서 링크에서 최신 내용을 확인해 주세요.",
      tone: "warning"
    },
    EXPIRED: {
      label: "유효기간 만료",
      headline: "유효기간이 지난 증명서입니다",
      description: "발급 내용은 확인됐지만 현재 유효한 증빙으로 사용할 수 없습니다.",
      tone: "warning"
    },
    TAMPERED: {
      label: "검증 실패",
      headline: "발급 내용이 원래 기록과 일치하지 않습니다",
      description: "이 증명서는 사용하지 말고 발급기관에 문의해 주세요.",
      tone: "danger"
    },
    ANCHOR_NOT_FOUND: {
      label: "외부 기록 없음",
      headline: "대조할 공개 기록을 찾지 못했습니다",
      description: "검증이 완료될 때까지 이 증명서를 사용하지 않는 것이 안전합니다.",
      tone: "danger"
    },
    ISSUER_INVALID: {
      label: "발급기관 확인 실패",
      headline: "유효한 발급기관 기록을 확인하지 못했습니다",
      description: "이 증명서는 사용하지 말고 발급기관에 문의해 주세요.",
      tone: "danger"
    },
    RPC_UNAVAILABLE: {
      label: "확인 지연",
      headline: "현재 외부 등록 기록을 확인할 수 없습니다",
      description: "잠시 후 다시 확인해 주세요. 증명서 자체가 취소된 것은 아닙니다.",
      tone: "pending"
    },
    BLOCKCHAIN_CONFIGURATION_ERROR: {
      label: "검증 환경 오류",
      headline: "현재 검증 서비스를 사용할 수 없습니다",
      description: "서비스 관리자에게 문의해 주세요.",
      tone: "danger"
    },
    SCHEMA_UNSUPPORTED: {
      label: "지원하지 않는 형식",
      headline: "현재 서비스에서 확인할 수 없는 증명서입니다",
      description: "발급기관에 최신 증명서 발급 여부를 문의해 주세요.",
      tone: "warning"
    }
  };

  return presentations[status] ?? {
    label: "상태 확인 필요",
    headline: "증명서 상태를 확인할 수 없습니다",
    description: "잠시 후 다시 확인하거나 발급기관에 문의해 주세요.",
    tone: "pending"
  };
}
