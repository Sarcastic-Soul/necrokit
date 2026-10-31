import { toMarkdown, type Evidence, type Report } from "@necrokit/core";
import { PACKAGE_FIXTURES, REPO_FIXTURES, scanPackage, scanPackageLive, scanRepository, scanRepositoryLive } from "../../lib/necrokit.js";
import { icon } from "./icons.js";

type AppKey = "packages" | "repos";

interface AppConfig {
  key: AppKey;
  name: string;
  kind: string;
  lede: string;
  label: string;
  placeholder: string;
  liveExamples: string[];
  fixtures: Record<string, unknown>;
  scanFixture(fixture: unknown, generatedAt: string): Report;
  scanLive(input: string): Promise<Report>;
}

// Both applications share the same core pipeline; they differ only in adapters, rules, and copy.
const APPS: Record<AppKey, AppConfig> = {
  packages: {
    key: "packages",
    name: "Package Graveyard",
    kind: "npm package",
    lede: "Checks an npm package for deprecation, archived source, stale releases, and a thin maintainer bench.",
    label: "npm package name",
    placeholder: "left-pad",
    liveExamples: ["left-pad", "request", "express", "@types/node"],
    fixtures: PACKAGE_FIXTURES,
    scanFixture: scanPackage,
    scanLive: (name) => scanPackageLive(name),
  },
  repos: {
    key: "repos",
    name: "Repo Reaper",
    kind: "GitHub repository",
    lede: "Checks a public GitHub repository for archived state, failing CI, stale issues, forgotten pull requests, and missing license.",
    label: "GitHub repository (owner/name or URL)",
    placeholder: "expressjs/express",
    liveExamples: ["request/request", "expressjs/express", "moment/moment"],
    fixtures: REPO_FIXTURES,
    scanFixture: scanRepository,
    scanLive: (repo) => scanRepositoryLive(repo),
  },
};

const BAND_LABEL: Record<Report["score"]["band"], string> = {
  healthy: "Alive",
  "at-risk": "Ailing",
  critical: "Dying",
  unknown: "No verdict",
};

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const tabs = [...document.querySelectorAll<HTMLAnchorElement>("[data-app]")];
const form = $<HTMLFormElement>("#scan-form");
const input = $<HTMLInputElement>("#subject");
const inputLabel = $<HTMLLabelElement>("#subject-label");
const lede = $<HTMLParagraphElement>("#lede");
const examples = $<HTMLDivElement>("#examples");
const out = $<HTMLElement>("#report");
const submit = $<HTMLButtonElement>("#scan-btn");

let current: AppConfig = APPS.packages;
let lastReport: Report | null = null;
let scanToken = 0;

function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function safeUrl(url: string | null): string | null {
  return url && /^https:\/\//.test(url) ? url : null;
}

