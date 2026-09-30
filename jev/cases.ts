import type { EntryState, Purpose } from "./questions.js";

/**
 * Hand-labelled entries chosen to probe the category boundaries, not typical cases.
 * Replace and extend with anonymised entries from a real export and the
 * corrections made in Timesheet Lens.
 */
export interface Case {
  state: EntryState;
  expected: Purpose;
  /** Expected direction, where it matters. */
  direction?: "receiving" | "giving" | "neither";
  why: string;
}

const e = (narrative: string, opts: { matter?: string; billable?: boolean | null; role?: string; code?: string } = {}): EntryState => ({
  entry: { narrative, matter: opts.matter ?? null, activity_code: opts.code ?? null, billable: opts.billable ?? false },
  timekeeper: { role: opts.role ?? null },
});

export const cases: Case[] = [
  { state: e("Client lunch with Meridian Rail GC to discuss their upcoming panel review", { role: "Partner" }), expected: "pitching", why: "lunch sounds like BD, but it serves a specific panel review; bd_component should also be high" },
  { state: e("Drafting article on UK merger control for client newsletter", { role: "Associate" }), expected: "business_development", why: "client-facing writing is BD, not knowledge" },
  { state: e("Know-how note on UK merger control for the team", { role: "Associate" }), expected: "knowledge", why: "same topic, internal audience" },
  { state: e("Presenting AML training to Oakfield Pharma legal team", { role: "Senior Associate" }), expected: "business_development", direction: "giving", why: "teaching a client is profile building; not the presenter's CPD" },
  { state: e("Attending AML webinar", { role: "Associate" }), expected: "training_cpd", direction: "receiving", why: "counts towards CPD" },
  { state: e("Running internal training session on disclosure for trainees", { role: "Senior Associate" }), expected: "training_cpd", direction: "giving", why: "delivered training is not the presenter's CPD" },
  { state: e("Supervision meeting", { role: "Trainee" }), expected: "people", direction: "receiving", why: "role resolves the direction" },
  { state: e("Supervision meeting", { role: "Partner" }), expected: "people", direction: "giving", why: "same words, opposite direction" },
  { state: e("Research on limitation point", { role: "Trainee", matter: "Corvid Bank v Mallory", billable: false }), expected: "client_work", why: "non-billable but on a client matter; the Trainee role must not pull it to training" },
  { state: e("Completion call, fee capped so time written off", { matter: "Pellham Estates – portfolio sale", billable: false }), expected: "client_work", why: "written-off client work" },
  { state: e("Legal clinic – housing queries", { matter: "Pro bono" }), expected: "pro_bono", why: "clear case" },
  { state: e("Conflict check and file opening for new Stanway instruction"), expected: "firm_admin", why: "names a client but is practice admin" },
  { state: e("General", { matter: "Non-chargeable" }), expected: "unclear", why: "should say unclear, not guess" },
  { state: e("Catch-up", { role: "Partner" }), expected: "unclear", why: "should not guess BD from the Partner role" },
  { state: e("Graduate recruitment interviews", { role: "Associate" }), expected: "people", direction: "giving", why: "interviewing is giving/assessing" },
  { state: e("Fee proposal for Lumen Capital refinancing", { matter: "Prospects" }), expected: "pitching", why: "specific mandate" },
  { state: e("Speaking at regional law society dinner"), expected: "business_development", why: "profile building with no named mandate" },
];
