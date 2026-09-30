import { choice, noul, score, type SystemOneResult } from "@typesafe-ai/sdk";

/**
 * What Jev is asked about each timesheet entry.
 *
 * Two different jobs share one request:
 * - `purpose` puts the entry's hours in exactly one bucket, so category totals add up.
 * - `bd_component`, `pitch_component` and `direction` record experience signals that
 *   can overlap (a client lunch about an upcoming tender is BD and pitching).
 * `specificity` rates the narrative itself, so low confidence caused by a vague
 * narrative can be told apart from genuine ambiguity between two categories.
 *
 * All five questions see the same state and run in parallel. `direction` is
 * speculative: code only reads it when the purpose is training, people or knowledge.
 */

/** The timesheet fields Jev sees. Code-owned facts (dates, hours, person names) stay out. */
export type EntryState = {
  entry: {
    narrative: string;
    matter: string | null;
    activity_code: string | null;
    billable: boolean | null;
  };
  timekeeper: {
    role: string | null;
  };
};

export const questions = {
  purpose: choice(
    {
      task: "Classify the main purpose of the timesheet entry in `entry`: what the recorded time was spent achieving.",
      evidence: [
        "Judge mainly from `entry.narrative`; use `entry.matter` and `entry.activity_code` as supporting evidence.",
        "`timekeeper.role` describes the person, not the work. Never infer the purpose from the role alone: a trainee's entry is not training unless the work was training.",
      ],
      rules: [
        "Non-billable does not mean non-client. Fixed-fee, written-off or non-chargeable work on an existing client matter is still client work.",
        "If the entry covers several purposes, choose the one the time mainly served.",
        "Choose unclear when the text does not say what the work was for, rather than guessing from the matter name or role.",
      ],
    },
    {
      client_work: "Work on an existing client matter, billed or not: advice, drafting, negotiation, due diligence, litigation steps, hearings, calls or meetings about the matter.",
      business_development: "Building relationships or the firm's profile without a specific opportunity in view: client entertainment, networking, conferences, speaking, client-facing articles or newsletters, sector-group planning, general marketing.",
      pitching: "Pursuing a specific identified mandate or appointment: pitches, tenders, RFP or RFI responses, fee proposals, credentials for a named prospect, panel applications and panel reviews.",
      training_cpd: "Professional learning or teaching as a development activity: attending or delivering courses, webinars, workshops, seminars, e-learning, study or exams.",
      knowledge: "Building the firm's internal reusable know-how: precedents, templates, practice notes, know-how notes, internal legal updates, knowledge systems.",
      people: "Developing or hiring people: mentoring, supervising, appraisals, coaching, recruitment interviews, graduate recruitment, vacation schemes.",
      pro_bono: "Free legal help for individuals, charities or community groups, including legal clinics and law centres.",
      firm_admin: "Running the practice: timesheets, file opening, conflict checks, billing and WIP reviews, expenses, internal team meetings, IT and compliance tasks.",
      unclear: "The entry does not say enough to tell what the time was spent achieving, for example 'General', 'Catch-up' or 'Internal matters'.",
    },
  ),

  direction: choice(
    {
      task: "For the activity in `entry`, decide whether the person who recorded the time was receiving development, giving it to others, or neither.",
      evidence: [
        "Use `timekeeper.role` only to interpret wording whose direction is otherwise ambiguous, such as 'supervision' or 'appraisal meeting'.",
      ],
    },
    {
      receiving: "The person was being developed: attending training, a course or webinar, studying, or being mentored, supervised, coached or appraised.",
      giving: "The person was developing or assessing others: teaching or presenting training, mentoring, supervising, coaching, appraising, or interviewing candidates.",
      neither: "Nobody was being trained, taught, mentored or assessed in this work.",
    },
  ),

  bd_component: noul(
    "Does the work in `entry` involve building a relationship with, or raising the firm's profile among, clients, prospective clients or referrers, even if that is not its main purpose?",
    {
      true: "Part of the work was relationship or profile building, such as client hospitality, networking, speaking, client-facing writing, or exploring further work with a client.",
      false: "The work was internal, or was matter work with no relationship or profile-building element.",
    },
  ),

  pitch_component: noul(
    "Does the work in `entry` contribute to winning a specific identified piece of work or appointment (a pitch, tender, proposal, bid or panel application), even if that is not its main purpose?",
    {
      true: "Part of the work was aimed at winning a particular mandate or appointment.",
      false: "No part of the work was aimed at winning a particular mandate or appointment.",
    },
  ),

  specificity: score(
    "How clearly does `entry.narrative` describe the work done? Rate the description only, not the value of the work.",
    [
      "Says nothing about the work: blank, or a placeholder such as 'General', 'Admin', 'Catch-up' or 'Internal matters'.",
      "Names a broad kind of activity but not what it was for, such as 'Meeting', 'Research', 'Emails' or 'Drafting'.",
      "Says what was done and roughly what it was for, such as 'Drafting tender response' or 'Team meeting re WIP'.",
      "Says what was done and for what, specifically enough that a colleague could understand it without asking, such as 'Drafting pricing section of tender response for Meridian Rail panel review'.",
    ],
  ),
} as const;

export type EntryAnswers = SystemOneResult<typeof questions>["answers"];
export type Purpose = EntryAnswers["purpose"]["choice"];

/**
 * Starting thresholds only. Calibrate them against the corrections made in the
 * Timesheet Lens entry list before relying on them.
 */
export const THRESHOLDS = {
  /** Below this purpose confidence, the entry goes to the review queue. */
  reviewConfidence: 0.6,
  /** Noul probability at which a secondary BD or pitching signal counts. */
  component: 0.5,
  /** Expected specificity score below which the narrative is flagged as vague. */
  vague: 1.5,
} as const;

export interface EntryResult {
  /** The bucket the hours go in. */
  category: Purpose;
  needsReview: boolean;
  reviewReasons: string[];
  /** Hours that count towards a training requirement (attended, not delivered). */
  countsAsCpd: boolean;
  deliveredTraining: boolean;
  mentoring: "given" | "received" | null;
  bdExperience: boolean;
  pitchExperience: boolean;
  vagueNarrative: boolean;
}

/** Billable entries are client work by firm policy; code decides that, Jev isn't asked. */
export function shouldAsk(state: EntryState): boolean {
  return state.entry.billable !== true;
}

/** Turn raw answers into the dashboard's decisions. Policy lives here, not in the questions. */
export function interpret(a: EntryAnswers): EntryResult {
  const purpose = a.purpose.choice;
  const direction = a.direction.choice;
  const reasons: string[] = [];
  if (purpose === "unclear") reasons.push("unclear purpose");
  if (a.purpose.confidence < THRESHOLDS.reviewConfidence) reasons.push(`low confidence (${a.purpose.confidence.toFixed(2)})`);
  const vague = a.specificity.score < THRESHOLDS.vague;
  if (vague) reasons.push("vague narrative");

  return {
    category: purpose,
    needsReview: purpose === "unclear" || a.purpose.confidence < THRESHOLDS.reviewConfidence,
    reviewReasons: reasons,
    countsAsCpd: purpose === "training_cpd" && direction === "receiving",
    deliveredTraining: purpose === "training_cpd" && direction === "giving",
    mentoring: purpose === "people" ? (direction === "giving" ? "given" : direction === "receiving" ? "received" : null) : null,
    bdExperience: purpose === "business_development" || a.bd_component.noul >= THRESHOLDS.component,
    pitchExperience: purpose === "pitching" || a.pitch_component.noul >= THRESHOLDS.component,
    vagueNarrative: vague,
  };
}
