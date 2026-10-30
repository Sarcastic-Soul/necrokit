// Static demo: pre-rendered reports from the shared core rules and fixtures.
// Regenerate with: node scripts/build-demo.mjs (requires the workspace install).
import { DEMO } from "./demo-data.js";

const app = document.getElementById("app");
const buttons = [...document.querySelectorAll("button[data-app]")];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function render(key) {
  const r = DEMO[key];
  buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.app === key)));
  const findings = r.findings.length
    ? r.findings.map((f) => `<li><span class="sev-${esc(f.severity)}">[${esc(f.severity)}]</span> ${esc(f.title)}: ${esc(f.explanation)}</li>`).join("")
    : "<li>No findings.</li>";
  const plan = r.plan.length
    ? r.plan.map((s) => `<li>${esc(s)}</li>`).join("")
    : "<li>No action needed.</li>";
  app.innerHTML = `
    <section>
      <h2>${esc(r.subject)}</h2>
      <p class="note">${esc(r.kind)} scan. ${esc(r.note)}</p>
      <p class="score band-${esc(r.score.band)}">${esc(r.score.score)}/100 <span class="note">${esc(r.score.band)}</span></p>
    </section>
    <section><h3>Findings</h3><ul>${findings}</ul></section>
    <section><h3>Revival plan</h3><ol>${plan}</ol></section>
  `;
}

buttons.forEach((b) => b.addEventListener("click", () => render(b.dataset.app)));
render("pkg");
