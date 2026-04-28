import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";
import { Client } from "pg";

const ARTICLE_SLUG = "trust-your-catcher";
const DEFAULT_OUTPUT = "docs/editorial/trust-your-catcher-abs-observatory.pdf";
const outputPath = path.resolve(process.cwd(), process.env.PDF_OUTPUT ?? DEFAULT_OUTPUT);

await loadEnvLocal();

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error("DATABASE_URL is required. Source .env.local or set DATABASE_URL before running.");
}

async function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  try {
    const contents = await fs.readFile(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] ??= value;
    }
  } catch {
    // The script can still run when DATABASE_URL is already present.
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function markdownToHtml(markdown) {
  const blocks = [];
  const parts = markdown.trim().split(/```(\w+)?\n([\s\S]*?)```/g);

  for (let index = 0; index < parts.length; index += 3) {
    const prose = parts[index] ?? "";
    const language = parts[index + 1];
    const code = parts[index + 2];

    for (const paragraph of prose.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)) {
      if (paragraph.startsWith("## ")) {
        blocks.push(`<h2>${inlineMarkdown(paragraph.slice(3))}</h2>`);
      } else {
        blocks.push(`<p>${inlineMarkdown(paragraph).replace(/\n/g, "<br>")}</p>`);
      }
    }

    if (code != null) {
      blocks.push(`<pre data-language="${escapeHtml(language || "text")}"><code>${escapeHtml(code.trim())}</code></pre>`);
    }
  }

  return blocks.join("\n");
}

