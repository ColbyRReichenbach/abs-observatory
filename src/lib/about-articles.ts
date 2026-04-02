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
    aliases: ["aibs-observatory", "aibs", "observatory", "why-i-built-aibs"],
    title: "About AiBS",
    dek: "What AiBS is, why it was built, who it is for, and why ABS was the right subject to build around.",
    authorName: "Colby Reichenbach",
    articleType: "project",
    publishedAt: "2026-03-24",
    publishedLabel: "Founder Brief",
    readTime: "7 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "Product Purpose",
    heroHeading: "AiBS was built to make one complicated baseball change understandable, inspectable, and usable.",
    leadParagraphs: [
      "AiBS is an all-in-one baseball product built around the Automated Ball-Strike challenge system. It is meant to be a place where a user can understand what happened, why it mattered, and how to reason about it without bouncing between social media, league feeds, and a handful of separate baseball sites.",
      "The product was built from a very practical habit. I like baseball data and baseball dialogue more than I like spending every night scrolling through X to piece together what happened. I wanted one place where the events, the context, the visualizations, and eventually the conversation all lived together.",
      "ABS made that worth building because it is controversial by design. The system changes strategy, changes how fans talk about umpires and teams, and creates arguments that are usually stronger than the evidence behind them. AiBS exists to close that gap between opinion and inspectable data.",
    ],
    quickFacts: [
      { label: "Product scope", value: "ABS-first baseball product with live, team, umpire, game, article, and documentation desks" },
      { label: "User goal", value: "Give fans and analysts one place to inspect the data behind ABS conversations" },
      { label: "Long-term direction", value: "A combined data, visualization, and conversation platform with AI support built in" },
    ],
    sections: [
      {
        eyebrow: "What the product is",
        heading: "AiBS is built as a front door to ABS, not as another generic baseball dashboard.",
        paragraphs: [
          "The product is organized around routes that answer different baseball questions cleanly. The home page frames the current league picture. Team pages focus on club-level challenge behavior. Umpire pages focus on review pressure, overturn patterns, and consequence. Game pages reduce one game into the specific events and context that shaped it. The Articles desk is where the longer-form analysis lives, and the About desk is where the system is documented directly.",
          "That routing choice is part of the product philosophy. A user should not have to reverse-engineer one massive dashboard just to answer a specific question. Each page should have a clear job and a clear audience.",
        ],
        bullets: [
          "Home: current ABS landscape, live states, and the highest-signal league snapshots.",
          "Teams: how clubs spend challenges, where they gain value, and what style they show.",
          "Umpires: overturn profile, pressure exposure, consequence, and directional reads.",
          "Games: event-level context, count-state changes, leverage, and challenge impact.",
        ],
      },
      {
        eyebrow: "Why it was built",
        heading: "The product came from a gap between baseball conversation and baseball evidence.",
        paragraphs: [
          "A lot of baseball conversation now happens on X, but the data behind those conversations is usually fragmented or missing. People argue about whether a club is challenging well, whether an umpire is volatile, or whether ABS is helping the sport, but they often do not have the exact data point or visual frame needed to support what they are saying. AiBS was built to make those specific points easier to find and easier to test.",
          "It was also built for people who are interested in the data and the dialogue even when they are not watching every game live. I wanted a product that lets a user stay current on the important challenge moments, see the numbers behind them, and understand the baseball logic without needing to search across multiple sites.",
        ],
        pullQuote: "The point of the product is not to flatten baseball into charts. The point is to make baseball discussion more accountable to the data.",
      },
      {
        eyebrow: "Why ABS",
        heading: "ABS is the right subject because it forces baseball logic, technical logic, and public dialogue into the same place.",
        paragraphs: [
          "ABS is one of the few current baseball topics where rules, geometry, strategy, officiating, and fan reaction all collide in public view. That makes it a good product subject and a good modeling subject. It also means the product has to serve more than one kind of reader at once: fans who want understandable visuals, baseball people who care about tactics, and technical readers who want to know whether the numbers are defensible.",
          "AI matters in that setting because the data will always be more useful if more people can actually read it. That is why AiBS has embedded AI explanation on selected surfaces and why the long-term plan includes allowing users to describe or request the visualizations they want to see instead of depending only on the prebuilt pages.",
        ],
      },
    ],
    relatedSlugs: ["about-me", "abs-explained", "product-layer"],
  },
  {
    slug: "about-me",
    title: "About Me",
    dek: "The founder perspective behind AiBS and the standards guiding the product, technical work, and public explanations.",
    authorName: "Colby Reichenbach",
    articleType: "founder",
    publishedAt: "2026-03-24",
    publishedLabel: "Founder Note",
    readTime: "5 min read",
    accentClass: "text-[#2d5a27]",
    heroEyebrow: "Founder Perspective",
    heroHeading: "I built AiBS as one system, not as separate product, engineering, and analysis tracks.",
    leadParagraphs: [
      "I built AiBS independently across product design, frontend systems, backend infrastructure, data ingestion, database modeling, statistical modeling, AI tooling, and the writing layer around the product. That scope is part of the point. I wanted the interface, the data model, the analytics, and the explanations to agree with each other rather than feel like separate projects pushed together at the end.",
      "My background shapes how the writing and modeling are approached. I was a biology major, so I naturally write and think in a more scientific style: detailed, concise, evidence-first, and much less interested in filler than in whether the logic can actually hold up.",
      "That is the standard I want AiBS to carry. If the product makes a claim, I want that claim to be auditable. If a model is being used publicly, I want the assumptions and limits to be explicit. If a page exists, I want it to answer a real baseball question instead of just looking sophisticated.",
    ],
    quickFacts: [
      { label: "Role", value: "Founder, engineer, analyst, and writer" },
      { label: "Working style", value: "End-to-end product ownership with direct technical accountability" },
      { label: "Default standard", value: "Clarity, auditability, and baseball logic before style" },
    ],
    sections: [
      {
        eyebrow: "How I build",
        heading: "The product and the implementation are supposed to agree.",
        paragraphs: [
          "One of the recurring rules in AiBS is that the public explanation should match the implementation. If the product says a model is audited, there should be scripts, thresholds, or artifacts behind that statement. If the site says a page is driven by run expectancy or win expectancy, the logic should exist in the codebase and the supporting data should exist in the database. If a chart has AI explanation attached to it, the AI surface should be bounded and observable.",
          "That is why the About desk matters. It is not there as decorative copy. It is there because part of the value of this project is being explicit about how it was built, what it is trying to do, and what it is not pretending to do.",
        ],
      },
      {
        eyebrow: "What matters most",
        heading: "I care more about whether a product can defend itself than whether it sounds impressive.",
        paragraphs: [
          "A narrower product with clear boundaries is stronger than a broader one with blurry claims. That is why some AI surfaces remain bounded or gated, why some metrics are shown only where they are explainable, and why the technical sections in this desk need to be direct about data quality, sample size, and model limits.",
          "The goal is not to make the project sound advanced. The goal is to build something that holds up when a technical reader, a baseball reader, or an everyday fan all ask the same question: is this actually true?",
        ],
      },
    ],
    relatedSlugs: ["about-aibs", "product-layer", "trust-audits-and-monitoring"],
  },
  {
    slug: "abs-explained",
    aliases: ["how-aibs-works"],
    title: "What ABS Is and How It Works",
    dek: "A direct explanation of MLB's ABS challenge system, the technology behind it, and the way AiBS models that system in the product.",
    authorName: "Colby Reichenbach",
    articleType: "explainer",
    publishedAt: "2026-03-24",
    publishedLabel: "ABS Explainer",
    readTime: "8 min read",
    accentClass: "text-blue-900",
    heroEyebrow: "Rules and System",
    heroHeading: "MLB uses an ABS challenge system, not full automated strike calling, and the distinction matters.",
    leadParagraphs: [
      "In MLB's current format, the plate umpire still calls the pitch. ABS enters only when a pitcher, catcher, or batter immediately challenges that call. That challenge sends the pitch to the tracking system for a correction, and the result is confirmed or overturned in real time.",
      "That operational detail matters because AiBS is not trying to explain an abstract strike zone in isolation. It is trying to explain a challenge system with strategy, resource constraints, timing rules, and a specific technical implementation.",
      "This page therefore needs to do two jobs clearly. First, it needs to explain the league's actual rules and technology in plain language. Second, it needs to explain how AiBS mirrors that system in its own geometry, event models, and page logic.",
    ],
    quickFacts: [
      { label: "League format", value: "Challenge system with human plate umpire plus tracking-based review" },
      { label: "Challenge rule", value: "Pitcher, catcher, or batter only, immediately after the pitch" },
      { label: "Strike-zone frame", value: "17 inches wide, 53.5% top, 27% bottom, measured at the midpoint of the plate" },
    ],
    sections: [
      {
        eyebrow: "League rules",
        heading: "The challenge system is narrow on purpose.",
        paragraphs: [
          "MLB gives each team two challenges in a nine-inning game. Teams keep a challenge if it is successful and lose it if it is not. In extra innings, a team that has none remaining is awarded one. The challenge must come from the pitcher, catcher, or batter, and it has to happen right after the pitch. The dugout is not supposed to drive the decision.",
          "Those rules are not cosmetic. They create the strategic layer that makes ABS interesting. A challenge is a resource, not just a complaint. That means the baseball question is not only whether a call was wrong. It is also whether a team used its limited correction opportunities well.",
        ],
        bullets: [
          "Each team starts with two challenges.",
          "Successful challenges are retained; failed challenges are lost.",
          "Only the pitcher, catcher, or batter can challenge.",
          "The request must be immediate.",
          "A team with no challenges left gets one in extra innings.",
        ],
      },
      {
        eyebrow: "Technology and geometry",
        heading: "The system is geometric, but it is not vague.",
        paragraphs: [
          "According to MLB, the challenge system runs on Hawk-Eye tracking with 12 cameras in each park. The ABS zone is a two-dimensional plane centered over the plate. It spans the full 17-inch width of home plate, and its top and bottom are scaled to the batter's measured height. The top is 53.5% of player height and the bottom is 27%. Pitch location is measured at the midpoint between the front and back of the plate, and any part of the ball clipping the zone counts as a strike.",
          "AiBS mirrors that framing as closely as the data and public baseball feeds allow. The geometry layer is direction-aware, which means it treats a called strike that should become a ball differently from a called ball that should become a strike. That distinction matters because the baseball implication is different, the count change is different, and therefore the modeled value is different.",
        ],
        stats: [
          { label: "Zone width", value: "17 in" },
          { label: "Top bound", value: "53.5% of player height" },
          { label: "Bottom bound", value: "27% of player height" },
          { label: "Tracking source", value: "12-camera Hawk-Eye system" },
        ],
      },
      {
        eyebrow: "How AiBS uses it",
        heading: "AiBS models the system as a baseball event, not just as a location check.",
        paragraphs: [
          "The product does not stop at whether the pitch should have been a strike or a ball. It also tracks who challenged, what count changed, whether the challenge was retained, what the leverage context was, and how the count correction changed the modeled run and win environment. That is why AiBS can talk about review timing, challenge value, and review pressure instead of only talking about zone accuracy.",
          "This also explains why some pages lean more into baseball context than raw geometry. The league's challenge system is a rules-and-decision system built around pitch calls. The geometry matters, but so do the count, the inning, the score, the base state, and the number of challenges remaining.",
        ],
      },
    ],
    sources: [
      {
        label: "MLB: Looking ahead to MLB's new Ball-Strike Challenge System",
        href: "https://www.mlb.com/news/ball-strike-challenge-system-2026",
      },
      {
        label: "MLB: 5 things fans need to know about ABS Challenge System",
        href: "https://www.mlb.com/news/abs-challenge-system-2026-mlb-season-overview",
      },
      {
        label: "MLB Glossary: Strike Zone",
        href: "https://www.mlb.com/glossary/rules/strike-zone",
      },
    ],
    relatedSlugs: ["about-aibs", "model-layer", "data-layer"],
  },
  {
    slug: "product-layer",
    aliases: ["architect"],
    title: "The Product Layer",
    dek: "How the routes, fan/org split, article desk, and frontend/backend product decisions make AiBS readable for different kinds of users.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-24",
    publishedLabel: "Product Layer",
    readTime: "7 min read",
    accentClass: "text-blue-900",
    heroEyebrow: "Product Design",
    heroHeading: "The route map exists because not every user wants the same baseball product.",
    leadParagraphs: [
      "AiBS is routed the way it is because the same data should not be presented the same way to every user. Some users want visual explanations and a clearer front door into the subject. Others want strategy, consequence, and the deeper baseball logic behind the same events. The product layer exists to separate those jobs without forking the whole codebase.",
      "That is the reason for fan view and org view. Fan view is more visual, more explanatory, and more conversational. Org view is more compact, more technical, and more centered on the strategic and analytical implications of the same data.",
      "This is also where the product and engineering decisions meet. The frontend only works if the route jobs are clear, the backend loaders are scoped to those jobs, and the page logic stays honest about what each surface is supposed to answer.",
    ],
    quickFacts: [
      { label: "Design principle", value: "One route, one question, one clear audience" },
      { label: "View-mode principle", value: "Same system, different presentation and depth by user need" },
      { label: "Engineering bias", value: "Stable route purpose and honest scope over feature sprawl" },
    ],
    sections: [
      {
        eyebrow: "Route design",
        heading: "The public routes were created because different readers start with different questions.",
        paragraphs: [
          "The home page is the front page. Team pages are about club behavior and decision patterns. Umpire pages are about review exposure, consequence, and profile. Game pages are about event-level context and what changed in one game. The Articles desk is where the longer analysis lives. The About desk is where the system itself is explained. That separation is product architecture, not just URL organization.",
          "A route structure like that matters because it lets each page make a smaller number of stronger decisions. The charts, metric cards, AI surfaces, and copy do not all need to solve the same problem everywhere.",
        ],
        bullets: [
          "Home: the current ABS landscape and the highest-signal league snapshots.",
          "Teams: challenge identity, timing, value, and org-vs-fan presentation.",
          "Umpires: accuracy, volatility, consequence, and directional exposure.",
          "Games: live, pregame, and postgame views of one challenge environment.",
          "Articles: analysis papers and recurring editorial interpretation.",
          "About: permanent product, technical, and methodological documentation.",
        ],
      },
      {
        eyebrow: "Fan and org view",
        heading: "Fan and org view are not cosmetic toggles.",
        paragraphs: [
          "Fan view uses plainer labels, more explanatory cards, and more visual framing because the goal is accessibility and dialogue. Org view uses tighter layouts, denser metrics, and more strategic framing because the goal is decision support and baseball analytics. The underlying data is the same, but the product should not pretend that the same presentation is optimal for both readers.",
          "That choice is implemented directly in the app rather than being a design mockup. View mode is resolved at the application layer and used throughout the route rendering, which lets the same route serve different levels of detail without fragmenting the product into separate sites.",
        ],
      },
      {
        eyebrow: "What the layer proves",
        heading: "The product layer is where the software engineering has to stay invisible enough to feel obvious.",
        paragraphs: [
          "The frontend and backend work here are tightly coupled. The route hierarchy, data loaders, charts, AI entry points, and article system all depend on the product knowing what each page is responsible for. The engineering work matters because it makes that routing system coherent under real traffic, not because it sounds complicated in isolation.",
          "The Articles desk is part of that same product story. It is the place where in-season analysis papers can live inside the product rather than being separated from the data system they depend on. That keeps the analysis, the product, and the evidence in one environment.",
        ],
        pullQuote: "The best product engineering on this project is the work that makes the route purpose feel obvious instead of clever.",
      },
    ],
    relatedSlugs: ["about-aibs", "model-layer", "ai-layer"],
  },
  {
    slug: "model-layer",
    aliases: ["brain"],
    title: "The Model Layer",
    dek: "The statistical and baseball logic underneath the product: run expectancy, win expectancy, overturn probability, leverage, geometry, and aggregation.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-24",
    publishedLabel: "Model Layer",
    readTime: "9 min read",
    accentClass: "text-red-900",
    heroEyebrow: "Baseball Logic",
    heroHeading: "The model layer exists to make the product's baseball claims mathematically and baseball-logically defensible.",
    leadParagraphs: [
      "AiBS does not use one monolithic model. It uses a stack of baseball-specific model components: challenge event normalization, count-state baselines, run expectancy, win expectancy, overturn probability, estimated leverage, challenge decision value, and route-level aggregation for teams, umpires, and games.",
      "Some of those layers are direct lookup models built from fallback tables. Some are rules-based transformations. Some are heuristics used only where the product needs an interpretable proxy. The important thing is not to pretend they are all the same. The important thing is to be explicit about what is modeled, what is estimated, and what is still thin.",
      "This is also the page where the baseball logic has to matter as much as the statistical logic. A mathematically neat number that does not make sense in terms of game state, count state, challenge timing, or real ABS usage is not a strong product metric.",
    ],
    quickFacts: [
      { label: "Core model domains", value: "RE, WE, overturn probability, leverage, geometry, and decision value" },
      { label: "Resolution strategy", value: "Indexed fallback tables and canonicalized game-state keys" },
      { label: "Validation rule", value: "Production calculations and audit logic should agree" },
    ],
    sections: [
      {
        eyebrow: "Expectancy models",
        heading: "Run expectancy and win expectancy are treated as state-transition problems.",
        paragraphs: [
          "A core idea in AiBS is that a challenge changes a baseball state, not just a correctness label. If the held count is different from the corrected count, the product asks what that count change means in the local run environment and win environment. In simplified form, the state transitions are handled as `RE_delta = RE_post - RE_pre` and `WE_delta = WE_post - WE_pre`, where the pre and post states share inning, half inning, outs, base occupancy, and score context but differ in count state.",
          "Those values are not inferred from thin air. The app loads indexed fallback tables for run expectancy and win expectancy and resolves each challenge against the most specific state available before falling back to bucketed variants. That is why the codebase carries explicit fallback tiers rather than pretending every challenge can be resolved at full exact-state precision.",
          "This is also where one of the current truths of the product has to be stated clearly: run expectancy coverage is generally easier to resolve than win expectancy coverage, because WE depends on additional dimensions such as score-differential state and half inning. When WE is thin, the product should say so rather than substituting false precision.",
        ],
        stats: [
          { label: "RE fallback tiers", value: "Exact, drop inning bucket, drop count key" },
          { label: "WE fallback tiers", value: "Exact plus inning/count fallback hierarchy" },
          { label: "Runtime behavior", value: "Indexed state lookup, not repeated full-table scans" },
        ],
      },
      {
        eyebrow: "Overturn probability and decision value",
        heading: "Overturn probability and challenge value are related, but they are not the same number.",
        paragraphs: [
          "The product estimates overturn probability from historical challenge contexts using fallback tiers that move from exact context to direction-only and then to global fallback when the sample is thinner. That means the app can still produce a bounded overturn estimate even when a pitch is not matched at the most specific edge-and-direction level.",
          "Challenge decision value then layers that overturn estimate onto the count-state win environment. In practical terms, the product is asking: if a challenge succeeds, what is the expected state gain, if it fails, what is the opportunity cost, and given the current probability of success, is the expected decision positive enough to justify using a limited resource now instead of later.",
          "That is why the product can show scenarios where a challenge is technically possible but strategically weak. A 50% overturn chance does not automatically mean a good challenge if the underlying state swing is small or the game context suggests a better future use of the remaining challenge.",
        ],
      },
      {
        eyebrow: "Geometry and baseball logic",
        heading: "The geometry model is direction-aware because baseball consequences are direction-aware.",
        paragraphs: [
          "A called strike that should become a ball and a called ball that should become a strike are not symmetrical baseball events. They move the count in opposite directions and can therefore produce different downstream value. AiBS models challenge geometry with that in mind. The geometry layer is tied to challenge direction, count-state resolution, and event interpretation instead of just distance from a notional boundary.",
          "This is also where baseball logic has to override bad instincts about what sounds statistically elegant. The point of the geometry layer is not to produce a pretty classification. The point is to reflect the actual review question the system is asking on the field.",
        ],
      },
      {
        eyebrow: "Aggregation and honesty",
        heading: "Team, umpire, and event summaries are aggregations of these state changes, not separate truths.",
        paragraphs: [
          "When AiBS reports average RE delta, average WE delta, high-leverage share, or related summary metrics for teams, umpires, or event groups, it is aggregating these underlying challenge-level state transitions. That is important because it means the summary metrics inherit both the strengths and the limits of the base resolution path.",
          "The product should therefore stay honest about what those aggregates mean. An average value delta can describe a sample directionally even when the sample is still too thin to support a reputational claim. That distinction matters especially on umpire pages, where small challenge counts can easily be overread if the product is not explicit.",
        ],
        pullQuote: "The product should be willing to say that a metric is directional, sparse, or provisional when that is the truth of the sample.",
      },
    ],
    relatedSlugs: ["abs-explained", "data-layer", "trust-audits-and-monitoring"],
  },
  {
    slug: "ai-layer",
    title: "The AI Layer",
    dek: "How AI is used in AiBS, what each surface is for, how context is passed, and how prompts, usage, and feedback are audited.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-24",
    publishedLabel: "AI Layer",
    readTime: "8 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "AI Systems",
    heroHeading: "AI in AiBS exists to make the product more legible, not to turn the product into a generic baseball chatbot.",
    leadParagraphs: [
      "AI in AiBS is supposed to make the data easier to use. That means chart-specific explanation, product-aware follow-up questions, and guided interfaces that help a user understand the baseball signal without needing to speak in technical terms first.",
      "The AI layer is not one thing. It includes chart insight, the contextual copilot, the visualizer surface, Query Lab, editorial/report generation, feedback capture, generation logging, and admin analytics around how the prompts and responses are performing.",
      "This page needs to be explicit about that architecture because the value here is not just that the product has AI attached to it. The value is that the prompts, context windows, feedback loops, and usage telemetry are all part of one inspectable system.",
    ],
    quickFacts: [
      { label: "Public AI surfaces", value: "Chart insight, visualizer, and selected follow-up/copilot paths" },
      { label: "Operational AI surfaces", value: "Editorial/report generation, review workflows, and admin analytics" },
      { label: "Audit hooks", value: "Feedback, generation events, prompt versioning, and usage/cost tracking" },
    ],
    sections: [
      {
        eyebrow: "Why AI is here",
        heading: "The goal is accessibility, not abstraction for its own sake.",
        paragraphs: [
          "ABS data is only useful if a user can actually interpret it. That is the practical reason AI belongs in this product. A chart insight surface can explain what a visual is showing, what the baseball signal is, and what the user should be careful not to overclaim. A guided AI surface can also help a nontechnical user get to the question they were trying to ask in the first place.",
          "That does not mean every AI surface should be public at once. The public-facing surfaces should stay tied to inspectable context. Broader query and copilot interfaces require a higher support and monitoring bar, which is why some of them remain gated or staged.",
        ],
      },
      {
        eyebrow: "The AI surfaces",
        heading: "Each AI surface has a different job.",
        paragraphs: [
          "Chart insight is the most constrained surface. It receives structured chart payloads and is expected to explain the visual, the baseball signal, and the implication while staying tied to the data already on the page. The visualizer surface is more generative, but it is still expected to stay within the AiBS context. Copilot and Query Lab are broader interfaces for navigating product knowledge and asking cross-surface questions. They are more powerful, which is exactly why they need stronger controls.",
          "That separation matters because prompt design should follow product purpose. A chart explainer prompt should not behave like an open-ended baseball oracle. A copilot prompt should not behave like a generic assistant with no awareness of the underlying route, game, team, or umpire context.",
        ],
        bullets: [
          "Chart insight: explain one visual and one signal clearly.",
          "Visualizer: help users work toward a chart or view they want to inspect.",
          "Copilot: navigate product context and answer bounded follow-up questions.",
          "Query Lab: broader analytical querying, with tighter access controls.",
        ],
      },
      {
        eyebrow: "AI engineering",
        heading: "The interesting work is in context control, prompt boundaries, and observability.",
        paragraphs: [
          "The AI layer is wired around explicit surface types, context payloads, CSRF checks, usage entitlements, generation logging, and feedback capture. Context sharing is deliberate rather than magical. Chart insight receives a chart payload. Copilot receives a route-aware context window. Feedback is tied back to generation records so prompt and model behavior can be reviewed later.",
          "That is the difference between dropping a model endpoint into a UI and actually engineering an AI product surface. The prompts, the allowed tools, the response shaping, and the audit path all have to work together if the system is supposed to remain product-specific.",
          "This is also where the prompt registry idea matters even when it is not exposed as a single branded page. The product already tracks surface, generation, model, and feedback metadata in a way that supports prompt-level review and iteration. That is the operational foundation needed if the AI layer is going to improve over time instead of drift.",
        ],
        pullQuote: "The AI layer is strongest when the model knows exactly what kind of product surface it is speaking for.",
      },
    ],
    relatedSlugs: ["product-layer", "data-layer", "trust-audits-and-monitoring"],
  },
  {
    slug: "data-layer",
    title: "The Data Layer",
    dek: "Where the data comes from, how it is transformed, how the database is organized, and why the storage and query strategy look the way they do.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-24",
    publishedLabel: "Data Layer",
    readTime: "8 min read",
    accentClass: "text-[#2d5a27]",
    heroEyebrow: "Data Engineering",
    heroHeading: "The data layer exists to turn public baseball feeds into stable, queryable product truth.",
    leadParagraphs: [
      "AiBS is only as good as the data layer underneath it. The product depends on clean ingest, stable relational structure, auditable transforms, and a query path that can serve both live pages and heavier analytical surfaces without collapsing under its own ambition.",
      "The data does not arrive in the exact shapes the product needs. It has to be ingested, normalized, keyed, enriched, and materialized into serving tables and views that make baseball and product sense. That includes live ABS events, pitch context, historical fallback data, editorial evidence, AI feedback, and product-user state.",
      "This is also where cost and operational decisions show up. Some data is kept local by design because historical pitch-level material is expensive enough that the product benefits from separating local heavy-reference storage from what the deployed environments need to serve every page.",
    ],
    quickFacts: [
      { label: "Primary storage", value: "Postgres with raw, product, editorial, community, AI, ops, and serving layers" },
      { label: "Core baseball entities", value: "Games, pitches, ABS challenges, summaries, and historical fallback tables" },
      { label: "Serving strategy", value: "Views, marts, and cached app loaders instead of raw endpoint passthrough" },
    ],
    sections: [
      {
        eyebrow: "Sources and transforms",
        heading: "Public baseball data becomes product data only after transformation.",
        paragraphs: [
          "The baseball-facing inputs come from public MLB-facing sources and related historical pitch-level material. AiBS ingests those sources into relational tables such as games, pitches, ABS challenges, and raw historical pitch states, then builds serving tables and views on top. The product is therefore not a thin wrapper over one live endpoint. It is a transformation layer that restructures public baseball data into the shapes needed for this product.",
          "That transformation work matters because product pages do not need raw feed data. They need challenge events tied to count state, score state, pitcher-batter context, umpire context, and fallback model tables. The database is designed around that need.",
        ],
      },
      {
        eyebrow: "Database shape",
        heading: "The schema is organized by responsibility, not by one flat baseball feed.",
        paragraphs: [
          "The schema separates product concerns into distinct namespaces and layers. Baseball event tables sit alongside product user tables, editorial workflow tables, community tables, AI generation and feedback tables, operational audit tables, raw historical statcast inputs, and serving fallback tables. That structure is deliberate because the product is doing more than displaying one stream of pitch events.",
          "For a data engineer, the important takeaway is that AiBS is built as an application database, not just an analytics sandbox. The product needs transactional integrity for user and AI systems, relational integrity for baseball data, and performant serving paths for live pages.",
        ],
        stats: [
          { label: "Core game tables", value: "games, pitches, abs_challenges" },
          { label: "Serving tables", value: "run/WE fallbacks and count-state baselines" },
          { label: "Operational tables", value: "AI feedback, audits, jobs, and webhook deliveries" },
        ],
      },
      {
        eyebrow: "Why local historical data matters",
        heading: "Historical pitch-level storage is partly a product decision and partly a cost decision.",
        paragraphs: [
          "AiBS keeps heavier historical material locally because pitch-level reference data is expensive enough that it is worth being intentional about where it lives. The deployed serving environments need the outputs and the fallbacks they actually use. They do not always need the full historical working set that supports ETL, rebuilds, and deeper local modeling work.",
          "That separation keeps storage costs and deployment complexity under better control while still letting the product train, reference, and validate against deeper historical material when needed.",
        ],
      },
      {
        eyebrow: "Why the query layer works",
        heading: "The serving path is optimized around pre-shaped data and cached loaders.",
        paragraphs: [
          "The app does not rely on one giant raw query per route. It uses serving views, fallback tables, and cached loaders so the route work stays focused on composing product-ready pieces. That is why performance problems are often better solved by fixing lookup strategy or route fan-out than by blaming the base database query alone.",
          "The data layer is therefore a major part of product reliability. If the transforms, views, indexes, and serving assumptions are wrong, the product will either be slow or dishonest. It has to be neither.",
        ],
      },
    ],
    relatedSlugs: ["model-layer", "ai-layer", "trust-audits-and-monitoring"],
  },
  {
    slug: "trust-audits-and-monitoring",
    aliases: ["audits-and-monitoring"],
    title: "Trust, Audits, and Model Monitoring",
    dek: "How AiBS validates models and AI over time: audit scripts, thresholds, feedback loops, admin review, and drift monitoring.",
    authorName: "Colby Reichenbach",
    articleType: "project",
    publishedAt: "2026-03-24",
    publishedLabel: "Trust Layer",
    readTime: "7 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "Validation Workflow",
    heroHeading: "Trust in this product should come from recurring checks, traceable feedback, and visible boundaries.",
    leadParagraphs: [
      "AiBS should not rely on one-time confidence. The product uses recurring audit workflows around the core model and AI layers so drift, regressions, and recurring failure modes can be caught and reviewed instead of silently becoming product truth.",
      "That includes model audits, QA scripts, alert thresholds, AI feedback capture, generation tracking, and admin analytics that preserve the context around what the system did, where it did it, and how users responded.",
      "This matters because a baseball product can look polished while being technically wrong underneath. The trust layer exists to make the product recoverable and tunable when that happens.",
    ],
    quickFacts: [
      { label: "Audit scope", value: "Models, AI generations, workflow failures, and repeated negative feedback" },
      { label: "Operational surface", value: "Admin analytics, review queues, and trend history" },
      { label: "Trust principle", value: "Traceable evidence over silent drift" },
    ],
    sections: [
      {
        eyebrow: "Model and data audits",
        heading: "Validation is part of the system, not a separate afterthought.",
        paragraphs: [
          "The codebase includes audit helpers, benchmark logic, QA scripts, threshold evaluation, and operational review surfaces because the model layer needs recurring verification. A claim about geometry, expectancy, overturn behavior, or challenge value should not be treated as permanent simply because it passed once.",
          "That also affects product scope. If a metric or surface cannot yet be monitored well, the right move is often to keep it narrower or more explicit rather than overstate what the product can defend.",
        ],
      },
      {
        eyebrow: "AI and admin monitoring",
        heading: "The same rule applies to AI: if it is in the product, it has to be reviewable.",
        paragraphs: [
          "AI surfaces in AiBS are wired to feedback storage, generation events, classification, and admin review because prompt and model quality should be monitored like any other product behavior. Negative feedback, failure patterns, and repeated misunderstandings are useful signals only if they are attached to the generation and surface that produced them.",
          "That is the same reason model drift and workflow failures need alerting and trend visibility. A passing build is not enough. Operational trust depends on whether the system can detect when reality has moved away from the assumptions it is serving.",
        ],
        pullQuote: "Trust is not only about getting a number once. It is about whether the system can tell when it should stop trusting itself.",
      },
    ],
    relatedSlugs: ["model-layer", "ai-layer", "sources-and-credits"],
  },
  {
    slug: "sources-and-credits",
    title: "Sources, Credits, and Data Rights",
    dek: "The product's source posture, referential-use posture, and the limits of any ownership or endorsement claim.",
    authorName: "Colby Reichenbach",
    articleType: "explainer",
    publishedAt: "2026-03-24",
    publishedLabel: "Transparency Ledger",
    readTime: "5 min read",
    accentClass: "text-blue-900",
    heroEyebrow: "Transparency",
    heroHeading: "AiBS depends on public baseball-facing sources and referential visual identifiers, but it does not claim league ownership, affiliation, or endorsement.",
    leadParagraphs: [
      "AiBS uses public baseball-facing data sources and transforms them into product views, models, and editorial outputs. That includes league-facing rules material, public baseball data, and related historical pitch-level references used to build the serving and fallback layers of the application.",
      "The product also uses team names, abbreviations, colors, and related visual identifiers for referential and descriptive purposes. Their presence in the interface does not imply ownership, sponsorship, endorsement, or partnership.",
      "This page exists so the provenance and posture are stated directly and professionally rather than buried in generic footer language.",
    ],
    quickFacts: [
      { label: "Primary data posture", value: "Public-source ingest plus AiBS transforms, models, and serving views" },
      { label: "Visual asset posture", value: "Referential use, not ownership claim" },
      { label: "Affiliation", value: "Independent product, not MLB-affiliated" },
    ],
    sections: [
      {
        eyebrow: "Data sources",
        heading: "Public inputs become product-specific outputs only after transformation.",
        paragraphs: [
          "The underlying baseball information comes from public-facing league materials, public baseball APIs, and related historical baseball data sources. AiBS restructures, stores, models, and presents that data through its own relational schema, serving views, fallback tables, route loaders, and editorial surfaces. The resulting product outputs are therefore not just a raw copy of a public endpoint. They are the output of the application's own transforms and interpretation layers.",
        ],
      },
      {
        eyebrow: "Marks and identifiers",
        heading: "Names, logos, and colors are used descriptively.",
        paragraphs: [
          "Team names, abbreviations, colors, and visual identifiers appear in the product so the application can identify baseball entities accurately and clearly. Those references are descriptive and referential only. They do not transfer ownership rights and should not be read as evidence of affiliation, endorsement, or sponsorship.",
          "The same principle applies to rule and explainer materials. When AiBS explains MLB's ABS system, it should cite the league or other underlying public sources directly so the reader can inspect the origin material for themselves.",
        ],
      },
    ],
    sources: [
      { label: "MLB: Ball-Strike Challenge System for 2026", href: "https://www.mlb.com/news/ball-strike-challenge-system-2026" },
      { label: "MLB: ABS Challenge System 2026 overview", href: "https://www.mlb.com/news/abs-challenge-system-2026-mlb-season-overview" },
      { label: "MLB Glossary: Strike Zone", href: "https://www.mlb.com/glossary/rules/strike-zone" },
      { label: "MLB Stats API", href: "https://statsapi.mlb.com/" },
    ],
    relatedSlugs: ["about-aibs", "abs-explained", "trust-audits-and-monitoring"],
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
