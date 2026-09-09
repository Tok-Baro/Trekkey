const HEX_32 = /^0x[0-9a-fA-F]{64}$/;
const HEX_20 = /^0x[0-9a-fA-F]{40}$/;
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const NETWORKS = new Set(["testnet", "devnet", "mainnet", "localnet"]);

export function isHash32(value) {
  return typeof value === "string" && HEX_32.test(value);
}

export function isObjectId(value) {
  return isHash32(value) && !/^0x0{64}$/.test(value);
}

export function isSuiDigest(value) {
  if (typeof value !== "string" || value.length < 32 || value.length > 44) return false;
  let decoded = 0n;
  for (const character of value) {
    const digit = BASE58.indexOf(character);
    if (digit < 0) return false;
    decoded = decoded * 58n + BigInt(digit);
  }
  let bytes = 0;
  for (let remaining = decoded; remaining > 0n; remaining >>= 8n) bytes++;
  const leadingZeroes = value.match(/^1*/)[0].length;
  return bytes + leadingZeroes === 32 && decoded !== 0n;
}

function sequence(value) {
  if (typeof value === "number") return Number.isSafeInteger(value) && value >= 0;
  return typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)
    && BigInt(value) <= 18446744073709551615n;
}

function sameOptional(value, expected, normalize = String) {
  return value === null || value === undefined || normalize(value) === normalize(expected);
}

const lower = value => String(value).toLowerCase();

/** Validate API coordinates, not chain finality. The browser does not make its own RPC request. */
export function normalizeBlockchainEvidence(evidence = {}) {
  const metadata = evidence?.blockchain;
  const hasMetadata = metadata !== null && metadata !== undefined;
  const provider = hasMetadata ? metadata?.provider : "KAIA";
  const base = { provider, recorded: false, networkLabel: "확인되지 않은 네트워크", explorerUrl: "", reason: "공개 기록 좌표가 없거나 지원하지 않는 형식입니다." };
  if (provider === "SUI") {
    const chain = {
      ...base, network: metadata.network, chainIdentifier: metadata.chainIdentifier,
      packageId: metadata.packageId, registryObjectId: metadata.registryObjectId,
      transactionId: metadata.transactionDigest, sequenceNumber: metadata.checkpointSequenceNumber,
      checkpointDigest: metadata.checkpointDigest, approvalScheme: metadata.approvalScheme,
      sequenceLabel: "체크포인트", addressLabel: "패키지", address: metadata.packageId
    };
    const supported = NETWORKS.has(chain.network);
    chain.networkLabel = supported ? `Sui ${({ testnet: "테스트넷", devnet: "개발넷", mainnet: "메인넷", localnet: "로컬넷" })[chain.network]}` : base.networkLabel;
    chain.recorded = Boolean(supported
      && /^[0-9a-fA-F]{8}$/.test(chain.chainIdentifier ?? "")
      && isObjectId(chain.packageId) && isObjectId(chain.registryObjectId)
      && isSuiDigest(chain.transactionId) && sequence(chain.sequenceNumber)
      && isSuiDigest(chain.checkpointDigest)
      && chain.approvalScheme === "TREKKEY_SUI_APPROVAL_V1"
      && evidence.batchPublicId
      && sameOptional(evidence.chainId, 0)
      && sameOptional(evidence.contractAddress, chain.packageId, lower)
      && sameOptional(evidence.transactionHash, chain.transactionId)
      && sameOptional(evidence.blockNumber, chain.sequenceNumber));
    if (chain.recorded) {
      chain.reason = "Sui 기록 좌표 형식과 호환 필드가 일치합니다.";
      if (chain.network !== "localnet") chain.explorerUrl = `https://suiscan.xyz/${chain.network}/tx/${chain.transactionId}`;
    }
    return chain;
  }
  if (provider !== "KAIA") return base;
  const chainId = Number(evidence.chainId);
  const expectedNetwork = chainId === 1001 ? "kairos" : chainId === 8217 ? "mainnet" : null;
  const chain = {
    ...base, provider: "KAIA", chainId, network: expectedNetwork,
    transactionId: evidence.transactionHash, sequenceNumber: evidence.blockNumber,
    sequenceLabel: "블록 번호", addressLabel: "컨트랙트", address: evidence.contractAddress,
    approvalScheme: hasMetadata ? metadata.approvalScheme : "EIP712_V1",
    networkLabel: chainId === 1001 ? "Kaia Kairos 테스트넷" : chainId === 8217 ? "Kaia 메인넷" : base.networkLabel
  };
  const metadataMatches = !hasMetadata || (metadata.network === expectedNetwork
    && metadata.approvalScheme === "EIP712_V1"
    && [metadata.chainIdentifier, metadata.packageId, metadata.registryObjectId,
      metadata.transactionDigest, metadata.checkpointSequenceNumber, metadata.checkpointDigest].every(value => value == null));
  chain.recorded = Boolean(expectedNetwork && metadataMatches && HEX_20.test(chain.address ?? "")
    && !/^0x0{40}$/.test(chain.address) && isHash32(chain.transactionId)
    && !/^0x0{64}$/.test(chain.transactionId) && sequence(chain.sequenceNumber) && evidence.batchPublicId);
  if (chain.recorded) {
    chain.reason = "Kaia 기록 좌표 형식이 확인되었습니다.";
    chain.explorerUrl = `${chainId === 1001 ? "https://kairos.kaiascan.io" : "https://kaiascan.io"}/tx/${chain.transactionId}`;
  }
  return chain;
}

export function isChainStatusConfirmed(status) {
  return ["VALID", "REVOKED", "SUPERSEDED", "EXPIRED"].includes(status);
}