function percent(value, digits = 1) {
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

function signedPp(value, digits = 1) {
  const points = Number(value) * 100;
  const sign = points > 0 ? "+" : "";
  return `${sign}${points.toFixed(digits)} pts`;
}

function barHeight(value, min = 0.25, max = 0.75) {
  const ratio = (Number(value) - min) / (max - min);
  return `${Math.max(3, Math.min(100, ratio * 100)).toFixed(1)}%`;
}

function yAxis(ticks) {
  return `
    <div class="y-axis">
      ${ticks.map((tick) => `<span>${percent(tick, 0)}</span>`).join("")}
    </div>
  `;
}

function chartPlot({ axisTicks, className, rows }) {
  return `
    <div class="chart-plot">
      ${yAxis(axisTicks)}
      <div class="${className}">${rows}</div>
    </div>
  `;
}

function chartShell({ title, dek, body, note }) {
  return `
    <aside class="chart-card">
      <div class="chart-eyebrow">Data View</div>
      <h3>${escapeHtml(title)}</h3>
      ${dek ? `<p class="chart-dek">${escapeHtml(dek)}</p>` : ""}
      ${body}
      ${note ? `<p class="analyst-note"><strong>Analyst note</strong> ${escapeHtml(note)}</p>` : ""}
    </aside>
  `;
}

function actorChart(evidence) {
  const rows = evidence.data.map((row) => `
    <div class="vbar-group">
      <div class="vbar-column">
        <div class="vbar actor-${escapeHtml(row.actor)}" style="height:${barHeight(row.overturnRate, 0.3, 0.7)}">
          <span>n=${row.challenges}</span>
        </div>
      </div>
      <div class="vbar-rate">${percent(row.overturnRate)}</div>
      <div class="vbar-label">${escapeHtml(row.label)}</div>
    </div>
  `).join("");

  return chartShell({
    title: evidence.chartTitle,
    dek: evidence.chartDek,
    note: evidence.analystNote,
    body: chartPlot({
      axisTicks: [0.7, 0.6, 0.5, 0.4, 0.3],
      className: "vertical-bars single",
      rows,
    }),
  });
}

function countPressureChart(evidence) {
  const rows = evidence.data.map((row) => `
    <div class="vbar-group">
      <div class="vbar-column pair">
        <div class="vbar catcher" style="height:${barHeight(row.catcherRate, 0.2, 0.8)}">
          <span>n=${row.catcherChallenges}</span>
        </div>
        <div class="vbar batter" style="height:${barHeight(row.batterRate, 0.2, 0.8)}">
          <span>n=${row.batterChallenges}</span>
        </div>
      </div>
      <div class="vbar-rate pair-rate"><span>${percent(row.catcherRate)}</span><span>${percent(row.batterRate)}</span></div>
      <div class="vbar-label">${escapeHtml(row.label)}</div>
      <div class="gap-chip">${signedPp(row.gap)}</div>
    </div>
  `).join("");

  return chartShell({
    title: evidence.chartTitle,
    dek: evidence.chartDek,
    note: evidence.analystNote,
    body: `
      <div class="legend"><span class="legend-catcher"></span>Catcher <span class="legend-batter"></span>Batter</div>
      ${chartPlot({
        axisTicks: [0.8, 0.6, 0.4, 0.2],
        className: "vertical-bars grouped count-bars",
        rows,
      })}
    `,
  });
}

function pitchFamilyChart(evidence) {
  const rows = evidence.data.map((row) => `
    <div class="vbar-group">
      <div class="vbar-column pair">
        <div class="vbar catcher" style="height:${barHeight(row.catcherRate, 0.3, 0.75)}">
          <span>n=${row.catcherChallenges}</span>
        </div>
        <div class="vbar batter" style="height:${barHeight(row.batterRate, 0.3, 0.75)}">
          <span>n=${row.batterChallenges}</span>
        </div>
      </div>
      <div class="vbar-rate pair-rate"><span>${percent(row.catcherRate)}</span><span>${percent(row.batterRate)}</span></div>
      <div class="vbar-label">${escapeHtml(row.label)}</div>
      <div class="gap-chip">${signedPp(row.gap)}</div>
    </div>
  `).join("");

  return chartShell({
    title: evidence.chartTitle,
    dek: evidence.chartDek,
    note: evidence.analystNote,
    body: `
      <div class="legend"><span class="legend-catcher"></span>Catcher <span class="legend-batter"></span>Batter</div>
      ${chartPlot({
        axisTicks: [0.7, 0.6, 0.5, 0.4, 0.3],
        className: "vertical-bars grouped pitch-bars",
        rows,
      })}
    `,
  });
}

function gameflowChart(evidence) {
  const rows = evidence.data.map((row) => `
    <div class="vbar-group">
      <div class="vbar-column">
        <div class="vbar catcher" style="height:${barHeight(row.overturnRate, 0.4, 0.8)}">
          <span>n=${row.challenges}</span>
        </div>
      </div>
      <div class="vbar-rate">${percent(row.overturnRate)}</div>
      <div class="vbar-label">${escapeHtml(row.label)}</div>
    </div>
  `).join("");

  return chartShell({
    title: evidence.chartTitle,
    dek: evidence.chartDek,
    note: evidence.analystNote,
    body: chartPlot({
      axisTicks: [0.8, 0.7, 0.6, 0.5, 0.4],
      className: "vertical-bars single gameflow-bars",
      rows,
    }),
  });
}

function renderChart(evidence) {
  if (!evidence?.chartKey) return "";
  if (evidence.chartKey === "abs_actor_comparison") return actorChart(evidence);
  if (evidence.chartKey === "abs_count_pressure_gap") return countPressureChart(evidence);
  if (evidence.chartKey === "abs_pitch_family_gap") return pitchFamilyChart(evidence);
  if (evidence.chartKey === "abs_catcher_gameflow") return gameflowChart(evidence);
  return "";
}

async function fetchArticle() {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    const articleResult = await client.query(
      `
        SELECT article_id, title, dek, author_name, body_md, source_date
        FROM editorial.articles
        WHERE slug = $1
        LIMIT 1
      `,
      [ARTICLE_SLUG],
    );
    const article = articleResult.rows[0];
    if (!article) throw new Error(`Article not found: ${ARTICLE_SLUG}`);

    const sectionsResult = await client.query(
      `
        SELECT section_key, heading, body_md, evidence_payload
        FROM editorial.article_sections
        WHERE article_id = $1
        ORDER BY section_order ASC
      `,
      [article.article_id],
    );

    return { article, sections: sectionsResult.rows };
  } finally {
    await client.end();
  }
}

function renderSection(section, options = {}) {
  const isMethodology = section.section_key === "evidence_notes";
  const classNames = ["article-section"];
  if (isMethodology) classNames.push("methodology");
  if (options.extraClass) classNames.push(options.extraClass);
  const heading = options.heading ?? section.heading;

  return `
    <section class="${classNames.join(" ")}">
      <h2>${escapeHtml(heading)}</h2>
      <div class="section-copy">${markdownToHtml(section.body_md)}</div>
      ${renderChart(section.evidence_payload)}
    </section>
  `;
}

