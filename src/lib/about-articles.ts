export type AboutArticleKind = "project" | "explainer" | "founder" | "profile";

export type AboutArticleFact = {
  label: string;
  value: string;
};

export type AboutArticleSection = {
  eyebrow?: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  stats?: AboutArticleFact[];
  pullQuote?: string;
};

export type AboutFeatureCard = {
  title: string;
  subtitle: string;
  imageSrc: string;
  imageAlt: string;
  subtitleColor: string;
  linkHref: string;
  stats: AboutArticleFact[];
  description: string;
  rotateDegree: number;
};

export type AboutArticleSource = {
  label: string;
  href: string;
};

export type AboutArticle = {
  slug: string;
  aliases?: string[];
  title: string;
  dek: string;
  authorName: string;
  articleType: AboutArticleKind;
  publishedAt: string;
  publishedLabel: string;
  readTime: string;
  accentClass: string;
  heroEyebrow: string;
  heroHeading: string;
  leadParagraphs: string[];
  sections: AboutArticleSection[];
  quickFacts: AboutArticleFact[];
  featureCards?: AboutFeatureCard[];
  sources?: AboutArticleSource[];
  relatedSlugs: string[];
};

export const ABOUT_ARTICLES: AboutArticle[] = [
  {
    slug: "about-aibs",
    aliases: ["aibs-observatory", "aibs", "observatory"],
    title: "About AiBS",
    dek: "A product brief for the public-facing ABS site: what it covers, who it serves, and what makes it different from a generic baseball dashboard.",
    authorName: "Colby Reichenbach",
    articleType: "project",
    publishedAt: "2026-03-24",
    publishedLabel: "Product Brief",
    readTime: "5 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "Product Dossier",
    heroHeading: "AiBS is built to make MLB's ABS era legible.",
    leadParagraphs: [
      "AiBS is a baseball product centered on the Automated Ball-Strike challenge system. It tracks challenge events, pitcher-batter context, team usage patterns, umpire behavior, and game-level leverage so a user can inspect how ABS is actually functioning instead of arguing from memory or vibes.",
      "The public product is organized around a small set of routes that answer different questions clearly: the home page frames the current ABS landscape, team pages show challenge identity, umpire pages show review pressure and volatility, game pages show event-level context, and the About and Articles desks explain the product and publish analysis around it.",
      "The point is not to flood the user with every possible baseball stat. The point is to turn one specific rules change into a product that is readable, inspectable, and useful for fans, analysts, and anyone evaluating how ABS changes baseball behavior.",
    ],
    quickFacts: [
      { label: "Primary focus", value: "ABS challenge tracking, context, and explanation" },
      { label: "Core public routes", value: "Home, teams, umpires, games, articles, and About" },
      { label: "Public AI scope", value: "Visualizer only on selected analytics pages" },
    ],
    sections: [
      {
        eyebrow: "What It Is",
        heading: "A product, not just a chart dump.",
        paragraphs: [
          "The site is built around a small number of public surfaces with distinct jobs. The home page acts like a front page. Team pages show how clubs are using the challenge system. Umpire pages show which plate umpires are steady, shaky, or exposed. Game pages show what happened at the event level and tie challenge decisions back to count state, leverage, and downstream value.",
          "That routing structure matters because a baseball product is easier to trust when each page has a clear purpose. AiBS is trying to answer one practical question at a time instead of collapsing the whole system into one crowded dashboard.",
        ],
        bullets: [
          "Home: league framing and current challenge landscape.",
          "Teams: identity, pressure usage, and challenge style.",
          "Umpires: review exposure, variance, and performance framing.",
          "Games: live or postgame event context, leverage, and challenge review.",
        ],
      },
      {
        eyebrow: "Why It Exists",
        heading: "ABS needed a front-end that speaks plain baseball.",
        paragraphs: [
          "The data around ABS already existed in pieces, but the public conversation around it was still muddy. Fans could debate whether a team was challenging well or whether an umpire was unstable, but they had a weak path from claim to evidence. AiBS exists to make that evidence easy to inspect.",
          "That standard applies to the product design too. Charts, tables, and AI explanation tools are only useful if they help a user reason through the subject faster and more accurately. The product is meant to support baseball judgment, not replace it with interface theater.",
        ],
        pullQuote: "The product exists to make baseball arguments more accountable.",
      },
    ],
    relatedSlugs: ["how-aibs-works", "model-layer", "abs-explained"],
  },
  {
    slug: "about-me",
    title: "About Me",
    dek: "The builder's perspective behind AiBS and the standards guiding the product, data, and launch decisions.",
    authorName: "Colby Reichenbach",
    articleType: "founder",
    publishedAt: "2026-03-24",
    publishedLabel: "Builder Note",
    readTime: "4 min read",
    accentClass: "text-[#2d5a27]",
    heroEyebrow: "Founder Dossier",
    heroHeading: "AiBS is built by one person working across product, engineering, and analysis.",
    leadParagraphs: [
      "AiBS is an independent product built by Colby Reichenbach. The work spans route design, frontend systems, data ingestion, database views, model audits, AI tooling, and the writing layer around the product.",
      "That stack matters because the product is opinionated end to end. The interface, the models, the editorial framing, and the operational workflow all need to agree with each other. AiBS is not assembled as separate disconnected tracks; it is built as one system.",
      "The standard behind the work is simple: claims should be inspectable, product decisions should be intentional, and technical sophistication only matters if it helps a user understand baseball more clearly.",
    ],
    quickFacts: [
      { label: "Role", value: "Founder, product builder, engineer, and analyst" },
      { label: "Working style", value: "End-to-end product ownership" },
      { label: "Default standard", value: "Clarity first, then sophistication" },
    ],
    sections: [
      {
        eyebrow: "Approach",
        heading: "The product and the codebase are meant to agree.",
        paragraphs: [
          "A recurring design rule in AiBS is that the public explanation should match the actual implementation. If the site says a model is audited, there should be scripts and artifacts behind that claim. If a page says a chart is AI-explained, the AI layer should be scoped and observable instead of hand-wavy.",
          "That is why the product includes an unusually explicit About desk. It is not there as filler. It is there because part of the value of AiBS is showing how the product was built and what standards it is willing to defend.",
        ],
      },
      {
        eyebrow: "Priority",
        heading: "Trust beats flash.",
        paragraphs: [
          "Launch decisions in this codebase reflect that bias. Public AI was narrowed to the visualizer instead of every possible surface. Query Lab and Copilot were gated for launch. Model audits, smoke checks, route timing, and repo-integrity guardrails were treated as launch work, not optional polish.",
          "That is the kind of bar I want the project to maintain. Better to ship a smaller product with coherent behavior than a broader product with blurry edges.",
        ],
      },
    ],
    relatedSlugs: ["why-i-built-aibs", "how-aibs-works", "ai-layer"],
  },
  {
    slug: "why-i-built-aibs",
    title: "Why I Built AiBS",
    dek: "The product motivation behind AiBS: better baseball conversations, clearer evidence, and a more useful front door to ABS.",
    authorName: "Colby Reichenbach",
    articleType: "founder",
    publishedAt: "2026-03-24",
    publishedLabel: "Founder Note",
    readTime: "4 min read",
    accentClass: "text-[#2d5a27]",
    heroEyebrow: "Product Motivation",
    heroHeading: "The rules changed. The public tools around them were still weak.",
    leadParagraphs: [
      "ABS created a new baseball conversation almost overnight. Teams were managing a challenge resource. Umpires were being evaluated in a new way. Fans were arguing about fairness, pace, and strategy. But the public product layer around that conversation still felt thin.",
      "AiBS was built to fill that gap. The goal was not to create a generic baseball site with ABS as one category among many. The goal was to make ABS the primary subject and then build the surrounding product carefully enough that the conversation around it could improve.",
      "That means fewer empty takes, fewer unsupported claims, and a better path from instinct to evidence.",
    ],
    quickFacts: [
      { label: "Problem", value: "ABS changed the sport faster than public tools caught up" },
      { label: "Audience", value: "Fans first, but legible enough for analysts and org readers" },
      { label: "Thesis", value: "Baseball arguments get better when the evidence is visible" },
    ],
    sections: [
      {
        eyebrow: "Gap",
        heading: "The public conversation needed structure.",
        paragraphs: [
          "A lot of baseball discourse around ABS still defaults to reaction instead of inspection. That is understandable because the raw subject is technical: strike-zone geometry, challenge retention, leverage context, and overturn behavior are not easy to hold in your head without a good product.",
          "AiBS tries to solve that by giving users simple routes into the system. Instead of asking them to reverse-engineer a pile of raw events, it gives them dedicated surfaces for teams, umpires, games, and explanations.",
        ],
      },
      {
        eyebrow: "Standard",
        heading: "The product should earn stronger opinions.",
        paragraphs: [
          "The aim is not to remove opinion from baseball. It is to sharpen it. If a user thinks a team is spending challenges well, there should be a chart and a page that let them test that instinct. If a user thinks an umpire has become volatile, the product should help them inspect that pattern rather than just repeat it.",
          "That is the underlying reason AiBS exists. It is a tool for better baseball reasoning.",
        ],
        pullQuote: "The product is meant to give baseball arguments a better foundation, not a louder microphone.",
      },
    ],
    relatedSlugs: ["about-aibs", "about-me", "abs-explained"],
  },
  {
    slug: "abs-explained",
    title: "What ABS Actually Is",
    dek: "A plain-language explanation of MLB's current ABS challenge system and the geometry rules AiBS is trying to mirror.",
    authorName: "Colby Reichenbach",
    articleType: "explainer",
    publishedAt: "2026-03-24",
    publishedLabel: "Rules Primer",
    readTime: "6 min read",
    accentClass: "text-blue-900",
    heroEyebrow: "Rules Explainer",
    heroHeading: "MLB's current ABS implementation is a challenge system, not full robot umpiring.",
    leadParagraphs: [
      "ABS in the majors means the plate umpire still calls balls and strikes, but the pitcher, catcher, or batter can immediately challenge a call and send it to the tracking system for a correction.",
      "That distinction matters because the product logic needs to mirror the league's actual operational system, not just the abstract rulebook strike-zone language. AiBS therefore models challenge outcomes around the current challenge format, batter-specific zone bounds, and MLB's published ABS strike-zone framing.",
      "The public version of the product is designed around that reality: MLB chose a correction system with strategic constraints, not a computer that replaces the plate umpire on every pitch.",
    ],
    quickFacts: [
      { label: "Format", value: "Challenge system" },
      { label: "Eligible challengers", value: "Pitcher, catcher, or batter only" },
      { label: "AiBS geometry goal", value: "Mirror the current MLB ABS strike-zone rules as closely as the data allows" },
    ],
    sections: [
      {
        eyebrow: "On-field process",
        heading: "The review is immediate and intentionally narrow.",
        paragraphs: [
          "MLB's current system is built for fast correction. The challenge has to come from the pitcher, catcher, or batter immediately after the call. Teams retain successful challenges and lose unsuccessful ones. The point is to create a correction mechanism without turning every plate appearance into a manager-driven replay workflow.",
          "That strategic layer matters to AiBS because challenge usage is not just about correctness. It is also about timing, leverage, and resource management.",
        ],
      },
      {
        eyebrow: "Geometry",
        heading: "AiBS is aligned to current ABS logic, not a vague zone approximation.",
        paragraphs: [
          "The product uses batter-specific strike-zone resolution and direction-aware inside/outside geometry for challenge analysis. During the current launch cycle, the model layer was updated to align overturn logic more closely with MLB's published ABS framing rather than a generic stat-zone approximation.",
          "That means the product distinguishes between called strikes that should become balls and called balls that should become strikes, instead of treating all distance from the boundary the same way.",
        ],
      },
    ],
    sources: [
      {
        label: "MLB strike-zone glossary",
        href: "https://www.mlb.com/glossary/rules/strike-zone",
      },
      {
        label: "MLB ABS explainer",
        href: "https://www.mlb.com/brewers/news/automated-ball-strike-calls-mlb-spring-games",
      },
      {
        label: "AP reporting on MLB ABS challenge rollout",
        href: "https://apnews.com/article/mlb-robot-umpires-abs-9034454b5a795262bf97446ff38d0361",
      },
    ],
    relatedSlugs: ["about-aibs", "model-layer", "audits-and-monitoring"],
  },
  {
    slug: "how-aibs-works",
    title: "How AiBS Works",
    dek: "An end-to-end walkthrough of the product: ingest, database, models, public routes, AI surfaces, and audit workflow.",
    authorName: "Colby Reichenbach",
    articleType: "project",
    publishedAt: "2026-03-24",
    publishedLabel: "System Overview",
    readTime: "7 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "System Walkthrough",
    heroHeading: "AiBS is an end-to-end baseball product, not just a frontend over raw feeds.",
    leadParagraphs: [
      "The system starts with MLB and related public baseball data, moves through ETL and database transforms, resolves ABS-specific geometry, computes model outputs and summary marts, and then feeds those results into purpose-built public routes.",
      "That same system also supports model audits, usage tracking, admin analytics, and controlled AI surfaces. The product layer and the operational layer are part of the same application, which is why launch work has included smoke checks, audit runs, alerting, and repo-integrity safeguards alongside frontend changes.",
      "The result is a site where the baseball-facing experience and the engineering workflow are tightly coupled instead of being treated as separate worlds.",
    ],
    quickFacts: [
      { label: "Storage", value: "Postgres with app-level marts and cached loaders" },
      { label: "Runtime", value: "Next.js app routes with dynamic server rendering and streaming" },
      { label: "Ops loop", value: "QA, audits, alerts, and release smoke" },
    ],
    sections: [
      {
        eyebrow: "Flow",
        heading: "From ingest to page render.",
        paragraphs: [
          "The ingest layer pulls baseball data, challenge events, and related profile information into Postgres. Database views and summary marts then normalize that data into the shapes used by the public routes, model audits, and AI explanation tools.",
          "The public loaders in the app then compose those pieces route by route. Some pages use streaming and Suspense so the shell appears quickly while lower-priority sections continue to load.",
        ],
      },
      {
        eyebrow: "Launch posture",
        heading: "The current public scope is intentionally narrower than the full system.",
        paragraphs: [
          "For Opening Day, AiBS is launching with the public core product and visualizer AI surfaces only. Copilot, Query Lab, and daily AI editorial automation are not part of the public promise. That scope was enforced in code so the walkthrough and the product match each other.",
          "That is a product decision as much as an engineering one. Stability matters more than exposing every internal surface on day one.",
        ],
        bullets: [
          "Public: home, teams, umpires, games, articles, About, and visualizer AI on selected analytics pages.",
          "Gated: Copilot, Query Lab, and internal/admin workflows.",
        ],
      },
    ],
    relatedSlugs: ["product-layer", "model-layer", "ai-layer"],
  },
  {
    slug: "product-layer",
    aliases: ["architect"],
    title: "The Product Layer",
    dek: "How the public routes, layout decisions, and UI rules are designed to make ABS analysis readable under real user attention.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-24",
    publishedLabel: "Product Layer",
    readTime: "5 min read",
    accentClass: "text-blue-900",
    heroEyebrow: "Product Design",
    heroHeading: "Each route is supposed to answer one baseball question quickly.",
    leadParagraphs: [
      "AiBS is not designed as a single mega-dashboard. The product layer is routed so the user can start from the question they actually have: what is happening right now, how is a team using ABS, what kind of review profile does an umpire have, or what changed in one specific game.",
      "That structure keeps the interface from collapsing under its own ambition. A product about ABS can get noisy fast. The route design is there to keep the experience opinionated and readable.",
      "The launch cycle also forced the product layer to become more explicit. Public AI was narrowed, the About desk was reframed as a permanent dossier, and walkthrough planning was aligned to the routes that are actually stable and public.",
    ],
    quickFacts: [
      { label: "Design principle", value: "One route, one clear job" },
      { label: "Public AI usage", value: "Visualizer surfaces only" },
      { label: "Launch bias", value: "Stable core product over maximum surface area" },
    ],
    sections: [
      {
        eyebrow: "Route roles",
        heading: "The desks are deliberate.",
        paragraphs: [
          "The home page frames the league. Team pages show challenge identity. Umpire pages show review behavior. Game pages show event-level context. The About desk explains the product itself, and the Articles desk handles recurring editorial work. That separation is intentional product architecture, not just URL organization.",
          "It also helps the visual language stay focused. Each page can prioritize the charts and copy that belong to its specific job instead of trying to be everything at once.",
        ],
      },
      {
        eyebrow: "Launch discipline",
        heading: "Gating is part of product quality.",
        paragraphs: [
          "During launch prep, several features were intentionally gated or deferred rather than exposed half-ready. That includes global Copilot, Query Lab, and public daily AI editorial automation. The product layer is stronger because launch scope was treated as a first-class decision instead of a temporary hack.",
        ],
        pullQuote: "A smaller product with coherent boundaries is stronger than a broader product with fuzzy ones.",
      },
    ],
    relatedSlugs: ["about-aibs", "how-aibs-works", "ai-layer"],
  },
  {
    slug: "model-layer",
    aliases: ["brain"],
    title: "The Model Layer",
    dek: "The baseball logic underneath the product: expectation models, challenge value, overturn logic, rubrics, and ABS geometry.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-24",
    publishedLabel: "Model Layer",
    readTime: "7 min read",
    accentClass: "text-red-900",
    heroEyebrow: "Baseball Logic",
    heroHeading: "The model layer exists to make the product's baseball claims defensible.",
    leadParagraphs: [
      "AiBS does not rely on one giant model. The product uses a stack of baseball-specific logic: challenge event normalization, zone geometry, overturn estimation, run and win expectancy deltas, leverage framing, decision value logic, and summary rubrics for teams and umpires.",
      "Some of those outputs are strongly model-driven. Others are heuristic or rules-based. Part of the job of this page is to make that distinction explicit instead of pretending everything is the same kind of intelligence.",
      "The current launch cycle included major work on the ABS geometry path, calibration, and audit flow so that the production logic and the evaluation scripts agree with each other.",
    ],
    quickFacts: [
      { label: "Core domains", value: "Geometry, leverage, overturn, value, and report-card layers" },
      { label: "Key launch work", value: "Direction-aware ABS geometry and calibrated overturn buckets" },
      { label: "Validation rule", value: "Production logic and audit logic should match" },
    ],
    sections: [
      {
        eyebrow: "Expectation models",
        heading: "Run and win value are part of the challenge story.",
        paragraphs: [
          "Challenge evaluation in AiBS is not limited to overturn rate. The product also carries count-state deltas, run expectancy, win expectancy, and decision-value interpretations so a user can reason about when a challenge mattered and not just whether it succeeded.",
          "Those value layers are not forced into every public surface equally. Fan-mode routes now skip some of the heavier value joins when the page is not actually showing those numbers, which was part of the recent launch optimization pass.",
        ],
      },
      {
        eyebrow: "ABS geometry",
        heading: "The product now uses direction-aware challenge geometry.",
        paragraphs: [
          "A major launch change was correcting the geometry so called strikes that should become balls and called balls that should become strikes are not bucketed symmetrically by mistake. The logic is now direction-aware and calibrated with audit scripts so the same geometry interpretation is used in runtime and evaluation.",
          "That does not make the system perfect, but it makes it far more honest. Sparse challenge populations are now treated as a data reality instead of being confused with a geometry bug.",
        ],
      },
    ],
    relatedSlugs: ["abs-explained", "audits-and-monitoring", "how-aibs-works"],
  },
  {
    slug: "ai-layer",
    title: "The AI Layer",
    dek: "What AI actually does in AiBS, what it does not do, and how prompts, usage, and feedback are tracked inside the product.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-24",
    publishedLabel: "AI Layer",
    readTime: "6 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "AI Systems",
    heroHeading: "AI in AiBS is scoped as explanation and editorial support, not a free-form baseball oracle.",
    leadParagraphs: [
      "The public AI surface in the current launch is the visualizer. On selected team and umpire pages, a user can ask for a chart brief or baseball explanation and get a response grounded in AiBS data instead of a generic chat answer.",
      "Behind that, the app also has a larger internal AI layer: prompt registry support, feedback capture, usage and token tracking, daily editorial generation, game-report generation, and admin analytics around AI behavior.",
      "That is why the AI story here matters. The system is not just a text box pasted onto a dashboard. It is an operational layer with scope, feedback, and cost/performance visibility.",
    ],
    quickFacts: [
      { label: "Public AI", value: "Visualizer only for launch" },
      { label: "Internal AI", value: "Editorial generation, reports, classification, and analytics" },
      { label: "Feedback path", value: "Backend-wired likes/dislikes and usage tracking" },
    ],
    sections: [
      {
        eyebrow: "Public scope",
        heading: "The launch AI experience is intentionally narrow.",
        paragraphs: [
          "AiBS explicitly gated broader public AI surfaces for launch. The visualizer stays public because it fits the product's explanatory role on analytics pages. Copilot and Query Lab remain gated because they require a different support, safety, and product bar.",
          "That narrowing is part of the product discipline, not a sign that the AI layer is shallow. It is the opposite: the system is being scoped to the part that is most defensible on day one.",
        ],
      },
      {
        eyebrow: "Operations",
        heading: "Usage and feedback are first-class signals.",
        paragraphs: [
          "The codebase now tracks internal AI usage across multiple workflows, not just direct chat. Article generation, report generation, and classifier paths all write usage signals so model choice, token cost, and performance can be evaluated later instead of guessed at.",
          "Article-level feedback and analytics surfaces are part of that same idea. If AI is part of the product, it should be observable as a system, not treated as a black box.",
        ],
      },
    ],
    relatedSlugs: ["how-aibs-works", "audits-and-monitoring", "product-layer"],
  },
  {
    slug: "audits-and-monitoring",
    title: "Trust, Audits, and Model Monitoring",
    dek: "How AiBS validates the product before and after changes: QA gates, audit scripts, thresholds, alerts, and admin review.",
    authorName: "Colby Reichenbach",
    articleType: "project",
    publishedAt: "2026-03-24",
    publishedLabel: "Trust Layer",
    readTime: "6 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "Validation Workflow",
    heroHeading: "The product is supposed to earn trust through recurring checks, not launch-day confidence alone.",
    leadParagraphs: [
      "AiBS now has a real audit workflow around the core model layers. That includes zone-edge checks, overturn calibration, benchmark comparisons, current-state audits, QA passes, alert thresholds, and admin trend views for repeated issues.",
      "The important part is that these are not just docs. The launch cycle wired them into scripts, persisted artifacts, alert tables, and admin visibility so model drift and data failures can be reviewed operationally.",
      "This matters because a baseball product can look polished while still drifting quietly underneath. The audit layer exists so changes are evidence-driven and recoverable.",
    ],
    quickFacts: [
      { label: "Recurring checks", value: "QA, benchmark audits, calibration, and alert evaluation" },
      { label: "Operational surface", value: "Admin AI/model analytics with trend visibility" },
      { label: "Launch guardrails", value: "Smoke checks, build gates, and repo-integrity preflight" },
    ],
    sections: [
      {
        eyebrow: "Audit flow",
        heading: "Model validation is part of the release process.",
        paragraphs: [
          "The launch cycle added a one-command audit suite, audit runtime helpers, ABS QA scripts, threshold-based alerting, and admin-facing trend history. That means model review is no longer just a local notebook exercise or a one-off script run.",
          "It also means launch decisions can be narrower and more honest. Public AI, public editorial automation, and launch scope were all shaped partly by what the audit and QA workflow was prepared to support reliably.",
        ],
      },
      {
        eyebrow: "Recovery",
        heading: "Operational trust also means surviving bad environments.",
        paragraphs: [
          "During launch prep, the repo hit a serious local corruption problem. The recovery path included repo-integrity checks, Node pinning, cleaner build verification, and a remote-backed recovery branch. That experience is now part of the trust story too: the product should be able to recover from environment failures without losing the branch or confusing local corruption with model bugs.",
        ],
        pullQuote: "Trust is not only about the models. It is also about whether the build and recovery workflow are disciplined enough to survive failure.",
      },
    ],
    relatedSlugs: ["model-layer", "how-aibs-works", "sources-and-credits"],
  },
  {
    slug: "sources-and-credits",
    title: "Sources, Credits, and Data Rights",
    dek: "The product's data sources, referential assets, and rights posture around public baseball material, team marks, and league information.",
    authorName: "Colby Reichenbach",
    articleType: "explainer",
    publishedAt: "2026-03-24",
    publishedLabel: "Transparency Ledger",
    readTime: "4 min read",
    accentClass: "text-blue-900",
    heroEyebrow: "Transparency",
    heroHeading: "AiBS depends on public baseball data and referential visual assets, but it does not claim league ownership or endorsement.",
    leadParagraphs: [
      "AiBS uses public baseball-facing data sources and transforms them into product views, model layers, and editorial outputs. That includes game, team, umpire, and challenge information as well as the public rules and reporting used to explain MLB's ABS system.",
      "The product also uses referential team marks, colors, and related visual identifiers in service of describing baseball entities that already exist. That does not imply ownership, partnership, or endorsement.",
      "This page exists to make the provenance and posture explicit instead of burying it behind generic footer language.",
    ],
    quickFacts: [
      { label: "Primary data posture", value: "Public-source ingest plus AiBS transforms and marts" },
      { label: "Visual asset posture", value: "Referential use, not ownership claim" },
      { label: "Affiliation", value: "Independent product, not MLB-affiliated" },
    ],
    sections: [
      {
        eyebrow: "Data",
        heading: "Public inputs, product-specific transforms.",
        paragraphs: [
          "The underlying baseball information comes from public-facing sources such as MLB and related APIs. AiBS then restructures, stores, and models that data in its own database, views, and runtime loaders. The transformed product outputs are not a copy of a public endpoint; they are the result of the application's own processing, aggregation, and presentation layers.",
        ],
      },
      {
        eyebrow: "Marks and references",
        heading: "Names, logos, and colors are used to describe the sport accurately.",
        paragraphs: [
          "Team names, abbreviations, colors, and visual identifiers appear so the product can identify clubs and present baseball information clearly. Those references are used descriptively. They do not transfer ownership, affiliation, or endorsement.",
          "This is the same reason public rule and reporting sources are cited directly on the relevant pages. When the product is explaining MLB's ABS system, the user should be able to inspect the underlying public reporting and league material that informed that explanation.",
        ],
      },
    ],
    sources: [
      { label: "MLB Glossary: Strike Zone", href: "https://www.mlb.com/glossary/rules/strike-zone" },
      { label: "MLB ABS explainer", href: "https://www.mlb.com/brewers/news/automated-ball-strike-calls-mlb-spring-games" },
      { label: "AP reporting on MLB ABS", href: "https://apnews.com/article/mlb-robot-umpires-abs-9034454b5a795262bf97446ff38d0361" },
      { label: "MLB Stats API", href: "https://statsapi.mlb.com/" },
    ],
    relatedSlugs: ["about-aibs", "audits-and-monitoring", "abs-explained"],
  },
];

