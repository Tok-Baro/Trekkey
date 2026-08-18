import test from "node:test";
import assert from "node:assert/strict";
import {
  TREKKEY_LEAF_DOMAIN,
  buildStandardMerkleTree,
  canonicalizeJson,
  createCredentialLeafHash,
  createTamperLabFixture,
  evaluateTamperScenario,
  getMerkleProof,
  processMerkleProof
} from "../src/lib/tamperLab.js";

test("canonical JSON sorts keys and normalizes strings to NFC", () => {
  assert.equal(
    canonicalizeJson({ z: "e\u0301", a: [2, { y: true, x: null }] }),
    '{"a":[2,{"x":null,"y":true}],"z":"é"}'
  );
});

test("Trekkey V1 leaf hash reproduces the committed OpenZeppelin fixture", () => {
  const leafHash = createCredentialLeafHash({
    issuerId: "0x1b4b60001d40d20639e89ae875fa01eaf1ccec9da59fc9c2b94f67a97e82f954",
    credentialIdHash: "0x2e15bc1a19cec0e1d152aae0114d7c04b9c59e482cf1982a864832cc3dbc63a4",
    schemaVersionHash: "0xa85859e4135243f8ef6848827fc78f57e621db32231756e8ba640b96e666012c",
    contentHash: "0xe7f3166da4dc7113539b2dc0f228502661429a2a96fa753a2d0a533d7bcf6b6f",
    fileManifestHash: "0xf1d7ed28735bd09ca4645a3a690d23b0017337d61134e1a61dca9655b7887814"
  });

  assert.equal(TREKKEY_LEAF_DOMAIN, "0x5d94c81e6ec3080e984cba1adb7df83a737c11ae46c6d9b02eb62d3ed54d58ed");
  assert.equal(leafHash, "0x4c8191808604541777eb904a4e9d74cc9b8c3d30c7b340b054a5ceddd1e8ede1");
});

test("complete tree layout and proofs reproduce the three-leaf fixture", () => {
  const leaves = [
    "0x1338f469bd08f99b51f4782f78ac5142678d31d39c9605e1b1f8768201001dab",
    "0xa665767d5576305d3083e03bfdf1ebe40178780a9e6059cb6d3f102aebc8f346",
    "0x448f4681b558c20128c85c39072e2872cac2053e66f69b018666cac9fba04dad"
  ];
  const tree = buildStandardMerkleTree(leaves);

  assert.equal(tree.root, "0x8865b8a4a1caf00acc8a6070d8c5e287378e4cf63b437f1882246473e3fe5668");
  leaves.forEach((leaf, index) => {
    assert.equal(processMerkleProof(leaf, getMerkleProof(tree, index)), tree.root);
  });
});

test("Tamper Lab distinguishes valid, tampered, revoked, and superseded states", async () => {
  const fixture = await createTamperLabFixture();
  const valid = await evaluateTamperScenario(fixture, "VALID");
  const tampered = await evaluateTamperScenario(fixture, "TAMPERED", "최우수상");
  const revoked = await evaluateTamperScenario(fixture, "REVOKED");
  const superseded = await evaluateTamperScenario(fixture, "SUPERSEDED");

  assert.equal(valid.verificationStatus, "VALID");
  assert.equal(valid.merkleProofMatches, true);
  assert.equal(tampered.verificationStatus, "TAMPERED");
  assert.equal(tampered.contentMatches, false);
  assert.equal(tampered.merkleProofMatches, false);
  assert.equal(revoked.verificationStatus, "REVOKED");
  assert.equal(revoked.merkleProofMatches, true);
  assert.equal(superseded.verificationStatus, "SUPERSEDED");
  assert.equal(superseded.replacementCredentialPublicId, "cred-demo-award-01-revision-2");
});