function buildHtml({ article, sections }) {
  const methodologySection = sections.find((section) => section.section_key === "evidence_notes");
  const narrativeSections = sections.filter((section) => section.section_key !== "evidence_notes");
  const renderedNarrativeSections = narrativeSections.map((section) => {
    const rendered = renderSection(section);
    return section.section_key === "org_takeaway"
      ? rendered.replace('class="article-section"', 'class="article-section final-section"')
      : rendered;
  }).join("\n");
  const renderedAppendix = methodologySection
    ? renderSection(methodologySection, {
      extraClass: "appendix",
      heading: `Appendix: ${methodologySection.heading}`,
    })
    : "";

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(article.title)} | ABS Observatory</title>
        <style>
          @page {
            size: Letter;
            margin: 0.58in 0.6in 0.62in;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            background: #fffdf8;
            color: #24201b;
            font-family: Georgia, "Times New Roman", serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            font-size: 11.4pt;
            line-height: 1.48;
          }

          article {
            max-width: 7.2in;
            margin: 0 auto;
          }

          .kicker,
          .chart-eyebrow,
          .byline,
          .legend,
          .analyst-note strong {
            font-family: Arial, Helvetica, sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.13em;
          }

          .kicker {
            margin: 0 0 0.12in;
            color: #88775d;
            font-size: 7.5pt;
            font-weight: 800;
          }

          h1,
          h2,
          h3 {
            font-family: "Arial Narrow", Impact, Haettenschweiler, sans-serif;
            letter-spacing: 0;
            color: #211d18;
            break-after: avoid;
            page-break-after: avoid;
          }

          h1 {
            margin: 0 0 0.08in;
            font-size: 36pt;
            line-height: 0.94;
            text-transform: uppercase;
          }

          .dek {
            margin: 0;
            max-width: 6.3in;
            color: #625b51;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14pt;
            line-height: 1.35;
          }

          .byline {
            margin: 0.22in 0 0;
            font-size: 8pt;
            font-weight: 800;
            color: #4a4037;
          }

          .byline span {
            font-family: Georgia, "Times New Roman", serif;
            font-style: italic;
            font-weight: 400;
            letter-spacing: 0;
            text-transform: none;
          }

          .hero {
            padding-bottom: 0.24in;
            border-bottom: 1px solid #ded6ca;
            margin-bottom: 0.28in;
          }

          p {
            margin: 0 0 0.13in;
            orphans: 3;
            widows: 3;
          }

          .intro {
            margin-bottom: 0.08in;
          }

          .article-section {
            margin-top: 0.24in;
          }

          .article-section h2 {
            margin: 0 0 0.1in;
            font-size: 24pt;
            line-height: 0.96;
            text-transform: uppercase;
          }

          .section-copy {
            max-width: 6.75in;
          }

          .chart-card {
            margin: 0.16in 0 0.24in;
            padding: 0.18in;
            border: 1px solid #ded4c5;
            border-radius: 16px;
            background: #fff8eb;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .chart-eyebrow {
            color: #88775d;
            font-size: 7.2pt;
            font-weight: 800;
          }

          .chart-card h3 {
            margin: 0.05in 0 0.05in;
            font-size: 20pt;
            line-height: 1;
            text-transform: uppercase;
          }

          .chart-dek {
            margin: 0 0 0.13in;
            color: #625b51;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8.4pt;
            line-height: 1.35;
          }

          .legend {
            display: flex;
            gap: 0.18in;
            align-items: center;
            margin: 0 0 0.1in;
            color: #625b51;
            font-size: 7.4pt;
            font-weight: 800;
          }

          .legend span {
            width: 0.12in;
            height: 0.12in;
            border-radius: 999px;
            display: inline-block;
            margin-right: -0.12in;
          }

          .legend-catcher {
            background: #176f66;
          }

          .legend-batter {
            background: #c94614;
          }

          .chart-plot {
            display: grid;
            grid-template-columns: 0.34in minmax(0, 1fr);
            gap: 0.08in;
            margin-top: 0.08in;
          }

          .y-axis {
            height: 1.28in;
            margin-top: 0.15in;
            padding-right: 0.05in;
            border-right: 1px solid #d8cbbb;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: flex-end;
            color: #7a7064;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 6.8pt;
            font-weight: 800;
            line-height: 1;
          }

          .vertical-bars {
            position: relative;
            display: grid;
            align-items: end;
            min-height: 1.78in;
            padding: 0.15in 0.08in 0.05in;
            border-bottom: 1px solid #cfc3b4;
            background:
              linear-gradient(to top, rgba(75, 63, 49, 0.09) 1px, transparent 1px) 0 0 / 100% 25%,
              linear-gradient(to bottom, transparent, transparent);
          }

          .vertical-bars.single {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.24in;
          }

          .vertical-bars.gameflow-bars {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .vertical-bars.grouped {
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 0.13in;
          }

          .vertical-bars.pitch-bars {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.24in;
          }

          .vbar-group {
            min-width: 0;
            display: grid;
            grid-template-rows: 1.28in auto auto auto;
            align-items: end;
            justify-items: center;
            gap: 0.035in;
            font-family: Arial, Helvetica, sans-serif;
          }

          .vbar-column {
            width: 100%;
            height: 1.28in;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            gap: 0.05in;
          }

          .vbar-column.pair {
            gap: 0.035in;
          }

          .vbar {
            position: relative;
            width: 0.34in;
            min-height: 0.08in;
            border-radius: 8px 8px 0 0;
            background: #176f66;
          }

          .vbar.pair,
          .vbar-column.pair .vbar {
            width: 0.24in;
          }

          .vbar.batter,
          .vbar.actor-batter {
            background: #c94614;
          }

          .vbar.actor-pitcher {
            background: #2f62d8;
          }

          .vbar.catcher,
          .vbar.actor-catcher {
            background: #176f66;
          }

          .vbar span {
            position: absolute;
            left: 50%;
            top: -0.15in;
            transform: translateX(-50%);
            white-space: nowrap;
            color: #6b6258;
            font-size: 6.7pt;
            font-weight: 800;
          }

          .vbar-rate {
            color: #2a241f;
            font-size: 8pt;
            font-weight: 800;
            line-height: 1;
          }

          .pair-rate {
            width: 0.66in;
            display: flex;
            justify-content: center;
            gap: 0.08in;
            font-size: 7.3pt;
          }

          .vbar-label {
            max-width: 0.96in;
            min-height: 0.2in;
            color: #62584e;
            font-size: 7.3pt;
            font-weight: 800;
            line-height: 1.05;
            text-align: center;
          }

          .gap-chip {
            min-width: 0.52in;
            border-radius: 999px;
            background: #f0e2c7;
            padding: 0.025in 0.05in;
            text-align: center;
            color: #45392d;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 6.8pt;
            font-weight: 800;
          }

          .analyst-note {
            margin: 0.14in 0 0;
            padding-top: 0.12in;
            border-top: 1px solid #e0d7ca;
            color: #50483f;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8.2pt;
            line-height: 1.38;
          }

          .analyst-note strong {
            color: #88775d;
            font-size: 7pt;
            margin-right: 0.04in;
          }

          .methodology {
            margin-top: 0.28in;
            padding: 0.18in;
            border: 1px solid #ded4c5;
            border-radius: 16px;
            background: #fff8eb;
          }

          .appendix {
            break-before: page;
            page-break-before: always;
          }

          .methodology h2 {
            font-size: 22pt;
          }

          .methodology p {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8.6pt;
            line-height: 1.42;
            margin-bottom: 0.1in;
          }

          pre {
            margin: 0.08in 0 0.13in;
            padding: 0.1in;
            border: 1px solid #dfd5c7;
            border-radius: 10px;
            background: #f5eee3;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            font-family: "Courier New", monospace;
            font-size: 7.4pt;
            line-height: 1.34;
          }

          code {
            font-family: "Courier New", monospace;
            font-size: 0.92em;
          }

          .final-section {
            margin-top: 0.28in;
            padding-top: 0.22in;
            border-top: 2px solid #ded4c5;
          }

          .final-section h2 {
            font-size: 25pt;
          }
        </style>
      </head>
      <body>
        <article>
          <header class="hero">
            <div class="kicker">ABS Observatory | April 2026</div>
            <h1>${escapeHtml(article.title)}</h1>
            <p class="dek">${escapeHtml(article.dek)}</p>
            <p class="byline"><span>By</span> ${escapeHtml(article.author_name ?? "Colby Reichenbach")}</p>
          </header>

          <section class="intro">
            ${markdownToHtml(article.body_md)}
          </section>

          ${renderedNarrativeSections}
          ${renderedAppendix}
        </article>
      </body>
    </html>`;
}

const data = await fetchArticle();
const html = buildHtml(data);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.pdf({
  path: outputPath,
  format: "Letter",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: `
    <div style="width:100%; font-family:Arial, sans-serif; font-size:8px; color:#776b5f; padding:0 0.6in; display:flex; justify-content:space-between;">
      <span>Trust Your Catcher | ABS Observatory</span>
      <span><span class="pageNumber"></span>/<span class="totalPages"></span></span>
    </div>
  `,
});
await browser.close();

console.log(JSON.stringify({ outputPath }, null, 2));
