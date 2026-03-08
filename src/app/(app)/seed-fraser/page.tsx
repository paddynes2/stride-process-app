"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  createWorkspace,
  createTab,
  createSection,
  createStep,
  updateStep,
  createConnection,
  createTeam,
  createRole,
  createPerson,
  createStepRole,
  createTool,
  createToolSection,
  createStepTool,
  createStage,
  createTouchpoint,
  updateTouchpoint,
  createTouchpointConnection,
  createPerspective,
  createAnnotation,
  createComment,
  createTask,
  createRunbook,
  createColoringRule,
  createImprovementIdea,
} from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogEntry {
  message: string;
  status: "pending" | "done" | "error";
}

// =============================================================================
// 13 Design — Fraser Rutherford
// Process discovery: 5 March 2026 (43-min session)
// Prior context: 3 March 2026 pilot discussion + 4 March WhatsApp
//
// Business: Bespoke branded merchandise (key rings, tote bags, clothing, etc.)
// Model: Solo operator + trusted supplier network (~10 factories)
// Volume: 2-3 new business inquiries/month, ~2 orders/month
// Revenue: Each order varies widely (20-unit job to 10,000-unit job)
// Key insight: Value is speed-to-quote + freedom, not massive time savings
// The "holiday problem": Fraser works on holiday because nothing runs without him
// =============================================================================

const WORKSPACE_NAME = "13 Design — Inquiry to Delivery";

// ---------------------------------------------------------------------------
// Process steps — 23 steps across 4 sections
//
// Funnel reality (Fraser's own numbers, 5 Mar):
//   ~50 outreach emails/month → 2-3 new inquiries → ~2 quotes → ~1.5 orders
//   "If I get two or three new business inquiries a month, I'm pretty good"
//   "Nobody's getting 10 new inquiries a day. If they did, we wouldn't be here"
//
// Time estimates from discovery session. "Wait" steps use elapsed calendar time
// converted to active-effort equivalent (checking email, mental overhead).
// ---------------------------------------------------------------------------

