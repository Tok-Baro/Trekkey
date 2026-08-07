import { useCallback, useEffect, useState } from "react";
import {
  createRootAdminInvitation,
  decideRootAdminApproval,
  listRootAdminApprovals,
  listRootAdminInvitations,
  revokeRootAdminInvitation
} from "../api/rootAdminBackendApi.js";

export function useRootAdminData({ enabled = true } = {}) {
  const [invitations, setInvitations] = useState([]);
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [nextInvitations, nextPendingAdmins] = await Promise.all([
        listRootAdminInvitations(),
        listRootAdminApprovals()
      ]);
      setInvitations(nextInvitations ?? []);
      setPendingAdmins(nextPendingAdmins ?? []);
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  const createInvitation = useCallback(async (email) => {
    const created = await createRootAdminInvitation(email);
    setInvitations((current) => [
      created,
      ...current.filter((invitation) => invitation.id !== created.id)
    ]);
    return created;
  }, []);

  const revokeInvitation = useCallback(async (invitationId) => {
    await revokeRootAdminInvitation(invitationId);
    setInvitations((current) => current.map((invitation) =>
      invitation.id === invitationId
        ? { ...invitation, status: "REVOKED", inviteUrl: null }
        : invitation
    ));
  }, []);

  const decideApproval = useCallback(async (userId, approve) => {
    const decided = await decideRootAdminApproval(userId, approve);
    setPendingAdmins((current) => current.filter((admin) => admin.userId !== userId));
    return decided;
  }, []);

  return {
    invitations,
    pendingAdmins,
    isLoading,
    error,
    reload,
    createInvitation,
    revokeInvitation,
    decideApproval
  };
}
