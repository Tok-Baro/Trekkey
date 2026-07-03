import { useEffect, useMemo, useState } from "react";
import {
  addJudge,
  addSubmission,
  applyContest,
  batchAssignJudges,
  calculateResults,
  confirmAwards,
  createInitialCompetitionState,
  deleteJudge,
  generateSubmissionHashes,
  persistCompetitionState,
  recordContestView,
  saveContest,
  sendReviewReminders,
  submitJudgeReview,
  toggleContestLike,
  updateJudge,
  updateParticipantApplication,
  upsertParticipantSubmission,
  updateTeamStatus
} from "../api/competitionApi.js";
import { contests } from "../data/competitionData.js";
import { getContestWithPublicFields } from "../lib/contest.js";

export function useCompetitionStore() {
  const [state, setState] = useState(() => createInitialCompetitionState());
  const [selectedContestId, setSelectedContestId] = useState(() => contests[0].id);

  const selectedContest = useMemo(() => {
    const contest = state.contestRecords.find((item) => item.id === selectedContestId) ?? state.contestRecords[0] ?? contests[0];
    return getContestWithPublicFields(contest);
  }, [selectedContestId, state.contestRecords]);

  useEffect(() => {
    persistCompetitionState(state);
  }, [state]);

  const runMutation = (mutate, options = {}) => {
    const result = mutate(state);
    if (result.state !== state) {
      setState(result.state);
    }
    if (result.selectedContestId) {
      setSelectedContestId(result.selectedContestId);
    }
    options.onDone?.(result);
    return result;
  };

  return {
    ...state,
    selectedContest,
    selectedContestId,
    setSelectedContestId,
    saveContest: (form, options) => runMutation((current) => saveContest(current, form), options),
    applyContest: (form, session, options) => runMutation((current) => applyContest(current, form, session), options),
    recordContestView: (contestId, session, options) =>
      runMutation((current) => recordContestView(current, contestId, session), options),
    toggleContestLike: (contestId, session, options) =>
      runMutation((current) => toggleContestLike(current, contestId, session), options),
    updateParticipantApplication: (teamId, patch, options) =>
      runMutation((current) => updateParticipantApplication(current, teamId, patch), options),
    upsertParticipantSubmission: (contestId, teamId, form, options) =>
      runMutation((current) => upsertParticipantSubmission(current, contestId, teamId, form), options),
    updateTeamStatus: (teamId, status, options) =>
      runMutation((current) => updateTeamStatus(current, teamId, status), options),
    addSubmission: (form, options) => runMutation((current) => addSubmission(current, selectedContest, form), options),
    generateSubmissionHashes: (contestId, options) =>
      runMutation((current) => generateSubmissionHashes(current, contestId), options),
    addJudge: (form, options) => runMutation((current) => addJudge(current, selectedContest, form), options),
    updateJudge: (form, options) => runMutation((current) => updateJudge(current, form), options),
    deleteJudge: (judgeId, options) => runMutation((current) => deleteJudge(current, judgeId), options),
    batchAssignJudges: (contestId, roundId, options) => runMutation((current) => batchAssignJudges(current, contestId, roundId), options),
    sendReviewReminders: (contestId, roundId, options) =>
      runMutation((current) => sendReviewReminders(current, contestId, roundId), options),
    submitJudgeReview: (payload, options) => runMutation((current) => submitJudgeReview(current, payload), options),
    calculateResults: (contestId, roundId, options) => runMutation((current) => calculateResults(current, contestId, roundId), options),
    confirmAwards: (contestId, options) => runMutation((current) => confirmAwards(current, contestId), options)
  };
}
