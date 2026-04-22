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
  /** Mermaid diagram definition string. Rendered as an inline SVG when present. */
  diagram?: string;
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
      {
        label: "Product scope",
        value:
          "ABS-first baseball product spanning live, game, team, umpire, article, about, profile, admin, and shareable AI chart surfaces",
      },
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
    dek: "How I structured the route map, fan and org views, and page responsibilities so the same system can serve different kinds of readers without splitting into separate products.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-04-11",
    publishedLabel: "Product Layer",
    readTime: "7 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "Product Design",
    heroHeading: "I structured the product around page jobs and reader intent, not around one oversized baseball dashboard.",
    leadParagraphs: [
      "When I started building AiBS, I did not want the product to become one giant page full of cards, charts, and filters competing for attention. That kind of design can look powerful at first, but it makes the product harder to read and harder to maintain because every page ends up trying to answer every question at once.",
      "The product is organized around route purpose instead. The home page has one job. Game pages have another. Team pages have another. Umpire pages have another. Articles and About handle longer written analysis and system explanation. Reports exist for postgame review. The route structure is not just URL organization. It is one of the core architectural decisions in the product.",
      "I also knew early on that the same baseball facts would need different framing depending on the reader. Fan and org views are built into the application layer for exactly that reason. One system, one source of facts, two presentation modes.",
    ],
    quickFacts: [
      { label: "Route design rule", value: "Each page family answers a smaller number of stronger questions" },
      { label: "View-mode rule", value: "Same underlying facts, different framing and density by reader need" },
      { label: "Application framework", value: "Next.js App Router, React Server Components, SQL-first data loading" },
    ],
    sections: [
      {
        eyebrow: "Route architecture",
        heading: "The product architecture is legible enough to read directly from the app tree.",
        paragraphs: [
          "The product is built on Next.js App Router with React Server Components. The route surface breaks into distinct families, each with a defined job. The diagram below shows the public, authenticated, and admin surfaces, with fan and org mode as a cross-cutting layer that applies across several of them.",
        ],
        diagram: `flowchart TB
    subgraph public ["Public Routes"]
        A["Home /"] --> B["Game Pages\\n/game/[id]"]
        A --> C["Team Pages\\n/teams"]
        A --> D["Umpire Pages\\n/umpires"]
        A --> E["Articles\\n/articles"]
        A --> F["About\\n/about"]
        A --> G["Reports\\n/reports/[id]"]
    end

    subgraph auth ["Authenticated"]
        H["Query\\n/query"]
        I["Profile\\n/profile"]
    end

    subgraph admin ["Admin"]
        J["Access"]
        K["AI Review"]
        L["Community"]
        M["Editorial"]
    end

    N["Fan / Org Mode"] -.->|"cross-cutting"| B
    N -.-> C
    N -.-> D
    N -.-> A`,
        bullets: [
          "/ Home: the ABS landscape front page",
          "/game/[gamePk] Game pages: state-aware challenge and event context, pregame through final",
          "/teams and /teams/[teamId] Team pages: challenge identity, usage patterns, and decision behavior",
          "/umpires and /umpires/[umpireId] Umpire pages: review exposure, volatility, and consequence",
          "/articles and /articles/[slug] Articles: longer baseball analysis published inside the product",
          "/about and /about/[slug] About: system architecture and design documentation",
          "/reports/[gamePk] Reports: postgame challenge review",
          "/v/[vizId] Visualization sharing",
          "/u/[username] Public user profiles",
          "/query Query (authenticated, access-controlled)",
          "Admin surface: access management, AI review, community moderation, editorial workflow",
        ],
      },
      {
        eyebrow: "View modes",
        heading: "Fan and org mode are part of the application architecture, not just two visual themes.",
        paragraphs: [
          "Fan and org mode did not start as a cosmetic toggle. They exist because the same baseball state needs different framing for different readers. Fan mode leans toward story, readability, and cleaner narrative ordering. It makes review moments, matchup context, and challenge behavior easier to follow without forcing the user into dense operational language. Org mode pushes further toward review management, timing, modeled context, and decision-oriented detail where the product has enough evidence to support that framing.",
          "The mode changes presentation and emphasis, not the underlying facts. There are not two separate data pipelines or two separate truth layers. Both modes read from the same challenge records and baseball state. The route resolves the view mode and shapes the output accordingly.",
          "Fan and org mode currently affects six page route families: the home page, game pages, team index and detail, and umpire index and detail. The AI surfaces also carry audience mode into prompt construction and task-family resolution, so the conversational tone adapts alongside the page framing.",
        ],
      },
      {
        eyebrow: "Game pages",
        heading: "Pregame, live, and final are three different products sharing one route.",
        paragraphs: [
          "The game page is where route purpose is most visible. Pregame focuses on matchup tendencies, likely review windows, and setup context. Live focuses on challenge patterns, current review consequences, and the ongoing shape of the game. Final shifts toward postgame challenge analysis, realized swings, missed opportunities, and low-value usage review.",
          "Many sports products flatten all three states into one page and let the user figure out which information is relevant at any given moment. A live game page should behave like a live page. A final game page should shift toward review and consequence. The state is not a filter. It is the primary context.",
          "Once page state is explicit, the loaders, charts, and AI surfaces attached to the route can be scoped more precisely to the actual job the page is doing.",
        ],
      },
      {
        eyebrow: "Articles and About",
        heading: "Longer writing lives inside the product because the product already has the context the writing depends on.",
        paragraphs: [
          "Articles are part of the product because the baseball context, review surfaces, and analytical framing the writing depends on are already here. Keeping analysis inside the same system puts it closer to the data that supports it. When an article references challenge patterns, team behavior, or umpire trends, the supporting data lives in the same product the reader is already using.",
          "The About desk serves a different purpose. Architecture choices, modeling boundaries, product design decisions, and system documentation live here as permanent pages rather than buried in code comments or scattered dev notes. These are the articles you are reading right now.",
          "Both desks are part of the product architecture. They are maintained and updated like the rest of the system.",
        ],
      },
      {
        eyebrow: "How the product loads data",
        heading: "Route logic stays close to the server-side model of the page.",
        paragraphs: [
          "The application is SQL-first and server-rendered. Server components and route handlers read from shared helpers in src/lib. Analytics pages are built from page-model helpers rather than doing route-local math in every file. Query logic and data-shaping logic live close to the server-side model of the product rather than being recreated differently in each route.",
          "Centralizing that work also helps with consistency. When the same summary or model output appears in multiple places, there is one retrieval and shaping path rather than several that diverge over time. The browser is not treated as a trusted data or authorization layer. Product logic, data loading, and permission boundaries hold on the server side.",
          "The current codebase serves 27 page routes and 37 API routes. Server components handle the initial data load and rendering. Client components handle interactivity, chart rendering, and AI chat surfaces. That split keeps the product responsive while keeping data integrity server-side.",
        ],
        pullQuote: "I wanted the page purpose to feel obvious enough that the route structure becomes invisible.",
      },
    ],
    relatedSlugs: ["ai-layer", "data-layer", "model-layer"],
  },
  {
    slug: "model-layer",
    aliases: ["brain"],
    title: "The Model Layer",
    dek: "How I structured the baseball logic underneath AiBS, what each modeling layer is responsible for, and why different outputs carry different levels of confidence.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-04-11",
    publishedLabel: "Model Layer",
    readTime: "10 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "Baseball Logic",
    heroHeading: "I built the model layer so the product could make baseball claims that are measurable, reviewable, and clear about their limits.",
    leadParagraphs: [
      "AiBS does not depend on one oversized model trying to explain everything about ABS. That approach makes it harder to understand what the system is actually doing, and it makes it easier to overstate what the outputs mean. The model layer is a stack of narrower pieces with different jobs.",
      "That stack includes count-state value, run expectancy, win expectancy, called-pitch geometry, overturn probability, challenge evaluation, leverage, rubric layers, and controversy ranking. Some are empirical value models. Some are probabilistic. Some exist to help with interpretation and communication. They should not all be described the same way.",
      "The strongest part of the current system is not a single metric. It is the combination of warehouse-first data handling, split-aware train and test control, held-out audits, model cards, and publication boundaries that reflect the actual strength of each layer.",
    ],
    quickFacts: [
      { label: "Strongest current layers", value: "Count-state value, run expectancy, and win expectancy" },
      { label: "Main modeling rule", value: "Each layer has a clear job and a clear confidence boundary" },
      { label: "Most important limit", value: "Challenge-now is not presented as org-grade optimization" },
    ],
    sections: [
      {
        eyebrow: "Stack architecture",
        heading: "ABS is not one modeling problem, so I did not try to solve it with one model.",
        paragraphs: [
          "ABS looks simple when the public conversation reduces it to one question: was the pitch a strike or a ball? Once a challenge happens, the picture changes. The count can change, the base-out state matters, the inning and score matter, the number of remaining challenges matters, and the value of a state change depends on the full baseball context around the call.",
          "The stack reflects that structure. Count-state value handles one job. Run expectancy handles another. Win expectancy handles another. Geometry and overturn probability address a different part of the chain. Challenge evaluation depends on how those upstream pieces interact. Leverage orders the pressure. Rubrics translate patterns into readable categories. Controversy ranks events for editorial surfaces.",
        ],
        diagram: `flowchart TB
    subgraph core ["Core Value Stack — empirical, held-out audited"]
        A["Count-State Value\\nBA, BB, K baselines"] --> B["Run Expectancy\\nRE by inning, outs, bases, count"]
        A --> C["Win Expectancy\\nWE by game state + count"]
    end

    subgraph geo ["Geometry and Overturn"]
        D["Called-Pitch Geometry\\ncenter_only vs radius_adjusted"] --> E["Overturn Probability\\nP(overturn) by direction + edge"]
    end

    B --> F["Challenge Value\\nEV = P x success + 1-P x failure - cost"]
    C --> F
    E --> F

    subgraph interp ["Interpretation Layers — not predictive truth"]
        G["Leverage\\npressure proxy"]
        H["Rubrics\\ndescriptive translation"]
        I["Controversy\\neditorial ranking"]
    end

    F --> J["Product\\ngame, team, umpire pages"]
    G --> J
    H --> J
    I --> J`,
      },
      {
        eyebrow: "Core value stack",
        heading: "The strongest work is in count-state value, run expectancy, and win expectancy.",
        paragraphs: [
          "These layers received the most disciplined rebuild. They sit on top of warehouse-first governance, split-aware train, validation, and test control, held-out audits, and model-card documentation. This is the part of the current system I would be most comfortable defending in front of a technical audience.",
          "Count-state is the cleanest foundation because challenge analysis depends heavily on what the count means before and after a call changes. Run expectancy estimates expected runs to inning end from exact baseball state, so call reversals translate into run value. Win expectancy estimates batting-team win probability from the full game state, putting challenge consequences in terms of the game itself.",
          "The RE state definition is RE(inning_bucket, outs, bases_state, count). The WE state definition is WE(inning, half_inning, outs, bases_state, score_diff_bucket, count). Those inputs capture the baseball context that determines how much any single call actually matters.",
        ],
        stats: [
          { label: "Count-state held-out wMAE", value: "BA: 1.74%, BB: 0.36%, K: 0.78%, POS: 1.33%" },
          { label: "RE held-out test", value: "MAE: 0.105, RMSE: 0.199, mean signed error: 0.003" },
          { label: "RE test rows / states", value: "49,854 rows, 1,088 distinct states" },
          { label: "WE held-out test", value: "MAE: 15.5%, Brier: 5.4%, log loss: 0.4992" },
          { label: "WE MLB benchmark", value: "40,963 at-bats, mean gap: 2.5%, median gap: 2.2%" },
        ],
      },
      {
        eyebrow: "Geometry",
        heading: "Geometry is a reconstructed layer, useful now but not settled enough to present as final ABS truth.",
        paragraphs: [
          "The geometry layer matters because ABS begins with a strike-zone decision. Public baseball data alone cannot prove the exact adjudication method the league uses. The current system retains two explicit interpretations of called-pitch geometry: center_only and radius_adjusted. Both are evaluated against challenged outcomes rather than treating one as already settled.",
          "The current validation work points toward center_only as the leading candidate. Segmented follow-up evidence supports that direction, but one smaller held-out comparison left enough ambiguity that the geometry choice stays qualified.",
          "Direction also matters independently. A called strike flipping to a ball is not the same baseball event as a called ball flipping to a strike. They move the count in opposite directions, create different state sequences, and produce different downstream value. The geometry layer is tied to challenge direction because the baseball consequences are direction-aware, and both geometry variants stay in the stack until the evidence for one is conclusive.",
        ],
      },
      {
        eyebrow: "Overturn probability",
        heading: "Overturn probability is a real part of the stack, but I keep it in the product with qualified language.",
        paragraphs: [
          "Overturn probability addresses a straightforward question in the ABS challenge system: given the pitch location and challenge direction, how likely is the call to be overturned? The current model uses a tiered fallback structure. If an exact match exists for the challenge direction and edge bucket, it uses that. If not, it falls back to direction-only, then to a global baseline.",
          "The validation path has improved substantially, but the layer is still geometry-sensitive and limited by sample size. The current held-out audit covers 245 challenged rows and shows a Brier score of 0.2519, log loss of 0.6970, and a mean absolute bucket gap of 8.3% using center_only geometry. The direction is credible, but sparse subgroups still carry wide intervals.",
          "That is enough to call the model promising and usable in context. It is not enough to describe it as final or club-grade.",
        ],
      },
      {
        eyebrow: "Challenge evaluation",
        heading: "Challenge-now is much better engineered than it was, and I still will not oversell it.",
        paragraphs: [
          "The challenge-value decomposition is the most consequential layer in the stack. It combines all the upstream pieces into a single decision estimate: EV = P(overturn) x success_value + (1 - P(overturn)) x failure_value - inventory_cost.",
          "The inputs include exact base-out state, inning, score, count, challenge direction, overturn probability, RE and WE value layers, and an inventory cost version. The full decomposition is exposed in the product output so the user can see the components, not just the final recommendation.",
          "The current evidence does not support presenting it as org-grade live optimization. The held-out opportunity audit covers 9,768 opportunities. Historical challenge share is 2.5%. Current recommendation share is 0.8%. There are 78 positive-EV non-challenged rows and 242 negative-EV challenged rows. The most significant issue is that the budget-constrained validation slice still shows zero overlap between budget-selected rows and historically challenged rows.",
          "Live challenge-now is framed in the product as an experimental lens for discussion. Postgame challenge evaluation is substantially stronger and more credible for retrospective use. Letting one ambitious layer undermine the credibility of the rest of the stack is not a trade worth making.",
        ],
      },
      {
        eyebrow: "Leverage, rubrics, and controversy",
        heading: "Some layers exist to order, describe, or translate. They are not predictive truth.",
        paragraphs: [
          "Leverage is useful because the product needs a pressure-ordering layer, but it is not win probability added under a different name. The current audit treats it as a heuristic pressure proxy. It shows a Pearson correlation of 0.190 to absolute WE swing, with higher mean swing in the high-leverage bucket (5.5%) than in the low-leverage bucket (2.2%). That justifies using it for ordering. It does not justify calling it a calibrated model.",
          "Rubrics and controversy serve different purposes. Rubrics translate challenge patterns and outcomes into readable categories. Controversy ranks events for editorial surfaces. Both help the product communicate clearly, but neither should borrow the tone of the stronger quantitative layers. The audits keep them in descriptive and editorial territory, which is exactly where they belong.",
          "Products lose trust when interpretive layers quietly sound like predictive ones.",
        ],
      },
      {
        eyebrow: "Downstream summaries",
        heading: "Team and umpire summary pages are downstream of challenge-level state changes, not independent truths.",
        paragraphs: [
          "When the product shows average RE change, average WE change, high-leverage share, or similar summary metrics for teams, umpires, or event groups, those numbers are built from challenge-level state transitions. Aggregate pages inherit both the strengths and the limits of the layers underneath them.",
          "That is especially relevant on umpire pages and smaller samples. A directional summary can still be useful, but it should not automatically become a reputational claim just because it is presented cleanly. The product stays explicit about thin samples and qualified reads rather than letting a clean layout imply more than the data supports.",
        ],
      },
      {
        eyebrow: "Current model status",
        heading: "Every layer has an explicit verdict from the dated audit process.",
        paragraphs: [
          "The model layer maintains a status for every layer, documented in model cards and a dated verdict file. The current standing is listed below.",
        ],
        bullets: [
          "Count-state value: green. Held-out audited empirical baseline.",
          "Run expectancy: green. Held-out audited and split-governed.",
          "Win expectancy: green. Held-out audited and externally benchmarked against MLB public WE.",
          "Called-pitch geometry: yellow. Useful, but the geometry choice is still provisional.",
          "Overturn probability: yellow. Credible early model, still sample- and geometry-limited.",
          "Challenge-now: red for org-grade claims. Useful as an experimental live lens and for postgame review.",
          "Leverage: green as heuristic. Pressure proxy, not a calibrated model.",
          "Rubrics: green as descriptive. Translation layer, not predictive truth.",
          "Controversy: green as editorial. Ranking layer for editorial surfaces.",
        ],
        pullQuote: "I want each layer to be used for what it actually is, not for what would sound best in a product description.",
      },
    ],
    relatedSlugs: ["data-layer", "trust-audits-and-monitoring", "product-layer"],
  },
  {
    slug: "ai-layer",
    title: "The AI Layer",
    dek: "How I designed the AI surfaces in AiBS, how context flows into each one, and how prompt behavior, usage, and generation details are tracked over time.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-04-11",
    publishedLabel: "AI Layer",
    readTime: "8 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "AI Systems",
    heroHeading: "I built the AI layer as application architecture, not as a chat box sitting on top of baseball data.",
    leadParagraphs: [
      "The AI layer in AiBS is not one assistant trying to handle every job. The product asks different kinds of questions, expects different response shapes, and has different failure modes depending on where the user is and what they are looking at. Three separate surfaces handle three separate responsibilities: copilot, chart insight, and visualizer.",
      "Each surface receives different input, follows a different prompt contract, and returns a different kind of output. Copilot answers scoped baseball questions from server-side tool results. Chart insight explains one chart payload in a structured format. Visualizer returns a structured chart spec that the app can render, persist, and share. Keeping those jobs separate keeps response behavior close to what the user actually asked for.",
      "The other half of the design is reviewability. I store more than the final response. Conversations, tool calls, safety events, cost records, usage ledger entries, prompt metadata, terminology selections, and generation details are all persisted so I can trace how any response was produced after the fact.",
    ],
    quickFacts: [
      { label: "AI surfaces", value: "Copilot, chart insight, and visualizer" },
      { label: "Prompt design rule", value: "One surface, one job, one response contract" },
      { label: "Review path", value: "Conversations, tool calls, safety events, cost events, usage records, and generation metadata all persisted" },
    ],
    sections: [
      {
        eyebrow: "Surface contracts",
        heading: "Each surface has a distinct job, input shape, and output contract.",
        paragraphs: [
          "Treating every AI interaction as the same kind of request makes failures harder to diagnose. A chart explanation is a different job from a scoped baseball question, and a visual planning task is different again. Running all of those through one prompt and response path blurs behavior and makes the system harder to test.",
          "Every inbound request declares its surface up front: copilot, chart_insight, or visualizer. From there, the server routes into a narrower path with its own prompt builder, surface runner, and output contract.",
          "Copilot is the broadest surface but still bounded. It works from scoped context and server-side tool results. Chart insight only runs when the system has a structured chart payload, and it returns a structured interpretation, not loose prose. Visualizer returns a structured chart spec with axes, grouping, filters, signals, and caveats, and the product can persist that output into a shareable chart artifact. Planning a view is a separate product job from explaining one that already exists.",
        ],
        diagram: `flowchart LR
    A["User Request"] --> B{"Surface"}
    B -->|copilot| C["Copilot Runner"]
    B -->|chart_insight| D["Chart Insight Runner"]
    B -->|visualizer| E["Visualizer Runner"]
    C --> F["Task Family Resolver"]
    D --> F
    E --> F
    F --> G["Prompt Builder + Terminology"]
    G --> H["Model Execution"]
    H --> I["Telemetry Storage"]`,
        bullets: [
          "Copilot: scoped baseball question answering from current tool results",
          "Chart insight: structured explanation of one chart payload",
          "Visualizer: structured chart-planning output for a baseball question",
        ],
      },
      {
        eyebrow: "Task routing",
        heading: "A task-family layer shapes responses by the kind of question, not just the surface name.",
        paragraphs: [
          "Surface type alone does not capture enough context. Within copilot, a game-summary question needs different treatment from an umpire profile explanation. A zone-map chart is different from an inventory deployment chart. A comparison plan differs from a timing-focused visual plan.",
          "The task-family resolver classifies each request into a narrower family based on surface, route scope, chart type when present, and message heuristics. Copilot resolves into families like game summary, ABS explanation, anomaly diagnosis, team profile, umpire profile, and comparison. Chart insight resolves by chart type: decision brief, value timeline, umpire rhythm, zone map, scenario matrix, and inventory deployment. Visualizer resolves into question-to-visual, comparison, and timing-and-leverage plans. That family carries into prompt construction and execution telemetry.",
          "Because the routing rules are explicit in code, they are easy to test. When a surface has a clear input and a clear output contract, I can validate whether it is behaving correctly without guessing at what it was supposed to do.",
        ],
      },
      {
        eyebrow: "Prompt construction",
        heading: "Prompts are built from smaller versioned parts, not from one large file.",
        paragraphs: [
          "Each surface has its own prompt builder. Copilot prompts are structured around answering directly with evidence. Chart insight prompts follow a structured interpretation path. Visualizer prompts return a plan. Those differences live in separate files rather than being squeezed through one generic template.",
          "Prompt changes are easier to track because the system records which prompt version a generation used. When response behavior shifts, I can trace it back to the specific prompt definition that produced it rather than treating prompt text as invisible glue between the request and the response.",
        ],
      },
      {
        eyebrow: "Terminology",
        heading: "A file-backed terminology system keeps wording consistent without bloating the prompt.",
        paragraphs: [
          "I wanted the model to use ABS language consistently, but loading every request with a giant reference block tends to make responses worse. The current approach is more targeted.",
          "Seed files for terminology cards, style packs, and surface rules live in the repository. At runtime, the server derives semantic tags from the request based on task family, message content, and chart type. It selects a bounded set of matching entries, compiles them into a short appendix, and injects that appendix into the prompt.",
          "The selection is fully deterministic. Given the same surface, audience mode, task family, and request tags, the system picks the same wording guidance every time.",
        ],
        stats: [
          { label: "Terminology cards", value: "61 (verified from seed file)" },
          { label: "Style packs", value: "6" },
          { label: "Surface rules", value: "16" },
          { label: "Selection method", value: "Deterministic, derived from task family, message content, and chart type" },
        ],
      },
      {
        eyebrow: "Context and controls",
        heading: "Context passing, usage limits, and request controls are wired into the AI system from the start.",
        paragraphs: [
          "Each surface gets the right amount of context scoped to its job. Chart insight gets a structured chart payload. Copilot gets route-aware tool results scoped to game, team, umpire, or global context. Visualizer works from the current scoped context rather than raw database access.",
          "The request path is also wired into broader application controls: CSRF verification, user authentication, usage limits, request queueing, misuse detection, and rate-limit enforcement. Safety events and rate-limit events are recorded when they fire. That infrastructure shapes how the system behaves under real use, not just how a prompt reads in isolation.",
        ],
      },
      {
        eyebrow: "Observability",
        heading: "I record more than the answer because the answer alone is not enough to debug or improve.",
        paragraphs: [
          "When a generation is stored, the telemetry record includes surface, task family, prompt version, semantic tags, terminology bundle details (style pack, card slugs, appendix character count), estimated prompt size, and structured output where relevant. That gives me a much clearer picture of system behavior than a message log alone.",
          "The AI path also includes a health-check script that validates terminology seed completeness and runs a test and eval suite covering prompt behavior, telemetry correctness, terminology handling, chart insight output structure, and visualizer output structure. Prompt and response behavior can drift quietly while the product still looks like it is working. The surface starts answering the wrong kind of question, or the response shape wanders away from the contract. The tests exist to catch those shifts before they become decisions made on bad output.",
          "A narrower surface is a more testable surface. Once the input and output contracts are well defined, checking for good behavior is specific rather than approximate.",
        ],
        pullQuote: "I built the AI layer to behave like reviewed software, not like a black box that happens to return text.",
      },
    ],
    relatedSlugs: ["product-layer", "data-layer", "trust-audits-and-monitoring"],
  },
  {
    slug: "data-layer",
    aliases: ["sources-and-credits"],
    title: "The Data Layer",
    dek: "How I ingest baseball data, how I separate warehouse and serving responsibilities, and why the application reads from structured serving state rather than raw feed output.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-04-11",
    publishedLabel: "Data Layer",
    readTime: "8 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "Data Engineering",
    heroHeading: "I built the data layer to turn public baseball feeds into stable product truth that the application can serve.",
    leadParagraphs: [
      "AiBS does not depend on raw baseball feeds arriving in exactly the shape the product needs. That assumption usually leads to one of two bad outcomes: the app becomes tightly coupled to source payloads that were never designed for a product, or every route starts doing too much transformation work at request time.",
      "The data layer is built around a split instead. A warehouse path handles heavier ingest, historical working sets, and model development. A serving path holds the compact, structured state the product needs to render live pages, summaries, reports, and analytics. The database and ETL design reflect the full scope of what AiBS is: not just a stats viewer, but a system carrying baseball state, product state, AI state, editorial state, community state, and operational records all at once.",
    ],
    quickFacts: [
      { label: "Core runtime", value: "Next.js, Postgres, Python ETL" },
      { label: "Primary data split", value: "Warehouse responsibilities separated from serving responsibilities" },
      { label: "App loading pattern", value: "SQL-first, server-side. No raw API passthrough." },
    ],
    sections: [
      {
        eyebrow: "Pipeline architecture",
        heading: "Data flows through a defined sequence from public feeds to serving state.",
        paragraphs: [
          "The ingest pipeline pulls from MLB live game feeds and related historical baseball sources, including warehouse-side Statcast and Savant material. A Python ETL layer handles schedule data, live game feeds, play-by-play events, pitch-level detail, Statcast pitch history, and Savant ABS gamefeed data. The data is normalized, keyed to internal identifiers, and written to the database. The warehouse path holds raw snapshots and historical working sets. The serving path holds compact, product-shaped state that the Next.js application reads directly.",
          "The ETL layer lives in Python rather than inside the application server. Ingest work and serving work have different lifecycles, different failure modes, and different schedules. Keeping them separate means a slow backfill job does not touch the application's request path, and a frontend deployment does not require the ETL to redeploy alongside it.",
        ],
        diagram: `flowchart LR
    A["MLB + Statcast + Savant"] --> B["Python ETL\\n18 scripts"]
    B --> C["Warehouse\\nRaw + Historical"]
    B --> D["Serving Tables\\nMart Views"]
    C --> E["Model Dev\\nAudits"]
    D --> F["Next.js App\\nSQL-first"]
    E -.->|"publish"| D`,
      },
      {
        eyebrow: "Warehouse and serving",
        heading: "The two sides of the data layer solve different problems.",
        paragraphs: [
          "The warehouse side handles heavier ingest, historical backfills, model development, and audit work. Raw baseball inputs, historical pitch-level data, and model-oriented tables live there without forcing the public-facing app to carry that weight in its normal serving path.",
          "The serving side handles page-facing baseball state, product metadata, editorial records, community data, AI records, and operational bookkeeping. This is the data the routes actually read to render pages, along with the broader application data that makes AiBS more than a baseball feed viewer.",
          "The product-facing system stays tighter because of that separation. The app does not need the full historical working set on every deployed path. It needs structured outputs, summaries, and compact serving tables that support the pages and workflows people actually use. In the current serving environment, that work is handled through SQL-first helpers and serving tables rather than a dedicated mart schema.",
        ],
      },
      {
        eyebrow: "Database shape",
        heading: "The schema is organized by responsibility, not by baseball alone.",
        paragraphs: [
          "The baseball core includes tables for teams, games, officials, at-bats, play events, pitches, ABS challenges, and game-state snapshots. Those carry the product itself.",
          "The database also serves the rest of the application. Product and identity tables handle users, profiles, roles, and organizations. Editorial tables track articles, revisions, generation runs, and contributors. AI tables store conversations, messages, tool calls, safety events, cost events, usage ledger entries, and generation records. Community tables cover threads, comments, reports, and moderation. Operational tables handle audit logs, rate limits, webhook deliveries, and job runs. Raw archival tables hold Statcast and Savant source data. The modeling namespace houses the called-pitch decision layer.",
          "This structure matters because different parts of the application need different guarantees. Baseball data needs relational integrity. User state and AI usage need stable transactional behavior. Editorial history needs to be auditable. The namespace boundaries exist to keep those concerns clear rather than mixed together.",
        ],
        stats: [
          { label: "Total tables", value: "61" },
          { label: "Schema namespaces", value: "8 active schemas: public, ops, product, editorial, community, ai, raw, modeling" },
          { label: "Mart schema views", value: "0 in the current serving environment" },
        ],
      },
      {
        eyebrow: "Live ingest",
        heading: "The scheduler is simple. The work gate is smarter.",
        paragraphs: [
          "The live polling path runs on a fixed five-minute heartbeat. A simple cadence is easy to understand and reason about operationally. The scheduler wakes up on schedule, and the gate decides whether real work needs to happen.",
          "The gate is Eastern Time aware. If no relevant games exist in the current ET window, the poller exits quickly. If games are scheduled but none are live, it exits again. If the system has been stale for more than eight hours, it runs a bounded catch-up across scheduled ET dates going back up to seven days. Each wake-up does the right amount of work, not a fixed amount.",
          "Serving mode and archive mode are also separated. In serving mode, the hosted database stays focused on structured page-facing state. In archive mode, heavier raw material is preserved outside the normal serving footprint. Snapshot pruning keeps the serving environment from quietly accumulating data that belongs in an archive.",
        ],
      },
      {
        eyebrow: "Live serving",
        heading: "Scoreboard data comes from structured linescore state, not open-ended snapshot retention.",
        paragraphs: [
          "The live scoreboard is one of the clearest examples of the serving design. The application reads from structured linescore state written into ops.game_linescores during ingest. That gives the product a compact, serving-friendly scoreboard source for preview, live, and final games.",
          "The hosted serving environment does not need to behave like a long-term raw archive just to draw a scoreboard. It needs compact state that is easy to read, easy to refresh, and easy to reason about when something goes wrong. Recent operational snapshots can remain where they help the product, but serving should not be confused with archiving.",
        ],
      },
      {
        eyebrow: "Application loading",
        heading: "The application is SQL-first and server-side on purpose.",
        paragraphs: [
          "Server components and route handlers read from shared helpers in src/lib. Analytics pages are built from page-model helpers rather than doing route-local math everywhere. Query logic and data-shaping logic live close to the server-side model of the product rather than scattered across individual routes.",
          "Centralizing retrieval and shaping also helps with consistency. When the same summary or model output is needed in multiple places, there is one path to maintain rather than several slightly different versions. The browser is not treated as a trusted data or authorization layer. Product logic, data loading, and permission boundaries all hold on the server side.",
        ],
      },
      {
        eyebrow: "Why this matters for modeling",
        heading: "The model layer gets stronger when the data layer makes state transitions explicit.",
        paragraphs: [
          "The model work in AiBS depends on more than pitch location. It depends on count state, base state, inning, score, team context, and the tracked review path that follows each challenged or unchanged call. None of that works unless the data layer preserves those transitions cleanly enough for both serving and audit purposes.",
          "The warehouse side carries the strongest model layers. Count-state baselines, run expectancy, win expectancy, and challenge evaluation all sit on top of split-aware governance and held-out audits that trace back directly to the data layer. If the ingest is sloppy or the serving shapes are unclear, the modeling work becomes much harder to trust. A clean data layer is what lets the product carry stronger analytical claims without hand-waving.",
        ],
        pullQuote: "I built the data layer so the application reads from product truth, not from whatever raw feed payloads happen to exist.",
      },
    ],
    relatedSlugs: ["model-layer", "ai-layer", "trust-audits-and-monitoring"],
  },
  {
    slug: "trust-audits-and-monitoring",
    aliases: ["audits-and-monitoring"],
    title: "Trust, Audits, and Model Monitoring",
    dek: "How I validate AiBS across models, data freshness, and the AI layer so the product stays honest about what is strong, what is provisional, and what should stay qualified.",
    authorName: "Colby Reichenbach",
    articleType: "project",
    publishedAt: "2026-04-11",
    publishedLabel: "Trust and Audits",
    readTime: "7 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "Validation Workflow",
    heroHeading: "Trust comes from whether the system can show its work and admit its limits, not from polished pages or confident wording.",
    leadParagraphs: [
      "AiBS makes analytical claims about baseball. That means I need a way to separate what is well supported from what is still early. The trust layer exists so the product does not rely on vague confidence or a one-time check that looked good during development.",
      "Trust in this system has to cover more than one dimension. A product can be wrong because a model is weak, because the data is stale, because a route is presenting something too aggressively, or because an AI response is overreaching. I wanted those different failure types to be identifiable and addressable separately rather than mixed into one vague review process.",
      "The current trust layer rests on four things: held-out model evaluation with dated audit artifacts, data freshness and serving-state monitoring, AI generation observability, and explicit publication boundaries matched to the actual strength of each layer.",
    ],
    quickFacts: [
      { label: "Core validation style", value: "Held-out evaluation with dated artifacts and explicit claim boundaries" },
      { label: "Audit inventory", value: "44 dated reports, 44 JSON artifacts, 9 model cards, all in version control" },
      { label: "Audit types implemented", value: "Product QA, current-state, controversy, decision-value, leverage, RE benchmark, WE benchmark, overturn calibration, rubric, zone-edge" },
    ],
    sections: [
      {
        eyebrow: "How audits work",
        heading: "Every audit leaves behind a runnable script, a dated report, a JSON artifact, and a clear recommendation.",
        paragraphs: [
          "The audit process is built to be repeatable rather than one-off. The repo contains a suite of audit scripts, each producing a dated markdown report, a dated JSON artifact, and a short written recommendation: no change, monitor, recalibrate, or rebuild. Reports and artifacts are stored in version control so any claim boundary can be traced back to the specific evidence that produced it.",
          "The intended cadence runs at three levels. Post-refresh checks are designed to run after final games are available and flag material shifts in error, fallback usage, or benchmark gaps. Weekly reviews look at accumulated artifacts together, focusing on convergence, calibration drift, and distribution changes. Deeper audits are run after major data milestones: when the spring training sample expands significantly, after the first regular-season week, after the first full month, or whenever model logic changes.",
          "The current suite covers 10 audit types: product QA, current-state validation, controversy ranking, decision-value composite, leverage benchmarking, RE benchmarking, WE benchmarking against MLB public WE, overturn-probability calibration, rubric distribution, and zone-edge geometry.",
        ],
        diagram: `flowchart LR
    A["Data Milestone\\nor Refresh"] --> B["Audit Scripts\\n10 types"]
    B --> C["Dated Report\\n.md file"]
    B --> D["Dated Artifact\\n.json file"]
    C --> E{"Recommendation"}
    D --> E
    E -->|"no change"| F["Boundaries Hold"]
    E -->|"monitor"| G["Watch Next Cycle"]
    E -->|"recalibrate"| H["Retune Thresholds"]
    E -->|"rebuild"| I["Rebuild and Re-audit"]`,
      },
      {
        eyebrow: "What is strong vs. what stays qualified",
        heading: "Each layer has an explicit confidence boundary, and the audits are what set those boundaries.",
        paragraphs: [
          "The model layer maintains a traffic-light status for every component, documented in model cards and a dated verdict file. Count-state, RE, and WE are green: held-out audited and externally benchmarked. Called-pitch geometry and overturn probability are yellow: useful but still provisional. Challenge-now is red for org-grade claims: structurally improved but not ready to be presented as operational optimization. Leverage, rubrics, and controversy are green in their intended roles as heuristic, descriptive, and editorial layers.",
          "The specific audit numbers behind those verdicts are in the Model Layer article. What matters here is that the verdicts are not based on feel. They come from the dated audit process and can move in either direction as the evidence develops. A layer can graduate from yellow to green, or a previously green layer can be downgraded if audit metrics start drifting.",
          "Explicit classification by confidence level does more for credibility than polished wording ever could. A reader can look at the boundary and understand exactly what is and is not being claimed.",
        ],
      },
      {
        eyebrow: "Data freshness",
        heading: "Trust also means the product knows when its own serving state is fresh and when it is not.",
        paragraphs: [
          "Model validation is only one dimension of trust. The product also has to trust its own data path. The polling workflow runs on a fixed five-minute heartbeat with an ET-aware gate that decides whether real ingest work needs to happen. Stale systems beyond eight hours get a bounded catch-up. Nothing relevant in the schedule means a quick exit.",
          "Live scoreboard serving reads from structured linescore state rather than depending on open-ended raw snapshot retention. Snapshot pruning keeps the serving environment from quietly accumulating archive-weight data. Those choices exist because stale or loosely shaped serving state can make the product look more certain than it should be.",
          "Blurring the line between fresh structured state, stale operational state, and deeper archive material is a specific failure mode the data design is built to prevent.",
        ],
      },
      {
        eyebrow: "AI observability",
        heading: "AI responses are reviewable because I cannot improve what I cannot trace.",
        paragraphs: [
          "The AI side of trust works differently from the model side, but it matters just as much. When the AI layer produces a response, the system persists the full conversation, individual messages, tool calls, safety events, cost events, usage ledger records, and generation metadata including surface, task family, prompt version, semantic tags, terminology bundle details, and structured output. That record makes it possible to inspect what actually happened rather than guess.",
          "Knowing whether a weak response came from request routing, the selected surface, the prompt version, the terminology bundle, the available tool context, or the response structure is the difference between diagnosing a problem and replacing things at random.",
          "The AI path also includes health checks that validate terminology seed completeness and run a test suite covering prompt behavior, telemetry correctness, and output structure. Prompt and response behavior can drift quietly while the product still appears to function. The tests exist to catch that drift.",
        ],
      },
      {
        eyebrow: "Failure types",
        heading: "The product can be wrong in different ways, and each way needs its own detection path.",
        paragraphs: [
          "Trust in AiBS is organized around four failure types because they require different monitoring and different responses.",
        ],
        bullets: [
          "Model trust: a layer is weak, miscalibrated, or overfit. Caught by held-out audits and dated artifacts.",
          "Data trust: serving state is stale, loosely shaped, or out of sync with the source. Caught by freshness monitoring and structured serving design.",
          "Product trust: a route presents information too aggressively or implies stronger confidence than the underlying layer supports. Caught by publication boundaries and claim-level review.",
          "AI trust: a generated response overreaches, drifts off-surface, or breaks wording consistency. Caught by generation records, health checks, and test suites.",
        ],
        pullQuote: "I want the system to be able to tell me when its own confidence should go down.",
      },
    ],
    relatedSlugs: ["model-layer", "data-layer", "ai-layer"],
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
