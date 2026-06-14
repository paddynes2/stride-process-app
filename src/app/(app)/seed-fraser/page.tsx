import { notFound } from "next/navigation";

// RETIRED 2026-06-14 (B-275 buyer-safety, meta/stride-audit/AUDIT.md).
// This dev-seed route previously hardcoded a real client's (Fraser / 13design)
// confidential process data, verbatim notes and quotes included, into the
// shipped client bundle and built it as a workspace for ANY authenticated user
// who visited /seed-fraser. That is a confidentiality leak in a multi-buyer app.
// The route now returns 404 and ships none of that data. The generic /seed
// route remains for demo seeding. Recover the old seed from git history if a
// sanitised, env-gated demo is ever needed.
export default function RetiredSeedRoute() {
  notFound();
}
