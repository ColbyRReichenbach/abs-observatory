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

export type AboutArticleActionLink = {
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
  actionLinks?: AboutArticleActionLink[];
  relatedSlugs: string[];
};

export const ABOUT_ARTICLES: AboutArticle[] = [
  {
    slug: "about-aibs",
    aliases: ["aibs-observatory", "aibs", "observatory", "why-i-built-aibs"],
    title: "About AiBS",
    dek: "What I built, why I built it around ABS, who it is for, and what I want the product to become.",
    authorName: "Colby Reichenbach",
    articleType: "project",
    publishedAt: "2026-03-24",
    publishedLabel: "Founder Brief",
    readTime: "7 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "Product Purpose",
    heroHeading: "I built AiBS to make ABS understandable, inspectable, and actually useful.",
    leadParagraphs: [
      "I built AiBS as an ABS-first baseball product for people who want the data, the context, and the explanation in one place. I did not want a workflow where someone has to bounce between X, league feeds, and half a dozen baseball sites just to understand one challenge sequence or one argument about an umpire.",
      "I also built it for the way I follow baseball myself. I do not always want to sit through every broadcast. I do want to understand what happened, what changed, and what the evidence actually says. That pushed me toward a product that can surface the important moments quickly, show the supporting data, and make the baseball logic readable.",
      "ABS was the right subject because it naturally produces disagreement. It changes strategy, changes how people talk about officiating, and creates very confident opinions that are often much less precise than the underlying evidence. I built AiBS to tighten that gap.",
    ],
    quickFacts: [
      { label: "Product scope", value: "ABS-first baseball product with live, team, umpire, game, article, and documentation desks" },
      { label: "User goal", value: "Give fans and analysts one place to inspect the data behind ABS conversations" },
      { label: "Long-term direction", value: "A combined data, visualization, and conversation platform with AI support built in" },
    ],
    sections: [
      {
        eyebrow: "What I built",
        heading: "I built AiBS as a front door to ABS, not as another generic baseball dashboard.",
        paragraphs: [
          "I built AiBS as one place where a user can move from live context, to team behavior, to umpire exposure, to game-level events, to longer written analysis without leaving the product. I wanted the data, the explanation, and the baseball logic to live together.",
          "I also wanted the product to be useful to more than one kind of reader. Some people want a clean visual front door into the subject. Some want deeper baseball logic. Some want technical details. I built the system so those readers can start in different places without needing different products.",
        ],
      },
      {
        eyebrow: "Why I built it",
        heading: "I built AiBS because baseball conversation often moves faster than the evidence behind it.",
        paragraphs: [
          "A lot of baseball discussion now happens on X, but the supporting data is usually fragmented, delayed, or missing. People argue about whether a club is challenging well, whether an umpire is volatile, or whether ABS is helping the sport, but they rarely have the exact data point or visual frame needed to support what they are saying. I built AiBS to make those points easier to find and easier to test.",
          "I also built it for people who care about the data and the dialogue even when they are not watching every game live. I wanted a system that lets someone stay current on the important challenge moments, inspect the numbers behind them, and understand the baseball logic without needing to search across multiple sites.",
        ],
        pullQuote: "I am not trying to flatten baseball into charts. I am trying to make baseball discussion more accountable to the data.",
      },
      {
        eyebrow: "Why ABS",
        heading: "I chose ABS because it forces baseball logic, technical logic, and public dialogue into the same place.",
        paragraphs: [
          "ABS is one of the few current baseball topics where rules, geometry, strategy, officiating, and fan reaction all collide in public view. That makes it a strong product subject and a strong modeling subject. It also means I have to build for more than one kind of reader at once: fans who want understandable visuals, baseball people who care about tactics, and technical readers who want to know whether the numbers hold up.",
          "I also embedded AI into that system because the data becomes more useful when more people can actually read it. I use it to make the product more legible, not to replace the underlying evidence.",
        ],
      },
    ],
    relatedSlugs: ["about-me", "abs-explained", "product-layer"],
  },
  {
    slug: "about-me",
    title: "About Me",
    dek: "Who I am, how I think about building, and what I hope comes from the products I create.",
    authorName: "Colby Reichenbach",
    articleType: "founder",
    publishedAt: "2026-03-24",
    publishedLabel: "Founder Note",
    readTime: "5 min read",
    accentClass: "text-[#2d5a27]",
    heroEyebrow: "Overview",
    heroHeading: "Who I Am & My Background",
    leadParagraphs: [
      "My name is Colby Reichenbach, and I am the sole developer of AiBS. At my core, I am both a passionate baseball fan and a data nerd.",
      "I spent about 13 years of my life playing baseball: travel ball, school ball, Little League, and just about everything in between. For a long stretch of my life, baseball was everything. Even when I was not playing, I was watching. During my time at UNC-Chapel Hill, I made countless trips to the Bosh just to catch games and stay close to the sport.",
      "My interest in data, especially data science, really took shape during my senior year of college, which led me to minor in it. After graduation, I became much more deeply involved in AI and started using it as a tool to build intelligent analytical products.",
      "To me, data should be accessible to everyone, regardless of background. AI makes that more possible. AiBS was built from that belief, and from my passion for baseball, data, and making complex information easier to understand. A non-baseball fan should be able to open this app and use the AI tools to understand the context behind what they are seeing. A baseball fan who is not especially technical should be able to ask a question and get a useful visual back. If they still need more clarity, follow-up questions should help them go deeper. Everything here was built with the user in mind.",
    ],
    quickFacts: [
      { label: "Role", value: "Founder, engineer, analyst, and writer" },
      { label: "Working style", value: "End-to-end product ownership with direct technical accountability" },
      { label: "Default standard", value: "Clarity, auditability, and baseball logic before style" },
    ],
    actionLinks: [
      { label: "Portfolio", href: "https://colbyrreichenbach.github.io/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/colby-reichenbach/" },
      { label: "Email", href: "mailto:colbyrreichenbach@gmail.com" },
    ],
    sections: [
      {
        eyebrow: "Identity Crisis",
        heading: "What Would I Classify Myself As?",
        paragraphs: [
          "Truthfully, I am still figuring that out.",
          "I am well versed across the broader data stack, and I still do not know exactly what I like best or where I fit best. At times, it feels a little like an identity crisis, but in a productive way. I enjoy building machine learning models. I enjoy designing polished, visually compelling frontends. I enjoy engineering backends and analytical pipelines that move data from raw systems into something useful for real people.",
          "That is one of the reasons AiBS means a lot to me. It is a product that genuinely reflects the range of how I like to work. It showcases my ability to build across the stack, from using AI throughout my development workflow, to building user-facing AI tools, to engineering analytical pipelines that monitor those systems, to automating data ingestion and model auditing in a stable way.",
        ],
      },
      {
        eyebrow: "The Future",
        heading: "What Am I Looking For?",
        paragraphs: [
          "In a perfect world, one of the products I build would grow into something I could eventually sell, whether through a subscription model or through acquisition.",
          "I genuinely enjoy building. There is something special about owning a product end to end and shaping every part of it exactly the way I envision it. At the same time, the more experience I get as a solo developer, the more I understand how difficult it is to build everything alone. Many of my projects end up under-shared. I have never really been a social media personality, and marketing my own work has never come naturally to me.",
          "More than anything, I hope naturally curious builders find this product, regardless of domain, and reach out because they want to build together. Maybe someone at a company sees this work and thinks I would fit well with the kind of problems they are solving. That is always a conversation I would be happy to have.",
        ],
      },
      {
        eyebrow: "Closing",
        heading: "Thank You for Reading",
        paragraphs: [
          "If you are reading this, thank you for taking the time to learn a little more about who I am and for exploring something I built. I genuinely appreciate your curiosity.",
          "I am always open to connecting, and I would be glad to hear from you. I hope you enjoy the product.",
          "The buttons below link to my portfolio, email, and LinkedIn. I encourage you to reach out, and if you do, let me know you came from this page.",
        ],
      },
    ],
    relatedSlugs: ["about-aibs", "product-layer", "trust-audits-and-monitoring"],
  },
  {
    slug: "abs-explained",
    aliases: ["how-aibs-works"],
    title: "What ABS Is and How It Works",
    dek: "A direct explanation of MLB's ABS challenge system, the technology behind it, and how I mirror that system inside AiBS.",
    authorName: "Colby Reichenbach",
    articleType: "explainer",
    publishedAt: "2026-03-24",
    publishedLabel: "ABS Explainer",
    readTime: "8 min read",
    accentClass: "text-blue-900",
    heroEyebrow: "Rules and System",
    heroHeading: "MLB uses an ABS challenge system, not full automated strike calling, and the distinction matters.",
    leadParagraphs: [
      "In MLB's current format, the plate umpire still calls the pitch. ABS only enters when the pitcher, catcher, or batter immediately challenges that call. The tracking system then confirms or overturns the pitch in real time.",
      "That operational detail matters because I am not trying to explain an abstract strike zone in isolation. I am explaining a challenge system with strategy, resource constraints, timing rules, and a specific technical implementation.",
      "I mirror that system directly in AiBS. I model the rule set, the geometry, and the baseball state change that follows from a confirmed or overturned call.",
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
          "Those rules create the strategic layer that makes ABS interesting. A challenge is a resource, not just a complaint. The baseball question is not only whether a call was wrong. It is also whether a team used a limited correction opportunity well.",
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
          "I mirror that framing in AiBS as closely as the data and public baseball feeds allow. The geometry layer is direction-aware, which means I treat a called strike that should become a ball differently from a called ball that should become a strike. That difference matters because the baseball implication is different, the count change is different, and the modeled value is different.",
        ],
        stats: [
          { label: "Zone width", value: "17 in" },
          { label: "Top bound", value: "53.5% of player height" },
          { label: "Bottom bound", value: "27% of player height" },
          { label: "Tracking source", value: "12-camera Hawk-Eye system" },
        ],
      },
      {
        eyebrow: "How I model it",
        heading: "I model ABS as a baseball event, not just as a location check.",
        paragraphs: [
          "I do not stop at whether the pitch should have been a strike or a ball. I also track who challenged, what count changed, whether the challenge was retained, and what baseball state followed from the corrected call.",
          "That design choice is why the rest of the product can move from simple call correction into timing, value, and pressure. ABS is a rules-and-decision system built around pitch calls, so the geometry matters, but so do the count, the inning, the score, the base state, and the number of challenges remaining.",
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
    dek: "How I structured the routes, fan/org split, article desk, and implementation choices so the same system can serve different kinds of users.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-24",
    publishedLabel: "Product Layer",
    readTime: "7 min read",
    accentClass: "text-blue-900",
    heroEyebrow: "Product Design",
    heroHeading: "I structured the route map around questions, not around one oversized dashboard.",
    leadParagraphs: [
      "I structured AiBS the way I did because the same data should not be presented the same way to every user. Some users want a visual front door and plain-language explanation. Others want strategy, consequence, and deeper baseball logic. I wanted to separate those jobs without forking the whole codebase.",
      "That is the reason fan view and org view exist. Fan view is more visual, more explanatory, and more conversational. Org view is denser, more technical, and more centered on strategy and deeper baseball analytics.",
      "This is where product and engineering meet. The frontend only works if the route jobs are clear, the backend loaders are scoped to those jobs, and each surface stays honest about what it is actually supposed to answer.",
    ],
    quickFacts: [
      { label: "Design principle", value: "One route, one question, one clear audience" },
      { label: "View-mode principle", value: "Same system, different presentation and depth by user need" },
      { label: "Engineering bias", value: "Stable route purpose and honest scope over feature sprawl" },
    ],
    sections: [
      {
        eyebrow: "Route design",
        heading: "I built the public routes around the questions different readers actually start with.",
        paragraphs: [
          "The home page is the front page. Team pages are about club behavior and decision patterns. Umpire pages are about review exposure, consequence, and profile. Game pages are about event-level context and what changed in one game. The Articles desk is where I publish longer analysis. The About desk is where I explain the system itself. That separation is product architecture, not just URL organization.",
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
          "I use fan view when the job is accessibility and dialogue. That means plainer labels, more explanatory cards, and more visual framing. I use org view when the job is strategy and decision support. That means tighter layouts, denser metrics, and more technical framing. The underlying data is the same, but I do not think the same presentation is optimal for both readers.",
          "I implemented that choice at the application layer rather than treating it like a design mockup. View mode is resolved in the app and carried through route rendering, which lets one route serve different levels of detail without splitting the product into separate sites.",
        ],
      },
      {
        eyebrow: "What the layer proves",
        heading: "This is where the software engineering has to stay invisible enough to feel obvious.",
        paragraphs: [
          "The frontend and backend work here are tightly coupled. The route hierarchy, data loaders, charts, AI entry points, and article system all depend on one clear rule: every page should know what it is responsible for. The engineering work matters because it makes that routing system coherent under real traffic, not because it sounds complicated in isolation.",
          "The Articles desk is part of that same structure. I wanted my in-season analysis to live inside the same product that generates the supporting evidence, rather than outside it on a disconnected site or thread.",
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
    dek: "The baseball logic underneath the product: split-aware value models, called-pitch geometry, overturn probability, and carefully labeled downstream layers.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-24",
    publishedLabel: "Model Layer",
    readTime: "9 min read",
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
      {
        eyebrow: "Geometry and baseball logic",
        heading: "I made the geometry model direction-aware because baseball consequences are direction-aware.",
        paragraphs: [
          "A called strike that should become a ball and a called ball that should become a strike are not symmetrical baseball events. They move the count in opposite directions and can produce different downstream value. I model challenge geometry with that in mind. The geometry layer is tied to challenge direction, count-state resolution, and event interpretation instead of just distance from a notional boundary.",
          "This is where baseball logic has to override bad instincts about what sounds statistically elegant. I am not using geometry to produce a pretty classification. I am using it to reflect the actual review question the system is asking on the field.",
        ],
      },
      {
        eyebrow: "Aggregation and honesty",
        heading: "Team, umpire, and event summaries are aggregations of these state changes, not separate truths.",
        paragraphs: [
          "When I report average ΔRE, average ΔWE, high-leverage share, or related summary metrics for teams, umpires, or event groups, I am aggregating underlying challenge-level state transitions. That matters because those summary metrics inherit both the strengths and the limits of the base resolution path.",
          "I want the product to stay honest about what those aggregates mean. An average value delta can describe a sample directionally even when the sample is too thin to support a reputational claim. That matters especially on umpire pages, where small challenge counts are easy to overread if I am not explicit.",
        ],
        pullQuote: "If a metric is directional, sparse, or provisional, I want the product to say that directly.",
      },
    ],
    relatedSlugs: ["abs-explained", "data-layer", "trust-audits-and-monitoring"],
  },
  {
    slug: "ai-layer",
    title: "The AI Layer",
    dek: "How I use AI in AiBS, what each surface is for, how context is passed, and how prompts, usage, and feedback are audited.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-24",
    publishedLabel: "AI Layer",
    readTime: "8 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "AI Systems",
    heroHeading: "I use AI to make the product more legible, not to turn AiBS into a generic baseball chatbot.",
    leadParagraphs: [
      "I use AI in AiBS to make the data easier to use. That means chart-specific explanation, product-aware follow-up questions, and guided interfaces that help a user understand the baseball signal without needing to speak in technical terms first.",
      "The AI layer is not one thing. It includes chart insight, the contextual copilot, the visualizer surface, Query Lab, editorial and report generation, feedback capture, generation logging, and admin analytics around how the prompts and responses are performing.",
      "What matters here is not just that AI exists in the product. What matters is that each surface has defined context, tracked generations, stored feedback, and a review path when something goes wrong.",
    ],
    quickFacts: [
      { label: "Public AI surfaces", value: "Chart insight, visualizer, and selected follow-up/copilot paths" },
      { label: "Operational AI surfaces", value: "Editorial/report generation, review workflows, and admin analytics" },
      { label: "Audit hooks", value: "Feedback, generation events, prompt versioning, and usage/cost tracking" },
    ],
    sections: [
      {
        eyebrow: "Why AI is here",
        heading: "I use AI for accessibility, not abstraction for its own sake.",
        paragraphs: [
          "ABS data is only useful if a user can actually interpret it. That is the practical reason I put AI into this product. A chart insight surface can explain what a visual is showing, what the baseball signal is, and what the user should be careful not to overclaim. A guided AI surface can also help a nontechnical user get to the question they were trying to ask in the first place.",
          "That does not mean every AI surface should be public at once. I keep public-facing surfaces tied to inspectable context. Broader query and copilot interfaces need a higher support and monitoring bar, so some of them remain gated or staged.",
        ],
      },
      {
        eyebrow: "The AI surfaces",
        heading: "I gave each AI surface a different job.",
        paragraphs: [
          "Chart insight is the most constrained surface. It receives structured chart payloads and is expected to explain the visual, the baseball signal, and the implication while staying tied to the data already on the page. The visualizer is more generative, but I still keep it inside AiBS context. Copilot and Query Lab are broader interfaces for navigating product knowledge and asking cross-surface questions, which is exactly why they need stronger controls.",
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
        heading: "The hard part is context control, prompt boundaries, and observability.",
        paragraphs: [
          "I wire the AI layer around explicit surface types, context payloads, CSRF checks, usage entitlements, generation logging, and feedback capture. Context sharing is deliberate rather than magical. Chart insight receives a chart payload. Copilot receives a route-aware context window. Feedback is tied back to generation records so prompt and model behavior can be reviewed later.",
          "That is the difference between dropping a model endpoint into a UI and actually engineering an AI surface. Prompts, allowed tools, response shaping, and the audit path have to work together if the system is going to stay product-specific.",
          "This is where prompt versioning and generation metadata matter. I already track surface, generation, model, and feedback metadata in a way that lets me review failures, compare responses, and iterate on the prompts behind each surface.",
        ],
        pullQuote: "The AI layer is strongest when the model knows exactly what kind of surface it is speaking for.",
      },
    ],
    relatedSlugs: ["product-layer", "data-layer", "trust-audits-and-monitoring"],
  },
  {
    slug: "data-layer",
    title: "The Data Layer",
    dek: "Where I get the data, how I transform it, how the database is organized, and why the storage and query strategy look the way they do.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-24",
    publishedLabel: "Data Layer",
    readTime: "8 min read",
    accentClass: "text-[#2d5a27]",
    heroEyebrow: "Data Engineering",
    heroHeading: "I built the data layer to turn public baseball feeds into stable, queryable product truth.",
    leadParagraphs: [
      "The system is only as good as the data layer underneath it. I need clean ingest, stable relational structure, auditable transforms, and a query path that can serve both live pages and heavier analytical surfaces without collapsing under its own ambition.",
      "The data does not arrive in the exact shapes the app needs. I ingest it, normalize it, key it, enrich it, and materialize it into serving tables and views that make baseball and product sense. That includes live ABS events, pitch context, historical fallback data, editorial evidence, AI feedback, and product-user state.",
      "This is where cost and operational decisions show up. I keep some data local by design because historical pitch-level material is expensive enough that it makes sense to separate heavy reference storage from what deployed environments need to serve pages quickly.",
      "I also run live polling on a fixed heartbeat with an ET-aware gate. The scheduler stays simple, but the ingest path only does real work when games are relevant, stale gaps need recovery, or fresh structured serving state needs to be written.",
    ],
    quickFacts: [
      { label: "Primary storage", value: "Postgres with raw, product, editorial, community, AI, ops, and serving layers" },
      { label: "Core baseball entities", value: "Games, pitches, ABS challenges, summaries, and historical fallback tables" },
      { label: "Serving strategy", value: "Views, marts, and cached app loaders instead of raw endpoint passthrough" },
    ],
    sections: [
      {
        eyebrow: "Sources and transforms",
        heading: "I turn public baseball data into product data through transformation, not passthrough.",
        paragraphs: [
          "The baseball-facing inputs come from public MLB-facing sources and related historical pitch-level material. I ingest those sources into relational tables such as `games`, `pitches`, `abs_challenges`, and raw historical pitch-state tables, then build serving tables and views on top. AiBS is not a thin wrapper over one live endpoint. It is a transformation layer.",
          "That transformation work matters because product pages do not need raw feed data. They need challenge events tied to count state, score state, pitcher-batter context, umpire context, and fallback model tables. I designed the database around that need.",
          "That is also why I moved live scoreboard serving toward structured state instead of treating raw source snapshots as the product surface. The app now prefers compact linescore state that the ingest pipeline writes directly for serving.",
        ],
      },
      {
        eyebrow: "Database shape",
        heading: "I organized the schema by responsibility, not by one flat baseball feed.",
        paragraphs: [
          "The schema separates product concerns into distinct namespaces and layers. Baseball event tables sit alongside product-user tables, editorial workflow tables, community tables, AI generation and feedback tables, operational audit tables, raw historical statcast inputs, and serving fallback tables. I did that because AiBS is doing more than displaying one stream of pitch events.",
          "For a data engineer, the important point is that I built this as an application database, not just an analytics sandbox. I need transactional integrity for user and AI systems, relational integrity for baseball data, and performant serving paths for live pages.",
        ],
        stats: [
          { label: "Core game tables", value: "games, pitches, abs_challenges" },
          { label: "Serving tables", value: "run/WE fallbacks and count-state baselines" },
          { label: "Operational tables", value: "AI feedback, audits, jobs, and webhook deliveries" },
        ],
      },
      {
        eyebrow: "Polling and freshness",
        heading: "I keep live ingest cadence simple and the work gate strict.",
        paragraphs: [
          "The poller runs on a fixed five-minute local scheduler heartbeat, but that does not mean it blindly ingests every time. I gate work by Eastern Time game windows, whether any games are actually live, and whether the system needs bounded stale-gap recovery after downtime.",
          "That design keeps the scheduler understandable while still protecting freshness. It also lets me surface a small freshness indicator in the product so users can tell whether the system is actively polling or idle.",
        ],
      },
      {
        eyebrow: "Why local historical data matters",
        heading: "Keeping historical pitch-level data local is partly a product decision and partly a cost decision.",
        paragraphs: [
          "I keep heavier historical material local because pitch-level reference data is expensive enough that I want to be intentional about where it lives. The deployed serving environments need the outputs and the fallback tables they actually use. They do not always need the full historical working set that supports ETL, rebuilds, and deeper local modeling work.",
          "I also separate recent serving data from raw archive retention on purpose. The hosted database keeps structured page-facing state and only limited recent operational snapshots, while the deeper raw audit trail can live outside the serving footprint.",
        ],
      },
      {
        eyebrow: "Why the query layer works",
        heading: "I keep the serving path focused on pre-shaped data and cached loaders.",
        paragraphs: [
          "The app does not rely on one giant raw query per route. I use serving views, fallback tables, and cached loaders so route work stays focused on composing product-ready pieces. That is why performance problems are often better solved by fixing lookup strategy or route fan-out than by blaming the base database query alone.",
          "The data layer is a major part of product reliability. If the transforms, views, indexes, and serving assumptions are wrong, the system will either be slow or dishonest. It has to be neither.",
        ],
      },
    ],
    relatedSlugs: ["model-layer", "ai-layer", "trust-audits-and-monitoring"],
  },
  {
    slug: "trust-audits-and-monitoring",
    aliases: ["audits-and-monitoring"],
    title: "Trust, Audits, and Model Monitoring",
    dek: "How AiBS validates the product before and after changes: held-out audits, warehouse-first evidence, QA gates, and operational monitoring.",
    authorName: "Colby Reichenbach",
    articleType: "project",
    publishedAt: "2026-03-24",
    publishedLabel: "Trust Layer",
    readTime: "7 min read",
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
        pullQuote: "Trust is not only about getting a number once. It is about whether the system can tell when it should stop trusting itself.",
      },
    ],
    relatedSlugs: ["model-layer", "ai-layer", "sources-and-credits"],
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
