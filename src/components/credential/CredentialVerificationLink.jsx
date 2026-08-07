import React from "react";
import { Link } from "react-router-dom";

export function getCredentialVerificationPath(credentialPublicId) {
  return `/verify/${encodeURIComponent(credentialPublicId)}`;
}

export function CredentialVerificationLink({
  credentialPublicId,
  children = "검증하기",
  className,
  onClick
}) {
  if (!credentialPublicId) {
    return null;
  }

  return (
    <Link
      className={className}
      to={getCredentialVerificationPath(credentialPublicId)}
      onClick={onClick}
      aria-label={`Credential ${credentialPublicId} 공개 검증`}
    >
      {children}
    </Link>
  );
}