export function getAboutArticleBySlug(slug: string) {
  return ABOUT_ARTICLES.find((article) => article.slug === slug || article.aliases?.includes(slug)) ?? null;
}

export function sortAboutArticles(articles: AboutArticle[]) {
  return [...articles].sort(
    (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
  );
}

export function getAboutIssueMeta(article: AboutArticle, articles: AboutArticle[] = ABOUT_ARTICLES) {
  const publishedDate = new Date(`${article.publishedAt}T12:00:00`);
  const year = publishedDate.getFullYear();
  const yearArticles = [...articles]
    .filter((candidate) => new Date(`${candidate.publishedAt}T12:00:00`).getFullYear() === year)
    .sort(
      (left, right) =>
        new Date(`${left.publishedAt}T12:00:00`).getTime() - new Date(`${right.publishedAt}T12:00:00`).getTime(),
    );

  const issueNumber = yearArticles.findIndex((candidate) => candidate.slug === article.slug) + 1;

  return {
    volumeLabel: `Vol. ${year}`,
    issueLabel: `Issue ${String(issueNumber).padStart(2, "0")}`,
    monthKey: article.publishedAt.slice(0, 7),
    monthLabel: publishedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    publishedDateLabel: publishedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}

export function getAboutMonthOptions(articles: AboutArticle[]) {
  const monthMap = new Map<string, string>();

  for (const article of sortAboutArticles(articles)) {
    const meta = getAboutIssueMeta(article, articles);
    if (!monthMap.has(meta.monthKey)) {
      monthMap.set(meta.monthKey, meta.monthLabel);
    }
  }

  return Array.from(monthMap, ([value, label]) => ({ value, label }));
}