const PROCESS_STEPS = [
  // ── Section 1: Lead Generation & First Contact ──────────────────────────
  {
    name: "Outbound Campaign (SmartLeads)",
    status: "live" as const, executor: "automation" as const,
    time_minutes: 5, frequency_per_month: 50,
    maturity_score: 4, target_maturity: 5, effort_score: 1, impact_score: 3,
    notes: "<p>Hospitality & Events campaign live (~230 leads, ~20% contacted). 0% bounce rate. Patrick manages; Fraser monitors via Pumble notifications and SmartLeads portal.</p><p>Main traction expected at emails 3-4 ('Ninja Hamster' sequence). Next campaign planned for April with radically different copy.</p>",
  },
  {
    name: "Lead Enrichment (Hunter / Findymail)",
    status: "live" as const, executor: "automation" as const,
    time_minutes: 3, frequency_per_month: 50,
    maturity_score: 4, target_maturity: 4, effort_score: 1, impact_score: 2,
    notes: null,
  },
  {
    name: "Inquiry Arrives (Email / Phone / Referral)",
    status: "live" as const, executor: "empty" as const,
    time_minutes: 0, frequency_per_month: 3,
    maturity_score: 2, target_maturity: 4, effort_score: 1, impact_score: 5,
    notes: "<p>Three channels: cold email reply, phone call, or warm referral. Referrals convert best — Fraser validated this strongly: <em>'You could send a million emails and not get any replies, because nobody knows you.'</em></p><p>No CRM, no intake form. Inquiry lands in Gmail and Fraser triages manually.</p>",
  },
  {
    name: "Acknowledge & Respond to Inquiry",
    status: "draft" as const, executor: "person" as const,
    time_minutes: 15, frequency_per_month: 3,
    maturity_score: 1, target_maturity: 4, effort_score: 2, impact_score: 5,
    notes: "<p><strong>No auto-acknowledgment.</strong> If an inquiry arrives at 10pm, the client hears nothing until Fraser checks email — could be next morning or later. First impression gap.</p><p>Quick win: AI drafts a personalized reply within minutes, confirming receipt and setting expectation. Fraser approves before sending. Builds on the SmartLead auto-reply draft system Patrick already built.</p>",
  },

  // ── Section 2: Scoping & Quoting (THE #1 BOTTLENECK) ───────────────────
  // Total active time per quote: ~3.5 hours spread over 2-3 DAYS
  // This is what Fraser called "the game changer" — the section with the
  // highest automation ROI and the clearest "oh shit" moment potential.
  {
    name: "Understand Product Requirements",
    status: "live" as const, executor: "person" as const,
    time_minutes: 30, frequency_per_month: 3,
    maturity_score: 3, target_maturity: 4, effort_score: 3, impact_score: 5,
    notes: "<p>Fraser parses the inquiry: what product, quantity, colors, branding, deadline. Often needs a follow-up call or email to clarify specs.</p><p>High-value human step — Fraser's product knowledge is the differentiator. AI can assist by extracting structured specs from unstructured emails.</p>",
  },
  {
    name: "Request Pricing from Trusted Suppliers",
    status: "live" as const, executor: "person" as const,
    time_minutes: 45, frequency_per_month: 3,
    maturity_score: 1, target_maturity: 5, effort_score: 5, impact_score: 5,
    notes: "<p><strong>The #1 bottleneck in the entire business.</strong></p><p>Fraser manually emails 4-5 trusted factories with product specs. Each supplier has different pricing formats, MOQs, and response times. For unusual items, he also searches Alibaba (3-10 suppliers).</p><p>Fraser (5 Mar): <em>'An inquiry could come in at 10 o'clock at night for a thousand key rings, and then the computer understands it, sends off to a factory to get prices for me... before I even open my computer, I've got a new inquiry, and here's the costs, and here's the draft email.'</em></p><p><strong>Automation target:</strong> AI agent parses inquiry, emails all relevant suppliers simultaneously with structured price requests.</p>",
  },
  {
    name: "Wait for Supplier Responses (1-3 days)",
    status: "in_progress" as const, executor: "empty" as const,
    time_minutes: 15, frequency_per_month: 3,
    maturity_score: 1, target_maturity: 4, effort_score: 4, impact_score: 5,
    notes: "<p>Dead time. Fraser waits 1-3 business days for supplier replies. During this time, the client is also waiting — and may be getting quotes from competitors.</p><p>Active effort: ~15 min checking email, following up with slow responders. But the <strong>calendar time</strong> is the real cost — 2-3 days where the client's enthusiasm cools.</p><p>With automation: responses can be parsed and compared as they arrive. Draft quote assembles progressively.</p>",
  },
  {
    name: "Compare Prices, MOQ & Lead Times",
    status: "live" as const, executor: "person" as const,
    time_minutes: 30, frequency_per_month: 3,
    maturity_score: 1, target_maturity: 5, effort_score: 4, impact_score: 5,
    notes: "<p>Fraser compares 4-5 supplier responses mentally or in a rough spreadsheet. Factors: unit price, minimum order quantity, production lead time, quality track record, shipping cost.</p><p>No standard format — each supplier responds differently. Comparison is manual and error-prone under time pressure.</p><p><strong>Automation:</strong> AI compiles a normalized comparison table (price/unit, MOQ, lead time, rating, total landed cost) from email responses.</p>",
  },
  {
    name: "Calculate Shipping & Margins",
    status: "live" as const, executor: "person" as const,
    time_minutes: 20, frequency_per_month: 3,
    maturity_score: 1, target_maturity: 4, effort_score: 3, impact_score: 4,
    notes: "<p>Add shipping estimates (varies by supplier location, weight, urgency). Apply Fraser's margin. Factor in any setup fees, artwork charges, or sample costs.</p><p>Currently done in head or rough Excel. Could be templated and partially automated once supplier data is structured.</p>",
  },
  {
    name: "Generate Branded Mockups (Weavey)",
    status: "live" as const, executor: "automation" as const,
    time_minutes: 5, frequency_per_month: 3,
    maturity_score: 4, target_maturity: 5, effort_score: 1, impact_score: 4,
    notes: "<p>Semi-automated via Weavey. Fraser's friend built the flow. Client logo in → branded product mockups (lifestyle, studio, 3D) out in seconds.</p><p>Strong existing capability. The mockup is a key selling tool — clients see their brand on the product before committing. Integration point: feed mockup directly into the draft quote.</p>",
  },
  {
    name: "Assemble & Send Quote to Client",
    status: "live" as const, executor: "person" as const,
    time_minutes: 30, frequency_per_month: 3,
    maturity_score: 2, target_maturity: 4, effort_score: 3, impact_score: 5,
    notes: "<p>Fraser assembles the final quote: best supplier price + shipping + margin + Weavey mockups + covering email. Sends via Gmail.</p><p>Currently manual assembly each time. With automation: AI drafts the quote email with comparison data, mockup attachments, and Fraser's tone. Fraser reviews and hits send.</p>",
  },
  {
    name: "Follow Up on Sent Quotes",
    status: "draft" as const, executor: "person" as const,
    time_minutes: 10, frequency_per_month: 2,
    maturity_score: 1, target_maturity: 4, effort_score: 2, impact_score: 4,
    notes: "<p>No systematic follow-up on quotes. Fraser may check in if he remembers, but busy periods mean quotes go cold.</p><p>Quick win: automated sequence (Day 2 soft check-in, Day 5 nudge, Day 10 final ask). Fraser already understands sequences from SmartLeads work.</p>",
  },

  // ── Section 3: Order & Production ──────────────────────────────────────
  {
    name: "Client Confirms Order",
    status: "live" as const, executor: "empty" as const,
    time_minutes: 0, frequency_per_month: 2,
    maturity_score: 3, target_maturity: 3, effort_score: 1, impact_score: 5,
    notes: null,
  },
  {
    name: "Place Order with Supplier(s)",
    status: "live" as const, executor: "person" as const,
    time_minutes: 20, frequency_per_month: 2,
    maturity_score: 2, target_maturity: 4, effort_score: 3, impact_score: 4,
    notes: "<p>Fraser emails the chosen supplier(s) with the confirmed order. For multi-product orders, may split across 2-3 factories. Re-keying specs from the quote into an order email.</p>",
  },
  {
    name: "Update Order Tracker (Excel)",
    status: "live" as const, executor: "person" as const,
    time_minutes: 10, frequency_per_month: 2,
    maturity_score: 2, target_maturity: 3, effort_score: 2, impact_score: 2,
    notes: "<p>Excel spreadsheet with color-coded tick boxes: ordered, in production, shipped, delivered, invoiced. Functional but fragile — invisible to anyone else, no alerts, no mobile access.</p><p>Fraser doesn't feel acute pain here. Low priority to replace unless order volume increases significantly.</p>",
  },
  {
    name: "Chase Production Status",
    status: "in_progress" as const, executor: "person" as const,
    time_minutes: 15, frequency_per_month: 4,
    maturity_score: 1, target_maturity: 4, effort_score: 3, impact_score: 4,
    notes: "<p>Manual check-ins with suppliers. No automated alerts when production milestones hit. Fraser has to remember to chase — items can fall through cracks during busy periods or holidays.</p><p><strong>The holiday problem:</strong> <em>'People are problems. And they cost a lot of money. And if I can do it myself, better job quicker.'</em> — but this means nothing moves when Fraser is away.</p>",
  },
  {
    name: "Review Proofs & Samples",
    status: "live" as const, executor: "person" as const,
    time_minutes: 20, frequency_per_month: 2,
    maturity_score: 3, target_maturity: 3, effort_score: 2, impact_score: 5,
    notes: "<p>Quality control step. Fraser reviews proofs/samples before full production. High-value human judgment — DO NOT AUTOMATE. But notification of proof arrival and client forwarding can be automated.</p>",
  },
  {
    name: "Confirm Production Complete & Ready to Ship",
    status: "in_progress" as const, executor: "person" as const,
    time_minutes: 10, frequency_per_month: 2,
    maturity_score: 1, target_maturity: 4, effort_score: 2, impact_score: 3,
    notes: "<p>Fraser confirms with supplier that production is finished and goods are ready for dispatch. Currently relies on supplier proactively emailing — often Fraser has to chase.</p><p>Automation: auto-check with supplier at expected completion date. Alert Fraser when confirmed or overdue.</p>",
  },

  // ── Section 4: Delivery, Invoice & Aftercare ───────────────────────────
  {
    name: "Coordinate Delivery",
    status: "live" as const, executor: "person" as const,
    time_minutes: 15, frequency_per_month: 2,
    maturity_score: 2, target_maturity: 3, effort_score: 2, impact_score: 4,
    notes: null,
  },
  {
    name: "Confirm Delivery with Client",
    status: "live" as const, executor: "person" as const,
    time_minutes: 10, frequency_per_month: 2,
    maturity_score: 1, target_maturity: 4, effort_score: 2, impact_score: 4,
    notes: "<p>Currently manual. Client sometimes has to tell Fraser the goods arrived rather than the other way around. Auto-confirmation on shipment tracking would flip this.</p>",
  },
  {
    name: "Invoice Client",
    status: "draft" as const, executor: "person" as const,
    time_minutes: 15, frequency_per_month: 2,
    maturity_score: 1, target_maturity: 4, effort_score: 2, impact_score: 4,
    notes: "<p>Manual invoice, timing unclear. Sometimes delayed because Fraser is busy with the next job. Auto-invoice triggered by delivery confirmation would close the cash cycle faster.</p>",
  },
  {
    name: "Chase Payment",
    status: "draft" as const, executor: "person" as const,
    time_minutes: 10, frequency_per_month: 1,
    maturity_score: 1, target_maturity: 4, effort_score: 2, impact_score: 3,
    notes: null,
  },
  {
    name: "Post-Delivery Follow-up & Referral Ask",
    status: "draft" as const, executor: "person" as const,
    time_minutes: 10, frequency_per_month: 1,
    maturity_score: 1, target_maturity: 3, effort_score: 2, impact_score: 5,
    notes: "<p><strong>Currently doesn't happen consistently.</strong> Fraser admits he forgets. This is a massive missed opportunity given his referral-first GTM model.</p><p>His own words (3 Mar): <em>'Referrals are the ONLY viable path. If you get that sorted in the next few months, it's a no-brainer.'</em></p><p>Automated sequence: thank-you (Day 1), satisfaction check (Day 14), referral ask (Day 30). Feeds the 20+ business owner network that Fraser has already identified.</p>",
  },
] as const;

