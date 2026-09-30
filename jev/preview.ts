import { TypeSafeClient } from "@typesafe-ai/sdk";
import { cases } from "./cases.js";
import { interpret, questions, shouldAsk } from "./questions.js";

// Without TYPESAFE_API_KEY this prints one request body so the questions can be reviewed.
// With a key it runs every case and reports where Jev disagrees with the expected label.
// Run it server-side: the key must not be shipped to the browser page.
if (!process.env.TYPESAFE_API_KEY) {
  const first = cases[0]!;
  console.log(JSON.stringify({ state: first.state, questions }, null, 2));
  console.log(`\n${cases.length} cases ready. Set TYPESAFE_API_KEY to run them against Jev.`);
  process.exit(0);
}

const client = new TypeSafeClient();
let agree = 0, dirAgree = 0, dirTotal = 0, inTokens = 0;
for (const c of cases) {
  if (!shouldAsk(c.state)) continue;
  const res = await client.systemOne({ state: c.state, questions });
  inTokens += res.usage.input_tokens;
  const a = res.answers, r = interpret(a);
  const ok = a.purpose.choice === c.expected;
  agree += ok ? 1 : 0;
  if (c.direction) { dirTotal++; dirAgree += a.direction.choice === c.direction ? 1 : 0; }
  const top = Object.entries(a.purpose.probabilities).sort((x, y) => y[1] - x[1]).slice(0, 2)
    .map(([k, p]) => `${k} ${p.toFixed(2)}`).join(", ");
  console.log(`${ok ? "ok  " : "MISS"} ${c.state.entry.narrative}
     expected ${c.expected}${c.direction ? ` / ${c.direction}` : ""}; got ${top} (conf ${a.purpose.confidence.toFixed(2)}), direction ${a.direction.choice}
     bd ${a.bd_component.noul.toFixed(2)} pitch ${a.pitch_component.noul.toFixed(2)} specificity ${a.specificity.score.toFixed(1)}${r.needsReview ? ` -> review: ${r.reviewReasons.join(", ")}` : ""}`);
}
console.log(`\npurpose ${agree}/${cases.length}, direction ${dirAgree}/${dirTotal}, ~${Math.round(inTokens / cases.length)} input tokens per entry, model ${process.env.TYPESAFE_DEFAULT_MODEL ?? "jev-latest"}`);