function readHash(): { app: AppKey; q: string | null; fixture: string | null } {
  const [path, query] = location.hash.replace(/^#\/?/, "").split("?");
  const params = new URLSearchParams(query ?? "");
  return { app: path === "repos" ? "repos" : "packages", q: params.get("q"), fixture: params.get("fixture") };
}

function writeHash(app: AppKey, params: Record<string, string>): void {
  const qs = new URLSearchParams(params).toString();
  history.replaceState(null, "", `#/${app}${qs ? `?${qs}` : ""}`);
}

function selectApp(key: AppKey): void {
  current = APPS[key];
  document.body.dataset.app = key;
  for (const tab of tabs) tab.setAttribute("aria-current", String(tab.dataset.app === key));
  inputLabel.textContent = current.label;
  input.placeholder = current.placeholder;
  lede.textContent = current.lede;
  examples.innerHTML = `
    <span class="examples-label">Live</span>
    ${current.liveExamples.map((q) => `<button type="button" class="chip" data-live="${esc(q)}">${esc(q)}</button>`).join("")}
    <span class="examples-label">Recorded, offline</span>
    ${Object.keys(current.fixtures).map((f) => `<button type="button" class="chip chip-fixture" data-fixture="${esc(f)}">${esc(f)}</button>`).join("")}`;
}

function evidenceChip(e: Evidence): string {
  const url = safeUrl(e.url);
  const value = e.value === null ? "none" : String(e.value);
  const body = `<span class="ev-label">${esc(e.label)}</span><span class="ev-value">${esc(value.length > 60 ? `${value.slice(0, 57)}...` : value)}</span>`;
  return url
    ? `<a class="ev" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="Open source: ${esc(e.source)}">${body}${icon("arrowSquareOut")}</a>`
    : `<span class="ev" title="Source: ${esc(e.source)}">${body}</span>`;
}

function renderReport(report: Report, origin: string): void {
  lastReport = report;
  const byId = new Map(report.evidence.map((e) => [e.id, e]));
  const s = report.score;
  const stamp = BAND_LABEL[s.band];
  const scoreText = s.score === null ? "--" : String(s.score);
  const rank = { critical: 0, warning: 1, info: 2 } as const;
  const ordered = [...report.findings].sort((a, b) => rank[a.severity] - rank[b.severity] || b.weight - a.weight);
  const findings = ordered.length
    ? ordered
        .map(
          (f) => `
        <li class="finding sev-${f.severity}">
          <span class="sev">${esc(f.severity)}</span>
          <div>
            <h4>${esc(f.title)}</h4>
            <p>${esc(f.explanation)}</p>
            <div class="evs">${f.evidenceIds.map((id) => byId.get(id)).filter((e): e is Evidence => Boolean(e)).map(evidenceChip).join("")}</div>
          </div>
        </li>`,
        )
        .join("")
    : `<li class="finding finding-none"><p>${s.score === null ? "No rules could run without evidence." : "No rule fired. Nothing here looks like it is dying."}</p></li>`;
  const unavailable = report.unavailable.length
    ? `<section class="block block-unavailable" aria-labelledby="h-unavailable">
        <h3 id="h-unavailable">${icon("warningCircle")} Could not check</h3>
        <ul>${report.unavailable.map((u) => `<li><b>${esc(u.source)}</b> ${esc(u.reason)}</li>`).join("")}</ul>
        <p class="hint">Missing evidence is never guessed. Rules that need it do not fire, and the score only counts what was seen.</p>
      </section>`
    : "";
  const plan = report.plan.steps.length
    ? `<ol class="plan">${report.plan.steps.map((step) => `<li>${esc(step.action)}</li>`).join("")}</ol>`
    : `<p class="muted">${s.score === null ? "No plan until the evidence above can be collected." : "No action needed."}</p>`;
  const evidenceUsed = new Set(report.findings.flatMap((f) => f.evidenceIds)).size;

  out.innerHTML = `
    <article class="cert" aria-labelledby="cert-subject">
      <header class="cert-head">
        <div>
          <p class="cert-kicker">${esc(current.name)} &middot; ${esc(origin)}</p>
          <h2 id="cert-subject">${esc(report.subject)}</h2>
          <p class="muted">Examined ${esc(new Date(report.generatedAt).toUTCString())}</p>
        </div>
        <div class="verdict band-${s.band}">
          <span class="score" aria-label="Health score ${esc(scoreText)} out of 100">${esc(scoreText)}<small>/100</small></span>
          <span class="stamp">${esc(stamp)}</span>
        </div>
      </header>

      <ol class="pipeline" aria-label="Shared core pipeline for this scan">
        <li><b>${report.evidence.length}</b> evidence collected</li>
        <li><b>${report.unavailable.length}</b> unavailable</li>
        <li><b>${report.findings.length}</b> rules fired, citing <b>${evidenceUsed}</b> facts</li>
        <li><b>${s.breakdown.critical}</b> critical &middot; <b>${s.breakdown.warning}</b> warning &middot; <b>${s.breakdown.info}</b> info</li>
        <li><b>${report.plan.steps.length}</b> plan steps</li>
      </ol>

      <section class="block" aria-labelledby="h-findings">
        <h3 id="h-findings">Cause of decline</h3>
        <ul class="findings">${findings}</ul>
      </section>
      ${unavailable}
      <section class="block" aria-labelledby="h-plan">
        <h3 id="h-plan">Revival plan</h3>
        ${plan}
      </section>
      <footer class="cert-foot">
        <button type="button" class="ghost" id="copy-md">${icon("copy")} Copy Markdown</button>
        <button type="button" class="ghost" id="dl-json">${icon("downloadSimple")} Download JSON</button>
        <span class="muted" id="action-status" role="status"></span>
      </footer>
    </article>`;
  out.focus({ preventScroll: true });
}

function renderLoading(subject: string): void {
  out.innerHTML = `<div class="loading" role="status">${icon("magnifyingGlass")} Examining <b>${esc(subject)}</b> against public sources...</div>`;
}

async function runLive(subject: string): Promise<void> {
  const trimmed = subject.trim();
  if (!trimmed) {
    input.focus();
    return;
  }
  const token = ++scanToken;
  const app = current;
  writeHash(app.key, { q: trimmed });
  input.value = trimmed;
  submit.disabled = true;
  renderLoading(trimmed);
  try {
    const report = await app.scanLive(trimmed);
    if (token === scanToken) renderReport(report, "live scan");
  } finally {
    if (token === scanToken) submit.disabled = false;
  }
}

function runFixture(name: string): void {
  scanToken++;
  submit.disabled = false;
  writeHash(current.key, { fixture: name });
  input.value = "";
  renderReport(current.scanFixture(current.fixtures[name], new Date().toISOString()), `recorded fixture "${name}"`);
}

function download(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void runLive(input.value);
});

examples.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!btn) return;
  if (btn.dataset.fixture) runFixture(btn.dataset.fixture);
  else if (btn.dataset.live) void runLive(btn.dataset.live);
});

out.addEventListener("click", async (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!btn || !lastReport) return;
  const status = $<HTMLSpanElement>("#action-status");
  const slug = lastReport.subject.replace(/[^\w.-]+/g, "_");
  if (btn.id === "copy-md") {
    try {
      await navigator.clipboard.writeText(toMarkdown(lastReport));
      status.textContent = "Markdown copied.";
    } catch {
      download(`${slug}.md`, toMarkdown(lastReport), "text/markdown");
      status.textContent = "Clipboard blocked, downloaded instead.";
    }
  } else if (btn.id === "dl-json") {
    download(`${slug}.json`, JSON.stringify(lastReport, null, 2), "application/json");
    status.textContent = "JSON downloaded.";
  }
});

for (const tab of tabs) {
  tab.addEventListener("click", (event) => {
    event.preventDefault();
    const key = tab.dataset.app as AppKey;
    if (key === current.key) return;
    selectApp(key);
    writeHash(key, {});
    runFixture(Object.keys(current.fixtures)[key === "packages" ? 0 : 1]!);
  });
}

function boot(): void {
  const { app, q, fixture } = readHash();
  selectApp(app);
  if (q) void runLive(q);
  else runFixture(fixture && fixture in current.fixtures ? fixture : Object.keys(current.fixtures)[app === "packages" ? 0 : 1]!);
}

boot();
