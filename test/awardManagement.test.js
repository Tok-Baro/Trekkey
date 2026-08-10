import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateResults,
  confirmAwards,
  updateAwardCandidate
} from "../src/api/competitionApi.js";

function stateFixture() {
  const contestId = "contest-1";
  const roundId = "round-1";
  const submissions = [
    { id: "submission-a", contestId, teamId: "team-a", team: "A팀", review: "심사완료" },
    { id: "submission-b", contestId, teamId: "team-b", team: "B팀", review: "심사완료" },
    { id: "submission-c", contestId, teamId: "team-c", team: "C팀", review: "심사완료" }
  ];

  return {
    contestId,
    roundId,
    state: {
      contestRecords: [{
        id: contestId,
        awards: 2,
        evaluationRounds: [{ id: roundId, order: 1, name: "최종 심사" }]
      }],
      teamRecords: submissions.map((submission) => ({
        id: submission.teamId,
        contestId,
        name: submission.team,
        members: 2
      })),
      submissionRecords: submissions,
      reviewRecords: [
        { contestId, roundId, submissionId: "submission-a", scores: { total: 95 } },
        { contestId, roundId, submissionId: "submission-b", scores: { total: 90 } },
        { contestId, roundId, submissionId: "submission-c", scores: { total: 90 } }
      ],
      awardRecords: []
    }
  };
}

test("수상 컷의 동점자는 모두 포함하고 공동 순위를 부여한다", () => {
  const { state, contestId, roundId } = stateFixture();

  const result = calculateResults(state, contestId, roundId);

  assert.equal(result.ok, true);
  assert.deepEqual(result.state.awardRecords.map((award) => award.rank), [1, 2, 2]);
  assert.deepEqual(result.state.awardRecords.map((award) => award.jointRank), [false, true, true]);
  assert.deepEqual(
    result.state.awardRecords.map((award) => award.prize),
    ["대상", "최우수상", "최우수상"]
  );
  assert.equal(new Set(result.state.awardRecords.map((award) => award.certificateNo)).size, 3);
});

test("서버와 같이 소수 둘째 자리 점수로 동점을 판정한다", () => {
  const { state, contestId, roundId } = stateFixture();
  state.contestRecords[0].awards = 1;
  state.reviewRecords[0].scores = { total: 90.04 };
  state.reviewRecords[1].scores = { total: 90.01 };
  state.reviewRecords[2].scores = { total: 80 };

  const result = calculateResults(state, contestId, roundId);

  assert.equal(result.state.awardRecords.length, 1);
  assert.equal(result.state.awardRecords[0].teamId, "team-a");
  assert.equal(result.state.awardRecords[0].score, 90.04);
});

test("특별상과 총장상을 지정하고 후보를 보류할 수 있다", () => {
  const { state, contestId, roundId } = stateFixture();
  const calculated = calculateResults(state, contestId, roundId).state;
  const candidate = calculated.awardRecords[0];

  const special = updateAwardCandidate(calculated, candidate, {
    awardType: "SPECIAL",
    customPrize: "",
    status: "CANDIDATE"
  });
  assert.equal(special.state.awardRecords[0].prize, "특별상");

  const held = updateAwardCandidate(special.state, candidate, {
    awardType: "PRESIDENT_AWARD",
    customPrize: "",
    status: "HELD"
  });

  assert.equal(held.ok, true);
  assert.equal(held.state.awardRecords[0].prize, "총장상");
  assert.equal(held.state.awardRecords[0].status, "보류");

  const confirmation = confirmAwards(held.state, contestId);
  assert.equal(confirmation.ok, false);
  assert.match(confirmation.message, /보류 후보/);
});
