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
      { label: "Public AI scope", value: "Bounded AI explanation on selected analytics and game-context surfaces" },
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
    dek: "The builder's perspective behind AiBS and the standards guiding the product, data, and scope decisions.",
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
          "The same bias shapes product scope. Public AI is kept bounded to surfaces where the response can stay tied to a specific chart, game state, or analytic context. Query Lab and Copilot remain gated until they can meet a higher support and product bar.",
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
          "The product uses batter-specific strike-zone resolution and direction-aware inside/outside geometry for challenge analysis. The model layer is aligned to MLB's published ABS framing rather than a generic stat-zone approximation.",
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
      "That same system also supports model audits, usage tracking, admin analytics, and controlled AI surfaces. The product layer and the operational layer are part of the same application, which is why smoke checks, audit runs, alerting, and release verification sit alongside frontend work instead of after it.",
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
        eyebrow: "Public scope",
        heading: "The public product is intentionally narrower than the full system.",
        paragraphs: [
          "The public site exposes the core baseball product, published editorial, and bounded AI explanation on selected analytics and game-context surfaces. Broader AI tools and admin workflows still exist in the system, but they remain gated behind launch configuration and role checks.",
          "That is a product decision as much as an engineering one. Stability matters more than exposing every internal surface at once.",
        ],
        bullets: [
          "Public: home, teams, umpires, games, articles, About, and bounded AI explanation on selected pages.",
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
      "The product layer also makes scope explicit. Public AI is bounded to selected explanatory surfaces, the About desk functions as a permanent dossier, and the route hierarchy is meant to match the stable public product instead of an internal wishlist.",
    ],
    quickFacts: [
      { label: "Design principle", value: "One route, one clear job" },
      { label: "Public AI usage", value: "Bounded explanatory surfaces on selected pages" },
      { label: "Product bias", value: "Stable core product over maximum surface area" },
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
        eyebrow: "Scope discipline",
        heading: "Gating is part of product quality.",
        paragraphs: [
          "Several features remain intentionally gated rather than exposed half-ready. That includes global Copilot, Query Lab, and internal admin workflows. The product layer is stronger because scope is treated as a first-class decision instead of a temporary hack.",
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
    dek: "The baseball logic underneath the product: split-aware value models, called-pitch geometry, overturn probability, and carefully labeled downstream layers.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-24",
    publishedLabel: "Model Layer",
    readTime: "7 min read",
    accentClass: "text-red-900",
    heroEyebrow: "Baseball Logic",
    heroHeading: "The model layer exists to make the product's baseball claims honest, testable, and baseball-sensible.",
    leadParagraphs: [
      "AiBS does not rely on one giant baseball model. The current stack is a set of narrower layers with different jobs: count-state baselines, run expectancy, win expectancy, called-pitch geometry, overturn probability, challenge-value logic, leverage framing, and descriptive or editorial translation layers.",
      "The most important distinction in the current system is that not every layer is the same kind of truth. Count-state, run expectancy, and win expectancy are empirical held-out models. Overturn probability is a smaller, still-growing probabilistic layer. Leverage, rubrics, and controversy are intentionally labeled as heuristic, descriptive, or editorial where appropriate.",
      "That distinction matters because a product can become less trustworthy by pretending every number is equally proven. The current AiBS model layer is designed so runtime logic, audit logic, and documentation tell the same story about what is strong, what is provisional, and what should stay qualified.",
    ],
    quickFacts: [
      { label: "Strongest current layers", value: "Count-state, run expectancy, and win expectancy" },
      { label: "Most provisional layer", value: "Live challenge-now as org-grade optimization" },
      { label: "Validation rule", value: "Production logic, audit logic, and docs should agree" },
    ],
    sections: [
      {
        eyebrow: "Core value stack",
        heading: "The strongest current work is in count-state, run expectancy, and win expectancy.",
        paragraphs: [
          "The current rebuild put the most rigor into the state-value stack. Count-state, run expectancy, and win expectancy now run through split-aware warehouse builds, held-out audits, and explicit model-card documentation instead of loose in-sample checks. That is the part of the product that is currently most defensible in a serious baseball-modeling conversation.",
          "Those layers matter because challenge analysis is not just about whether a review was won. It is also about the baseball value of the count, base-out state, inning, and score context that would have changed if the call flipped.",
        ],
      },
      {
        eyebrow: "ABS geometry",
        heading: "Called-pitch geometry is real, but still provisional at the edges.",
        paragraphs: [
          "The current geometry layer is based on batter-specific strike-zone bounds, pitch location, and MLB's published ABS framing. AiBS now keeps separate fields for observed call, modeled ABS-style zone outcome, and real challenge outcome, because those are not the same thing.",
          "There is still an open geometry choice between a center-only interpretation and a radius-adjusted interpretation of the pitch coordinate. The current evidence leans toward center-only, but the product still treats the geometry layer as provisional instead of pretending the public data gives exact league adjudication truth.",
        ],
      },
      {
        eyebrow: "Policy boundary",
        heading: "Challenge-now is useful, but it is not being oversold.",
        paragraphs: [
          "The challenge-now layer is structurally much better than it used to be. It now uses exact base state, a decomposed overturn plus value plus inventory framework, and a held-out opportunity audit instead of only scoring historical challenge rows.",
          "But the current evidence is still not strong enough to present live challenge-now as an org-grade optimization engine. In AiBS today, that layer should be read as an experimental live discussion lens and as a much stronger postgame review tool for missed opportunities and low-value challenge usage.",
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
      "The public AI layer is intentionally bounded. On selected team, umpire, and game surfaces, a user can ask for a chart brief or baseball explanation and get a response grounded in AiBS data instead of a generic chat answer.",
      "Behind that, the app also has a larger internal AI layer: prompt registry support, feedback capture, usage and token tracking, daily editorial generation, game-report generation, and admin analytics around AI behavior.",
      "That is why the AI story here matters. The system is not just a text box pasted onto a dashboard. It is an operational layer with scope, feedback, and cost/performance visibility.",
    ],
    quickFacts: [
      { label: "Public AI", value: "Bounded explanation on selected analytics and game-context surfaces" },
      { label: "Internal AI", value: "Editorial generation, reports, classification, and analytics" },
      { label: "Feedback path", value: "Backend-wired likes/dislikes and usage tracking" },
    ],
    sections: [
      {
        eyebrow: "Public scope",
        heading: "The public AI experience is intentionally bounded.",
        paragraphs: [
          "AiBS keeps broader AI interfaces gated. The public layer stays attached to specific analytics and game-context surfaces because that is where the answer can remain inspectable. Copilot and Query Lab remain gated because they require a different support, safety, and product bar.",
          "That boundary is part of the product discipline, not a sign that the AI layer is shallow. It is the opposite: the system is being scoped to the part that is most defensible in public use.",
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
    dek: "How AiBS validates the product before and after changes: held-out audits, warehouse-first evidence, QA gates, and operational monitoring.",
    authorName: "Colby Reichenbach",
    articleType: "project",
    publishedAt: "2026-03-24",
    publishedLabel: "Trust Layer",
    readTime: "6 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "Validation Workflow",
    heroHeading: "The product is supposed to earn trust through recurring evidence, not one-time confidence.",
    leadParagraphs: [
      "AiBS now has a real audit workflow around the current model stack. That includes split-aware held-out audits for count-state, run expectancy, win expectancy, and overturn calibration, plus decision-value diagnostics, rubric checks, controversy checks, and product QA.",
      "The important part is that these are not just promises in documentation. The workflow now runs against the warehouse modeling source, writes dated artifacts, and sits next to the live GitHub Actions ingest and publish path so the product can tell the difference between a strong layer, a provisional layer, and a layer that should stay qualified in public.",
      "That matters because baseball products can look polished while drifting underneath. The audit layer exists so changes are evidence-driven, reproducible, and easier to unwind when a layer is not ready to carry a bigger claim.",
    ],
    quickFacts: [
      { label: "Core audit style", value: "Held-out evaluation with dated artifacts" },
      { label: "Main current evidence", value: "Count-state, RE, WE, overturn, and decision-value audits" },
      { label: "Release guardrails", value: "Warehouse-first audits, QA, and publication gates" },
    ],
    sections: [
      {
        eyebrow: "Audit flow",
        heading: "Model validation now lives inside the operating workflow.",
        paragraphs: [
          "The current audit layer is built around warehouse-first runtime helpers, dated markdown and JSON artifacts, and split-aware marts that make it much harder to accidentally evaluate on the same rows used to fit the model. That is a major shift from a lighter 'looks good' style of review.",
          "It also means the product can now carry more honest boundaries. A green layer can be described confidently. A yellow layer can be published carefully. A red layer can stay in the product as exploratory or fan-facing without being sold as operational truth.",
        ],
      },
      {
        eyebrow: "Monitoring",
        heading: "Operational trust also means catching drift, mismatch, and overclaim early.",
        paragraphs: [
          "Operational trust is not just about a passing build. It also depends on whether the product can detect data drift, model drift, warehouse-versus-serving mismatch, and repeated workflow failures before they become public-facing mistakes.",
          "That is why the AiBS audit layer now sits next to the data platform and publication-readiness workflow. The goal is not only to compute baseball numbers. It is to keep the system honest about what those numbers mean and how much confidence they deserve.",
        ],
        pullQuote: "Trust is not only about the models. It is also about whether drift gets caught before it becomes product truth.",
      },
    ],
    relatedSlugs: ["model-layer", "how-aibs-works", "sources-and-credits"],
  },
  {
    slug: "sources-and-credits",
    title: "The Data Layer",
    dek: "Where AiBS data comes from, how it is structured, and what gets transformed before it becomes product truth.",
    authorName: "Colby Reichenbach",
    articleType: "explainer",
    publishedAt: "2026-03-24",
    publishedLabel: "Data Layer",
    readTime: "4 min read",
    accentClass: "text-blue-900",
    heroEyebrow: "Transparency",
    heroHeading: "AiBS depends on public baseball data, but the product is built on its own warehouse, transforms, and validation rules.",
    leadParagraphs: [
      "AiBS uses public baseball-facing data sources, but the current system is not just a thin frontend over public endpoints. The product now runs through a warehouse-first data platform with GitHub Actions as the live polling authority, raw ingest in the warehouse, canonical modeling tables, split-aware historical builds, and a separate serving database for the live product.",
      "That distinction matters because the trust question is not only 'where did the data originate?' It is also 'how was it transformed, tested, and published before it became product truth?' The current data layer is designed to answer that second question much more clearly than before.",
      "This page exists to make the provenance, structure, and limits explicit instead of hiding them behind generic source language.",
    ],
    quickFacts: [
      { label: "Architecture", value: "Warehouse-first modeling with a separate serving database" },
      { label: "Live ingest authority", value: "GitHub Actions polling into warehouse" },
      { label: "Canonical modeling table", value: "One-row-per-taken-pitch called-pitch decision dataset" },
      { label: "Affiliation", value: "Independent product, not MLB-affiliated" },
    ],
    sections: [
      {
        eyebrow: "Pipeline",
        heading: "Public inputs become AiBS data only after transforms, contracts, and checks.",
        paragraphs: [
          "The current data platform separates warehouse and serving roles. GitHub Actions polls live baseball data into the warehouse first. Raw Statcast history, ABS challenge events, live MLB feed context, and canonical modeling tables live there. Curated serving tables and compact model outputs are then published into the product-facing database.",
          "That architecture matters because it gives the model layer one modeling authority instead of a laptop-first workflow or a live product database doubling as a warehouse. It also makes it easier to backfill, audit, reconcile, and reproduce what the product was actually using at a given moment.",
        ],
      },
      {
        eyebrow: "Canonical truth",
        heading: "The current key dataset is called-pitch decisions, not just raw challenge logs.",
        paragraphs: [
          "The biggest data-layer improvement in the current system is the canonical called-pitch dataset. It stores one row per taken pitch with game state, count, bases, score, team context, pitch traits, observed call, modeled ABS-style geometry, and challenge outcome when a pitch was actually challenged.",
          "That matters because overturn and challenge analysis should not be built only from a small challenge-events table. The current system now combines historical pitch context with real challenge results, which is a much better foundation for both overturn modeling and retrospective challenge evaluation.",
        ],
      },
      {
        eyebrow: "Rights and posture",
        heading: "AiBS is still independent and referential in how it uses baseball entities.",
        paragraphs: [
          "Team names, abbreviations, colors, and visual identifiers appear so the product can identify clubs and present baseball information clearly. Those references are descriptive. They do not imply ownership, partnership, or endorsement.",
          "The same principle applies to MLB rules and ABS explainers. AiBS cites those public materials because the product is trying to explain the league's system clearly, not because it claims league ownership over that explanation.",
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