const SECTIONS = [
  { name: "Lead Generation & First Contact", stepRange: [0, 3] as const },
  { name: "Scoping & Quoting", stepRange: [4, 11] as const },
  { name: "Order & Production", stepRange: [12, 17] as const },
  { name: "Delivery, Invoice & Aftercare", stepRange: [18, 22] as const },
];

// ---------------------------------------------------------------------------
// Teams & Roles
// ---------------------------------------------------------------------------

const TEAMS = [
  {
    name: "13 Design",
    roles: [
      { name: "Owner / Operator", rate: 75, people: ["Fraser Rutherford"] },
    ],
  },
  {
    name: "External Partners",
    roles: [
      { name: "Weavey Mockup Designer", rate: 0, people: ["Weavey (automated flow)"] },
      { name: "Trusted Supplier (Factory)", rate: 0, people: [
        "Factory 1 — Bespoke Merchandise (portal + email)",
        "Factory 2 — Clothing & Apparel",
        "Factory 3 — Branding & Print",
        "Factory 4 — Stock Items (portal pricing)",
        "Factory 5 — Specialist / Niche Products",
      ]},
    ],
  },
  {
    name: "Automation (Proposed)",
    roles: [
      { name: "AI Quoting Agent", rate: 0, people: ["Supplier Price Comparison Agent"] },
      { name: "AI Email Agent", rate: 0, people: ["Auto-Draft / Follow-up Agent"] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Tools — current stack + proposed additions
// ---------------------------------------------------------------------------

const TOOLS = [
  { name: "Gmail", vendor: "Google", category: "Email", cost: 0, status: "active" as const, logo: "https://www.google.com/s2/favicons?domain=gmail.com&sz=128", desc: "Primary communication channel for inquiries, supplier emails, quotes, invoices" },
  { name: "SmartLeads", vendor: "SmartLeads", category: "Outreach", cost: 94, status: "active" as const, logo: "https://www.google.com/s2/favicons?domain=smartlead.ai&sz=128", desc: "Cold email outreach. 2 campaigns live (Hospitality & Events). 0% bounce rate." },
  { name: "Hunter.io", vendor: "Hunter", category: "Enrichment", cost: 49, status: "active" as const, logo: "https://www.google.com/s2/favicons?domain=hunter.io&sz=128", desc: "Email finder for lead enrichment" },
  { name: "Findymail", vendor: "Findymail", category: "Enrichment", cost: 49, status: "active" as const, logo: "https://www.google.com/s2/favicons?domain=findymail.com&sz=128", desc: "Secondary email verification/enrichment" },
  { name: "Weavey", vendor: "Custom (friend-built)", category: "Visualization", cost: 0, status: "active" as const, logo: null, desc: "Instant branded product mockups: logo in, lifestyle/studio/3D images out in seconds" },
  { name: "Excel (Order Tracker)", vendor: "Microsoft", category: "Operations", cost: 10, status: "active" as const, logo: "https://www.google.com/s2/favicons?domain=microsoft.com&sz=128", desc: "Color-coded tick boxes: ordered, in production, shipped, delivered, invoiced. Fragile but functional." },
  { name: "Alibaba", vendor: "Alibaba Group", category: "Supplier Portal", cost: 0, status: "active" as const, logo: "https://www.google.com/s2/favicons?domain=alibaba.com&sz=128", desc: "Used for unusual/non-standard items. 3-10 suppliers searched per inquiry." },
  { name: "Supplier Portals (5-6 factories)", vendor: "Various", category: "Supplier Portal", cost: 0, status: "active" as const, logo: null, desc: "Trusted factories with online portals for stock items and pricing. ~10 total suppliers in Fraser's network." },
  { name: "Phone / WhatsApp", vendor: "Various", category: "Communication", cost: 0, status: "active" as const, logo: "https://www.google.com/s2/favicons?domain=whatsapp.com&sz=128", desc: "Client calls, supplier check-ins, relationship management" },
  { name: "13design.co.uk", vendor: "Self-hosted", category: "Website", cost: 20, status: "active" as const, logo: null, desc: "Portfolio website. Some inbound traffic but not a primary lead source." },
  // Proposed tools
  { name: "AI Quoting Agent (Proposed)", vendor: "AutoSpark / Daylight", category: "Automation", cost: 0, status: "considering" as const, logo: null, desc: "Supplier price comparison, quote assembly, draft email generation" },
  { name: "AI Email Agent (Proposed)", vendor: "AutoSpark / Daylight", category: "Automation", cost: 0, status: "considering" as const, logo: null, desc: "Auto-acknowledge inquiries, follow-up sequences, post-delivery outreach" },
  { name: "Order Dashboard (Proposed)", vendor: "AutoSpark / Daylight", category: "Operations", cost: 0, status: "considering" as const, logo: null, desc: "Replace Excel tracker with web dashboard. Auto-chase suppliers. Mobile access." },
];

const TOOL_SECTIONS_DATA = [
  { name: "Lead Gen & Outreach", tools: [1, 2, 3, 9] },
  { name: "Communication & Email", tools: [0, 8] },
  { name: "Production & Fulfillment", tools: [4, 5, 6, 7] },
  { name: "Proposed Automation", tools: [10, 11, 12] },
];

// Step index -> tool indices
const STEP_TOOL_ASSIGNMENTS: Record<number, number[]> = {
  0: [1],             // SmartLeads
  1: [2, 3],          // Hunter, Findymail
  2: [0, 8],          // Gmail, Phone
  3: [0],             // Gmail
  4: [0, 8],          // Gmail, Phone
  5: [0, 6, 7],       // Gmail, Alibaba, Supplier Portals
  6: [0],             // Gmail (checking for responses)
  7: [5],             // Excel (rough comparison)
  8: [5],             // Excel (calculations)
  9: [4],             // Weavey
  10: [0],            // Gmail
  11: [0],            // Gmail (follow-up)
  13: [0, 6, 7],      // Gmail, Alibaba, Supplier Portals
  14: [5],            // Excel
  15: [0, 8],         // Gmail, Phone
  17: [0, 8],         // Gmail, Phone (confirm production complete)
  16: [0, 8],         // Gmail, Phone (review proofs)
  18: [0],            // Gmail (coordinate delivery)
  19: [0],            // Gmail (confirm delivery)
  20: [0],            // Gmail (invoice)
  21: [0],            // Gmail (chase payment)
  22: [0, 8],         // Gmail, Phone (post-delivery referral ask)
};

// Step index -> role indices (flat: 0=Owner, 1=Weavey, 2=Factory, 3=AI Quoting, 4=AI Email)
const STEP_ROLE_ASSIGNMENTS: Record<number, number[]> = {
  0: [0],        // Fraser
  2: [0],        // Fraser
  3: [0],        // Fraser
  4: [0],        // Fraser
  5: [0, 2],     // Fraser + Suppliers
  6: [2],        // Suppliers (responding)
  7: [0],        // Fraser
  8: [0],        // Fraser
  9: [1],        // Weavey
  10: [0],       // Fraser
  11: [0],       // Fraser (follow up on quotes)
  13: [0, 2],    // Fraser + Suppliers
  14: [0],       // Fraser (Excel tracker)
  15: [0, 2],    // Fraser + Suppliers
  17: [0, 2],    // Fraser + Suppliers (confirm production complete)
  18: [0],       // Fraser (coordinate delivery)
  16: [0],       // Fraser (review proofs)
  19: [0],       // Fraser (confirm delivery)
  20: [0],       // Fraser (invoice)
  21: [0],       // Fraser (chase payment)
  22: [0],       // Fraser (post-delivery referral ask)
};

// ---------------------------------------------------------------------------
// Customer Journey — 18 touchpoints across 5 stages
// Modeled from the CLIENT'S perspective, not Fraser's
// ---------------------------------------------------------------------------

const JOURNEY_STAGES = [
  { name: "Awareness", desc: "Prospect first discovers 13 Design", channel: "Cold email / Referral / Web", owner: "Fraser + SmartLeads" },
  { name: "Inquiry & First Impression", desc: "Client reaches out with a specific product need", channel: "Email / Phone", owner: "Fraser" },
  { name: "Quoting & Decision", desc: "Client waits for and evaluates the quote", channel: "Email", owner: "Fraser" },
  { name: "Production & Waiting", desc: "Order confirmed, goods being manufactured", channel: "Email (sporadic)", owner: "Fraser + Supplier" },
  { name: "Delivery & Relationship", desc: "Goods arrive, relationship either deepens or fades", channel: "Email / Phone", owner: "Fraser" },
];

const JOURNEY_TOUCHPOINTS = [
  // Stage 0: Awareness
  { stage: 0, name: "Receive Cold Email (SmartLeads)", sentiment: "neutral" as const, pain: 2, gain: 2, effort: 1, emotion: "Skeptical — Fraser himself deletes AI emails" },
  { stage: 0, name: "Referral from Trusted Contact", sentiment: "positive" as const, pain: 1, gain: 5, effort: 1, emotion: "Open — trust pre-built" },
  { stage: 0, name: "Browse 13design.co.uk Portfolio", sentiment: "neutral" as const, pain: 1, gain: 3, effort: 2, emotion: "Evaluating — are they legit?" },
  // Stage 1: Inquiry & First Impression
  { stage: 1, name: "Send Inquiry (Email / Phone)", sentiment: "positive" as const, pain: 1, gain: 3, effort: 2, emotion: "Hopeful — I need this product" },
  { stage: 1, name: "Wait for Acknowledgment (Hours/Overnight)", sentiment: "negative" as const, pain: 4, gain: 1, effort: 1, emotion: "Is anyone there? Should I try someone else?" },
  { stage: 1, name: "First Call with Fraser", sentiment: "positive" as const, pain: 1, gain: 5, effort: 3, emotion: "This guy knows his stuff — personal, responsive" },
  // Stage 2: Quoting & Decision
  { stage: 2, name: "Receive Branded Mockup (Weavey)", sentiment: "positive" as const, pain: 1, gain: 5, effort: 1, emotion: "Wow — I can see my brand on the product!" },
  { stage: 2, name: "Wait 2-3 Days for Quote", sentiment: "negative" as const, pain: 5, gain: 1, effort: 1, emotion: "Frustrated — I expected this faster. Getting quotes elsewhere?" },
  { stage: 2, name: "Receive Detailed Quote", sentiment: "positive" as const, pain: 1, gain: 4, effort: 2, emotion: "Good value, clear breakdown" },
  { stage: 2, name: "Approve Quote & Confirm Order", sentiment: "positive" as const, pain: 1, gain: 5, effort: 3, emotion: "Committed — let's go" },
  // Stage 3: Production & Waiting
  { stage: 3, name: "Receive Order Confirmation", sentiment: "positive" as const, pain: 1, gain: 3, effort: 1, emotion: "Reassured — it's happening" },
  { stage: 3, name: "Silence During Production (No Updates)", sentiment: "negative" as const, pain: 4, gain: 1, effort: 2, emotion: "Anxious — what's happening with my order?" },
  { stage: 3, name: "Review Proof / Sample", sentiment: "positive" as const, pain: 1, gain: 4, effort: 3, emotion: "Excited — it's becoming real" },
  // Stage 4: Delivery & Relationship
  { stage: 4, name: "Receive Goods", sentiment: "positive" as const, pain: 1, gain: 5, effort: 1, emotion: "Delighted — exactly what I wanted" },
  { stage: 4, name: "Fraser Checks In (When He Remembers)", sentiment: "positive" as const, pain: 1, gain: 4, effort: 1, emotion: "Valued — he cares about my satisfaction" },
  { stage: 4, name: "Receive Invoice (Delayed)", sentiment: "neutral" as const, pain: 2, gain: 2, effort: 2, emotion: "Expected — but why so late?" },
  { stage: 4, name: "No Follow-up / Referral Ask", sentiment: "negative" as const, pain: 3, gain: 1, effort: 1, emotion: "Forgotten — would have referred friends if asked" },
  { stage: 4, name: "Reorder (If Relationship Maintained)", sentiment: "positive" as const, pain: 1, gain: 5, effort: 2, emotion: "Loyal — Fraser is my merch guy" },
] as const;

// ---------------------------------------------------------------------------
// Perspectives — three viewpoints on the same process
// ---------------------------------------------------------------------------

const PERSPECTIVES = [
  { name: "Fraser (Owner)", color: "#3B82F6" },      // Blue
  { name: "Client Experience", color: "#10B981" },    // Green
  { name: "Automation Opportunity", color: "#8B5CF6" }, // Purple
];

// Step annotations per perspective [perspIdx, stepIdx, content, rating (1-5)]
const STEP_ANNOTATIONS: Array<[number, number, string, number]> = [
  // Fraser's view
  [0, 3, "I just reply when I see it. No urgency if it's evening. But I know I'm losing the 10pm inquiries.", 2],
  [0, 5, "This is where all my time goes. Emailing factories, waiting, comparing. It's the job, but it's the bit I'd love to hand off.", 1],
  [0, 9, "Weavey is brilliant. My mate built it. Clients love seeing their brand on a product before committing.", 5],
  [0, 10, "I assemble quotes manually every time. Same format, different numbers. Should be templated by now.", 2],
  [0, 15, "I check in when I remember. On holiday, nothing gets chased. That's the problem.", 2],
  [0, 22, "I know I should be asking for referrals. I've got 20 business mates who'd benefit. I just forget.", 1],
  // Client experience
  [1, 3, "Sent inquiry at 8pm. Heard back next morning. By then I'd already emailed two competitors.", 2],
  [1, 6, "Waited 3 days for a quote. Nearly went elsewhere. When it arrived, it was good — but the wait was painful.", 2],
  [1, 9, "The Weavey mockup sold me. Seeing my logo on the product made it real. This was the moment I decided to order.", 5],
  [1, 15, "No updates for 2 weeks during production. I had to email Fraser to ask what was happening.", 1],
  [1, 19, "Got my goods, they were perfect. But I never heard from Fraser again. Would have referred him to mates.", 2],
  // Automation opportunity
  [2, 3, "HIGH: Auto-draft acknowledgment. 5-minute response time vs hours. Complexity: LOW. Impact: HIGH.", 5],
  [2, 5, "CRITICAL: Supplier price comparison agent. The single highest-value automation in the business. Saves 2-3 hours per inquiry, reduces quote time from days to hours.", 5],
  [2, 6, "CRITICAL: Progressive quote assembly as supplier responses arrive. Comparison table auto-populated.", 5],
  [2, 11, "MEDIUM: Auto-sequence (Day 2, Day 5, Day 10). Fraser knows sequences from SmartLeads. Easy adoption.", 4],
  [2, 15, "MEDIUM: Auto-chase supplier emails at intervals. Alert on overdue items. Solves the holiday problem.", 4],
  [2, 22, "MEDIUM: Post-delivery sequence (thank you → satisfaction check → referral ask). Feeds the 20+ contact referral pipeline.", 4],
];

// Touchpoint annotations [perspIdx, touchpointIdx, content, rating]
const TOUCHPOINT_ANNOTATIONS: Array<[number, number, string, number]> = [
  [1, 4, "The wait for acknowledgment is where we lose people. Competitors respond faster.", 1],
  [1, 7, "2-3 day quote wait is the biggest client pain point. First-to-quote wins.", 1],
  [1, 11, "Production silence creates anxiety. Even a simple 'your order is on track' email would help.", 2],
  [1, 16, "No referral ask = missed revenue. Fraser's clients are willing — they just need to be asked.", 2],
  [2, 4, "Auto-acknowledge: 2 min response. Buys time for the real quote.", 5],
  [2, 7, "AI quoting agent: same-day quote instead of 2-3 day wait. Competitive advantage.", 5],
  [2, 11, "Auto-status emails from supplier tracking. Zero effort from Fraser.", 4],
];

// ---------------------------------------------------------------------------
// Comments — Fraser's own words + analysis
// ---------------------------------------------------------------------------

const COMMENTS = [
  // Pain points
  { stepIdx: 3, content: "No auto-acknowledge. Client inquiry at 10pm = silence until Fraser checks email. First impression gap. Competitors who respond faster win the job.", category: "pain_point" as const },
  { stepIdx: 5, content: "Fraser: 'An inquiry could come in at 10 o'clock at night for a thousand key rings, and then the computer understands it, and sends off to a factory to get prices for me... before I even open my computer, I've got a new inquiry, and here's the costs, and here's the draft email.' — THIS is the #1 automation target.", category: "pain_point" as const },
  { stepIdx: 6, content: "2-3 days of dead time while suppliers respond. Client is waiting. Competitors are quoting. Every day of delay reduces conversion probability.", category: "pain_point" as const },
  { stepIdx: 15, content: "Fraser works on holiday because nothing moves without him. 'People are problems. And they cost a lot of money.' He chose solo + automation over hiring — but the automation doesn't exist yet.", category: "pain_point" as const },
  { stepIdx: 22, content: "Follow-up doesn't happen consistently. Fraser has ~20 business owner contacts who keep asking 'how's it going?' Success here = case study + direct referrals. But the referral ask never gets sent.", category: "pain_point" as const },
  // Ideas
  { stepIdx: 5, content: "Fraser (5 Mar): 'That's the game changer right there. And that's all you need to sell the dream.' — on the supplier price comparison agent concept.", category: "idea" as const },
  { stepIdx: 7, content: "Normalized comparison table: price/unit, MOQ, lead time, supplier rating, total landed cost (inc. shipping). Fraser currently does this in his head. Table format would also become the client-facing quote breakdown.", category: "idea" as const },
  { stepIdx: 10, content: "Quote assembly agent: pull best supplier price + Weavey mockup + shipping estimate + margin → draft email in Fraser's tone. He reviews, tweaks, sends. Learning loop: AI improves from each edit.", category: "idea" as const },
  { stepIdx: 22, content: "Post-delivery sequence: Day 1 thank-you, Day 14 satisfaction check, Day 30 referral ask with incentive. Feeds the referral flywheel that Fraser identified as the #1 GTM channel.", category: "idea" as const },
  // Notes / context
  { stepIdx: 9, content: "Weavey is a significant existing asset. Fraser's friend built the automation. Logo → branded mockup in seconds. Clients love it. Any quoting automation should integrate Weavey output.", category: "note" as const },
  { stepIdx: 14, content: "Excel tracker with color-coded tick boxes. Fragile, invisible, no alerts — but Fraser doesn't feel acute pain here. Priority: LOW until order volume justifies a dashboard.", category: "note" as const },
  { stepIdx: 4, content: "Fraser (5 Mar): 'I'm not getting 10 new inquiries a day. Realistically, I'm not. If I get two or three new business inquiries a month, I'm pretty good at finishing it.' — Volume is low but conversion matters. Speed-to-quote is the differentiator, not time savings at scale.", category: "note" as const },
  { stepIdx: 0, content: "Fraser (3 Mar): 'You could send a million emails and not get any replies, because nobody knows you.' He validates referral-first GTM. Even he — an AI enthusiast — deletes obvious AI cold emails.", category: "note" as const },
  // Decisions
  { stepIdx: 5, content: "Decision: Supplier Price Comparison Agent is the Phase 1 deliverable. Build this first. If it works, everything else follows.", category: "decision" as const },
  { stepIdx: 4, content: "Decision: DO NOT AUTOMATE client interaction / relationship building. Fraser's personal touch is his differentiator. 'I've yet to have a customer come to me, automated, that's ordering 10,000 t-shirts. It's always a person who signs it all off.'", category: "decision" as const },
];

// ---------------------------------------------------------------------------
// Tasks — implementation checklists on key steps
// ---------------------------------------------------------------------------

const TASK_SETS: Array<{ stepIdx: number; tasks: string[] }> = [
  { stepIdx: 3, tasks: [
    "Draft acknowledgment email template (warm, personal, not robotic)",
    "Set up Gmail monitoring for new inquiries",
    "Build auto-draft with clarifying questions logic",
    "Test with Fraser — compare AI draft vs his natural reply",
    "Deploy with human-in-the-loop (Fraser approves before send)",
  ]},
  { stepIdx: 5, tasks: [
    "Map all ~10 trusted suppliers: email, portal URL, product categories, typical response time",
    "Define structured price request template (product, qty, colors, deadline, shipping)",
    "Build email agent: parse inquiry → generate supplier emails → send simultaneously",
    "Build response parser: extract price, MOQ, lead time from supplier replies",
    "Build comparison table generator: normalize across suppliers",
    "Integrate Weavey mockup into quote assembly",
    "Test end-to-end on a real inquiry with Fraser reviewing each step",
  ]},
  { stepIdx: 15, tasks: [
    "Define chase schedule per supplier (e.g., Day 7, Day 14, Day 21)",
    "Build auto-email: 'Hi [supplier], checking in on order #X — any update on production?'",
    "Alert Fraser on: overdue items, shipping confirmation, unexpected delays",
    "Test with 2-3 active orders",
  ]},
  { stepIdx: 22, tasks: [
    "Draft post-delivery email sequence (3 emails over 30 days)",
    "Email 1 (Day 1): Thank you + satisfaction question",
    "Email 2 (Day 14): Check-in + any issues?",
    "Email 3 (Day 30): Referral ask with easy CTA",
    "Fraser reviews and approves tone",
    "Deploy on next completed delivery",
  ]},
];

// ---------------------------------------------------------------------------
// Improvement ideas — with ROI estimates
// ---------------------------------------------------------------------------

const IMPROVEMENT_IDEAS = [
  {
    title: "#1 Supplier Price Comparison Agent",
    desc: "AI parses product inquiry, emails 4-5 trusted factories simultaneously, parses responses into a normalized comparison table (price/unit, MOQ, lead time, shipping, total landed cost), attaches Weavey mockup, and drafts the quote email in Fraser's tone.\n\nROI: ~3.5 hours active work saved per inquiry × 3 inquiries/month = 10.5 hrs/month (~£790 at £75/hr). Speed: quote delivery from 2-3 DAYS to same-day. Competitive advantage: first-to-quote wins more deals.\n\nFraser's reaction: 'That is awesome. That's the game changer right there.'",
    priority: "critical" as const, status: "proposed" as const, stepIdx: 5,
  },
  {
    title: "#2 Auto-Draft Inquiry Response",
    desc: "When a new inquiry hits Gmail, AI drafts a personalized acknowledgment within minutes: confirms receipt, asks clarifying questions if product specs are unclear, sets expectation on quote timeline ('You'll have a detailed quote with mockups by tomorrow morning').\n\nFraser approves before sending. Builds on the SmartLead auto-reply draft system that's already working.\n\nROI: Prevents lost inquiries (especially evening/weekend). Low complexity, high signal value. Deploy first as trust builder.",
    priority: "high" as const, status: "proposed" as const, stepIdx: 3,
  },
  {
    title: "#3 Quote Follow-up Sequences",
    desc: "Automated follow-up after sending a quote:\n- Day 2: Soft check-in ('Just checking you received the quote — any questions?')\n- Day 5: Value nudge ('Happy to adjust quantities or explore alternatives')\n- Day 10: Final ask ('Still interested? No pressure — let me know either way')\n\nFraser already understands email sequences from SmartLeads work. Easy adoption. Prevents deals going cold while Fraser is busy with production.",
    priority: "medium" as const, status: "proposed" as const, stepIdx: 11,
  },
  {
    title: "#4 Production Auto-Chase & Status Alerts",
    desc: "Auto-email suppliers at intervals for production status updates. Alert Fraser when:\n- Items are overdue (no response after expected lead time)\n- Shipping confirmed (with tracking number)\n- Unexpected delays flagged by supplier\n\nSolves the 'holiday problem': production doesn't stall when Fraser is away.\n\nROI: 15min × 4 chases/month = 1hr saved. But the real value is reliability — nothing falls through cracks.",
    priority: "medium" as const, status: "proposed" as const, stepIdx: 15,
  },
  {
    title: "#5 Post-Delivery Automation (Invoice + Referral Flywheel)",
    desc: "On delivery confirmation:\n1. Auto-generate and send invoice (closes cash cycle faster)\n2. Day 1: Thank-you email\n3. Day 14: Satisfaction check-in\n4. Day 30: Referral ask with easy CTA\n\nFraser's referral network (~20 business owners) is his #1 growth channel. He identified this himself (3 Mar): 'Referrals are the ONLY viable path.' But he admits the follow-up doesn't happen. This closes the loop.\n\nROI: Even 1 extra referral per quarter = significant revenue. Plus faster invoicing = better cash flow.",
    priority: "medium" as const, status: "proposed" as const, stepIdx: 22,
  },
  {
    title: "#6 Alibaba Supplier Agent (Phase 2)",
    desc: "For non-standard products outside the trusted supplier network: AI searches Alibaba, compares 5+ suppliers on price/MOQ/rating/shipping/trade assurance, and presents a shortlist.\n\nHigh value when triggered but infrequent. Build after the core quoting agent (trusted suppliers) is proven and adopted.\n\nFraser: 'If it's not something I usually [get from] one of my usual factories, could it send out like a quote to 10 different suppliers on Alibaba to ask for a price?'",
    priority: "low" as const, status: "proposed" as const, stepIdx: 5,
  },
  {
    title: "#7 Order Dashboard (Replace Excel)",
    desc: "Replace the color-coded Excel tick-box tracker with a simple web dashboard:\n- Order status visible on mobile\n- Auto-populated from email confirmations\n- Client-facing status page (optional)\n- Alerts on stale items\n\nLow priority per Fraser — he doesn't feel acute pain here. Only worth building if order volume increases significantly or as a selling point for other Daylight clients.\n\nFraser: 'There's probably platforms for that.'",
    priority: "low" as const, status: "proposed" as const, stepIdx: 14,
  },
  {
    title: "#8 AI SEO / AIEO for 13design.co.uk",
    desc: "Optimize 13design.co.uk for AI search engines (AIEO) and traditional SEO. Could increase inbound inquiries over time. Tangential to core workflow automation — nice-to-have after the quoting and follow-up automations are delivering measurable value.",
    priority: "low" as const, status: "proposed" as const, stepIdx: null,
  },
];

// ---------------------------------------------------------------------------
// Coloring rules — visual at-a-glance state
// ---------------------------------------------------------------------------

const COLORING_RULES = [
  { name: "Not started (draft)", color: "#F59E0B", criteria_type: "status" as const, criteria_value: "draft" },
  { name: "Automated steps", color: "#3B82F6", criteria_type: "executor" as const, criteria_value: "automation" },
  { name: "Low maturity (< 2)", color: "#EF4444", criteria_type: "maturity_below" as const, criteria_value: "2" },
  { name: "High maturity (> 3)", color: "#22C55E", criteria_type: "maturity_above" as const, criteria_value: "3" },
];

// =============================================================================
// Seed Page Component
// =============================================================================

export default function SeedFraserPage() {
  const router = useRouter();
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);

  function log(message: string, status: LogEntry["status"] = "pending") {
    setLogs((prev) => [...prev, { message, status }]);
  }

  function updateLastLog(status: LogEntry["status"]) {
    setLogs((prev) => {
      const copy = [...prev];
      if (copy.length > 0) copy[copy.length - 1].status = status;
      return copy;
    });
  }

  async function runSeed() {
    setRunning(true);
    setLogs([]);

    try {
      // =====================================================================
      // 1. Workspace
      // =====================================================================
      log("Creating workspace: 13 Design — Inquiry to Delivery...");
      const ws = await createWorkspace({ name: WORKSPACE_NAME });
      setWorkspaceId(ws.id);
      updateLastLog("done");

      // =====================================================================
      // 2. Process tab
      // =====================================================================
      log("Creating process tab...");
      const processTab = await createTab({ workspace_id: ws.id, name: "Full Workflow", canvas_type: "process" });
      updateLastLog("done");

      // =====================================================================
      // 3. Sections
      // =====================================================================
      log(`Creating ${SECTIONS.length} process sections...`);
      const sectionIds: string[] = [];
      for (let i = 0; i < SECTIONS.length; i++) {
        const s = SECTIONS[i];
        const stepCount = s.stepRange[1] - s.stepRange[0] + 1;
        const sec = await createSection({
          workspace_id: ws.id,
          tab_id: processTab.id,
          name: s.name,
          position_x: 50,
          position_y: 50 + i * 380,
        });
        await fetch(`/api/v1/sections/${sec.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            width: Math.max(1400, stepCount * 270 + 120),
            height: 300,
            summary: `${s.name} — ${stepCount} steps`,
          }),
        });
        sectionIds.push(sec.id);
      }
      updateLastLog("done");

      // =====================================================================
      // 4. Steps with notes
      // =====================================================================
      log(`Creating ${PROCESS_STEPS.length} process steps with metrics & notes...`);
      const stepIds: string[] = [];
      for (let i = 0; i < PROCESS_STEPS.length; i++) {
        const ps = PROCESS_STEPS[i];
        const sectionIdx = SECTIONS.findIndex((s) => i >= s.stepRange[0] && i <= s.stepRange[1]);
        const localIdx = i - SECTIONS[sectionIdx].stepRange[0];

        const step = await createStep({
          workspace_id: ws.id,
          tab_id: processTab.id,
          section_id: sectionIds[sectionIdx],
          name: ps.name,
          position_x: 80 + localIdx * 270,
          position_y: 80,
        });
        await updateStep(step.id, {
          status: ps.status,
          executor: ps.executor,
          time_minutes: ps.time_minutes,
          frequency_per_month: ps.frequency_per_month,
          maturity_score: ps.maturity_score,
          target_maturity: ps.target_maturity,
          effort_score: ps.effort_score,
          impact_score: ps.impact_score,
          notes: ps.notes ?? undefined,
        });
        stepIds.push(step.id);
      }
      updateLastLog("done");

      // =====================================================================
      // 5. Connections (all horizontal: right→left)
      // =====================================================================
      log("Creating connections (horizontal flow + cross-section)...");
      for (const sec of SECTIONS) {
        for (let i = sec.stepRange[0]; i < sec.stepRange[1]; i++) {
          await createConnection({
            workspace_id: ws.id,
            tab_id: processTab.id,
            source_step_id: stepIds[i],
            target_step_id: stepIds[i + 1],
            source_handle: "right",
            target_handle: "left",
          });
        }
      }
      for (let s = 0; s < SECTIONS.length - 1; s++) {
        await createConnection({
          workspace_id: ws.id,
          tab_id: processTab.id,
          source_step_id: stepIds[SECTIONS[s].stepRange[1]],
          target_step_id: stepIds[SECTIONS[s + 1].stepRange[0]],
          source_handle: "bottom",
          target_handle: "top",
        });
      }
      updateLastLog("done");

      // =====================================================================
      // 6. Teams, roles, people
      // =====================================================================
      log("Creating teams, roles & people...");
      const allRoleIds: string[] = [];
      for (const teamData of TEAMS) {
        const team = await createTeam({ workspace_id: ws.id, name: teamData.name });
        for (const roleData of teamData.roles) {
          const role = await createRole({ team_id: team.id, name: roleData.name });
          if (roleData.rate > 0) {
            await fetch(`/api/v1/roles/${role.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ hourly_rate: roleData.rate }),
            });
          }
          allRoleIds.push(role.id);
          for (const personName of roleData.people) {
            await createPerson({ role_id: role.id, name: personName });
          }
        }
      }
      updateLastLog("done");

      // =====================================================================
      // 7. Assign roles to steps
      // =====================================================================
      log("Assigning roles to steps...");
      for (const [stepIdxStr, roleIndices] of Object.entries(STEP_ROLE_ASSIGNMENTS)) {
        const stepIdx = Number(stepIdxStr);
        if (stepIdx >= stepIds.length) continue;
        for (const roleIdx of roleIndices) {
          if (roleIdx >= allRoleIds.length) continue;
          await createStepRole({ step_id: stepIds[stepIdx], role_id: allRoleIds[roleIdx] });
        }
      }
      updateLastLog("done");

      // =====================================================================
      // 8. Tools
      // =====================================================================
      log(`Creating ${TOOLS.length} tools (current + proposed)...`);
      // Build lookup: tool index → (section origin, local index) for spatial containment
      const toolPositionMap = new Map<number, { sx: number; sy: number; localIdx: number }>();
      for (let si = 0; si < TOOL_SECTIONS_DATA.length; si++) {
        const sx = 50 + (si % 2) * 600;
        const sy = 50 + Math.floor(si / 2) * 500;
        TOOL_SECTIONS_DATA[si].tools.forEach((toolIdx, localIdx) => {
          toolPositionMap.set(toolIdx, { sx, sy, localIdx });
        });
      }
      const toolIds: string[] = [];
      for (let i = 0; i < TOOLS.length; i++) {
        const t = TOOLS[i];
        const pos = toolPositionMap.get(i);
        const px = pos ? pos.sx + 40 + (pos.localIdx % 2) * 250 : 100 + (i % 5) * 220;
        const py = pos ? pos.sy + 60 + Math.floor(pos.localIdx / 2) * 160 : 100 + Math.floor(i / 5) * 200;
        const tool = await createTool({
          workspace_id: ws.id,
          name: t.name,
          vendor: t.vendor,
          category: t.category,
          cost_per_month: t.cost,
          status: t.status,
          description: t.desc,
          logo_url: t.logo,
          position_x: px,
          position_y: py,
        });
        toolIds.push(tool.id);
      }
      updateLastLog("done");

      // =====================================================================
      // 9. Tool sections
      // =====================================================================
      log(`Creating ${TOOL_SECTIONS_DATA.length} tool sections...`);
      for (let i = 0; i < TOOL_SECTIONS_DATA.length; i++) {
        const ts = TOOL_SECTIONS_DATA[i];
        await createToolSection({
          workspace_id: ws.id,
          name: ts.name,
          position_x: 50 + (i % 2) * 600,
          position_y: 50 + Math.floor(i / 2) * 500,
          width: 560,
          height: 420,
        });
      }
      updateLastLog("done");

      // =====================================================================
      // 10. Assign tools to steps
      // =====================================================================
      log("Assigning tools to steps...");
      for (const [stepIdxStr, toolIndices] of Object.entries(STEP_TOOL_ASSIGNMENTS)) {
        const stepIdx = Number(stepIdxStr);
        if (stepIdx >= stepIds.length) continue;
        for (const toolIdx of toolIndices) {
          if (toolIdx >= toolIds.length) continue;
          await createStepTool({ step_id: stepIds[stepIdx], tool_id: toolIds[toolIdx] });
        }
      }
      updateLastLog("done");

      // =====================================================================
      // 11. Customer journey
      // =====================================================================
      log(`Creating customer journey (${JOURNEY_STAGES.length} stages, ${JOURNEY_TOUCHPOINTS.length} touchpoints)...`);
      const journeyTab = await createTab({ workspace_id: ws.id, name: "Client Journey", canvas_type: "journey" });
      const stageIds: string[] = [];
      for (let i = 0; i < JOURNEY_STAGES.length; i++) {
        const js = JOURNEY_STAGES[i];
        const stage = await createStage({
          workspace_id: ws.id,
          tab_id: journeyTab.id,
          name: js.name,
          position_x: 50 + i * 420,
          position_y: 50,
          width: 380,
          height: 700,
        });
        await fetch(`/api/v1/stages/${stage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: js.desc, channel: js.channel, owner: js.owner }),
        });
        stageIds.push(stage.id);
      }

      const touchpointIds: string[] = [];
      for (let i = 0; i < JOURNEY_TOUCHPOINTS.length; i++) {
        const tp = JOURNEY_TOUCHPOINTS[i];
        const countInStage = JOURNEY_TOUCHPOINTS.slice(0, i).filter((t) => t.stage === tp.stage).length;
        const touchpoint = await createTouchpoint({
          workspace_id: ws.id,
          tab_id: journeyTab.id,
          stage_id: stageIds[tp.stage],
          name: tp.name,
          position_x: 40,
          position_y: 80 + countInStage * 130,
        });
        await updateTouchpoint(touchpoint.id, {
          sentiment: tp.sentiment,
          pain_score: tp.pain,
          gain_score: tp.gain,
          customer_emotion: tp.emotion,
          effort_score: tp.effort,
          impact_score: Math.min(5, tp.gain),
        });
        touchpointIds.push(touchpoint.id);
      }

      for (let i = 0; i < touchpointIds.length - 1; i++) {
        await createTouchpointConnection({
          workspace_id: ws.id,
          tab_id: journeyTab.id,
          source_touchpoint_id: touchpointIds[i],
          target_touchpoint_id: touchpointIds[i + 1],
        });
      }
      updateLastLog("done");

      // =====================================================================
      // 12. Perspectives + annotations
      // =====================================================================
      log("Creating 3 perspectives with annotations on steps & touchpoints...");
      const perspectiveIds: string[] = [];
      for (const p of PERSPECTIVES) {
        const persp = await createPerspective({ workspace_id: ws.id, name: p.name, color: p.color });
        perspectiveIds.push(persp.id);
      }

      for (const [perspIdx, stepIdx, content, rating] of STEP_ANNOTATIONS) {
        if (stepIdx >= stepIds.length) continue;
        await createAnnotation({
          perspective_id: perspectiveIds[perspIdx],
          annotatable_type: "step",
          annotatable_id: stepIds[stepIdx],
          content,
          rating,
        });
      }

      for (const [perspIdx, tpIdx, content, rating] of TOUCHPOINT_ANNOTATIONS) {
        if (tpIdx >= touchpointIds.length) continue;
        await createAnnotation({
          perspective_id: perspectiveIds[perspIdx],
          annotatable_type: "touchpoint",
          annotatable_id: touchpointIds[tpIdx],
          content,
          rating,
        });
      }
      updateLastLog("done");

      // =====================================================================
      // 13. Comments
      // =====================================================================
      log(`Creating ${COMMENTS.length} comments (pain points, ideas, decisions, context)...`);
      for (const c of COMMENTS) {
        if (c.stepIdx >= stepIds.length) continue;
        await createComment({
          workspace_id: ws.id,
          commentable_type: "step",
          commentable_id: stepIds[c.stepIdx],
          content: c.content,
          category: c.category,
        });
      }
      updateLastLog("done");

      // =====================================================================
      // 14. Tasks (implementation checklists)
      // =====================================================================
      log("Creating implementation tasks on key steps...");
      for (const ts of TASK_SETS) {
        if (ts.stepIdx >= stepIds.length) continue;
        for (const title of ts.tasks) {
          await createTask({ workspace_id: ws.id, step_id: stepIds[ts.stepIdx], title });
        }
      }
      updateLastLog("done");

      // =====================================================================
      // 15. Runbook for Quoting section
      // =====================================================================
      log("Creating quoting runbook...");
      await createRunbook({
        workspace_id: ws.id,
        section_id: sectionIds[1],
        name: "13 Design — Quoting Process Runbook",
      });
      updateLastLog("done");

      // =====================================================================
      // 16. Coloring rules
      // =====================================================================
      log(`Creating ${COLORING_RULES.length} coloring rules...`);
      for (let i = 0; i < COLORING_RULES.length; i++) {
        const cr = COLORING_RULES[i];
        await createColoringRule({
          workspace_id: ws.id,
          name: cr.name,
          color: cr.color,
          criteria_type: cr.criteria_type,
          criteria_value: cr.criteria_value,
          is_active: true,
          position: i,
        });
      }
      updateLastLog("done");

      // =====================================================================
      // 17. Improvement ideas (ranked & with ROI)
      // =====================================================================
      log(`Creating ${IMPROVEMENT_IDEAS.length} automation proposals with ROI estimates...`);
      for (const idea of IMPROVEMENT_IDEAS) {
        await createImprovementIdea({
          workspace_id: ws.id,
          title: idea.title,
          description: idea.desc,
          priority: idea.priority,
          status: idea.status,
          linked_step_id: idea.stepIdx !== null && idea.stepIdx < stepIds.length ? stepIds[idea.stepIdx] : null,
        });
      }
      updateLastLog("done");

      // =====================================================================
      // Done!
      // =====================================================================
      log("Seed complete! Redirecting to workspace...", "done");
      setDone(true);

      setTimeout(() => {
        router.push(`/w/${ws.id}/${processTab.id}`);
      }, 2000);
    } catch (err) {
      updateLastLog("error");
      log(`Error: ${err instanceof Error ? err.message : String(err)}`, "error");
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] p-8">
      <div className="w-full max-w-lg">
        <h1 className="text-[20px] font-semibold text-[var(--text-primary)] mb-2">
          Seed: 13 Design — Fraser Rutherford
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] mb-2">
          Creates a fully populated workspace based on the 5 March 2026 process discovery
          session (43 minutes) with prior context from the 3 March pilot discussion and
          4 March WhatsApp.
        </p>
        <div className="text-[12px] text-[var(--text-tertiary)] mb-6 space-y-0.5">
          <p>23 workflow steps across 4 sections (with rich notes & Fraser&apos;s own words)</p>
          <p>18 customer journey touchpoints across 5 stages</p>
          <p>13 tools (10 current + 3 proposed automation)</p>
          <p>3 perspectives: Fraser / Client Experience / Automation Opportunity</p>
          <p>8 ranked automation proposals with ROI estimates</p>
          <p>16 comments (pain points, ideas, decisions, context)</p>
          <p>22 implementation tasks on 4 key steps</p>
          <p>1 quoting process runbook</p>
          <p>4 coloring rules</p>
        </div>

        {!running && !done && (
          <button
            onClick={runSeed}
            className="px-6 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent-blue)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            Create 13 Design Workspace
          </button>
        )}

        {logs.length > 0 && (
          <div className="mt-6 space-y-1.5 max-h-[400px] overflow-y-auto">
            {logs.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                {entry.status === "pending" ? (
                  <Loader2 className="h-3 w-3 animate-spin text-[var(--accent-blue)]" />
                ) : entry.status === "done" ? (
                  <span className="text-green-400">✓</span>
                ) : (
                  <span className="text-red-400">✗</span>
                )}
                <span
                  className={
                    entry.status === "error"
                      ? "text-red-400"
                      : entry.status === "done"
                        ? "text-[var(--text-secondary)]"
                        : "text-[var(--text-primary)]"
                  }
                >
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {done && workspaceId && (
          <p className="mt-4 text-[12px] text-[var(--text-tertiary)]">
            Redirecting to workspace...
          </p>
        )}
      </div>
    </div>
  );
}
