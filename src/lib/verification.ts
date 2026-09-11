import { EmailVerification, VerificationStatus } from "@/types";

export interface AuthenticityCheckResult {
  score: number;
  spfResult: VerificationStatus;
  dkimResult: VerificationStatus;
  dmarcResult: VerificationStatus;
  mxRecordExists: boolean;
  smtpCheckValid: boolean;
  riskFlags: string[];
  details: Record<string, unknown>;
}

export function evaluateSenderAuthenticity(email: string, ipAddress?: string): AuthenticityCheckResult {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  const riskFlags: string[] = [];
  let score = 0;

  // Disposable email check
  const disposableDomains = ["tempmail.com", "10minutemail.com", "throwaway.email", "guerrillamail.com", "mailinator.com"];
  const isDisposable = disposableDomains.some((d) => domain.includes(d));

  if (isDisposable) {
    riskFlags.push("DISPOSABLE_DOMAIN_DETECTED");
  }

  // Trusted corporate / enterprise domains
  const corporateDomains = ["google.com", "microsoft.com", "apple.com", "amazon.com", "stripe.com", "acme.corp", "enterprise.io", "meta.com", "ibm.com", "oracle.com"];
  const isCorporate = corporateDomains.some((d) => domain.includes(d)) || domain.endsWith(".edu") || domain.endsWith(".gov");

  // Simulated MX record existence
  const hasMx = domain.length > 3 && !domain.includes("fake") && !domain.includes("test-invalid");
  if (hasMx) score += 25;
  else riskFlags.push("NO_MX_RECORDS");

  // Simulated SPF
  let spfResult: VerificationStatus = "NONE";
  if (isCorporate) {
    spfResult = "PASS";
    score += 25;
  } else if (!hasMx || domain.includes("spam")) {
    spfResult = "FAIL";
    riskFlags.push("SPF_ALIGNMENT_FAILED");
  } else {
    spfResult = "PASS";
    score += 20;
  }

  // Simulated DKIM
  let dkimResult: VerificationStatus = "NONE";
  if (isCorporate) {
    dkimResult = "PASS";
    score += 25;
  } else if (domain.includes("spam") || isDisposable) {
    dkimResult = "FAIL";
    riskFlags.push("DKIM_SIGNATURE_INVALID");
  } else {
    dkimResult = "PASS";
    score += 20;
  }

  // Simulated DMARC
  let dmarcResult: VerificationStatus = "NONE";
  if (isCorporate) {
    dmarcResult = "PASS";
    score += 25;
  } else if (spfResult === "PASS" && dkimResult === "PASS") {
    dmarcResult = "PASS";
    score += 25;
  } else if (spfResult === "FAIL" || dkimResult === "FAIL") {
    dmarcResult = "FAIL";
    riskFlags.push("DMARC_POLICY_REJECT");
  } else {
    dmarcResult = "NEUTRAL";
    score += 10;
  }

  // SMTP Ping Check
  const smtpCheckValid = hasMx && !isDisposable && !domain.includes("spam");
  if (smtpCheckValid) {
    score = Math.min(100, score + 10);
  } else {
    riskFlags.push("SMTP_HANDSHAKE_REJECTED");
    score = Math.max(0, score - 30);
  }

  if (isDisposable) {
    score = Math.min(score, 15);
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    spfResult,
    dkimResult,
    dmarcResult,
    mxRecordExists: hasMx,
    smtpCheckValid,
    riskFlags,
    details: {
      domain,
      ipAddress: ipAddress || "127.0.0.1",
      smtpBanner: smtpCheckValid ? `220 mx.${domain} ESMTP Postfix ready` : "550 Relay Access Denied",
      spfPolicy: spfResult === "PASS" ? "v=spf1 include:_spf.google.com ~all" : "v=spf1 -all",
      dmarcPolicy: dmarcResult === "PASS" ? "v=DMARC1; p=reject; rua=mailto:dmarc@" + domain : "none",
      tlsVersion: "TLSv1.3 / ECDHE-RSA-AES256-GCM-SHA384",
      evaluationTimestamp: new Date().toISOString(),
    },
  };
}
