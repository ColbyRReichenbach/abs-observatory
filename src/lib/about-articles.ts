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
    dek: "What the project is, why it exists, and how the product turns ball-strike data into something a normal baseball fan can actually use.",
    authorName: "Colby Reichenbach",
    articleType: "project",
    publishedAt: "2026-03-01",
    publishedLabel: "Founding Brief",
    readTime: "6 min read",
    accentClass: "text-[#8b0000]",
    heroEyebrow: "Project Brief",
    heroHeading: "The dawn of the automated era needed a front page.",
    leadParagraphs: [
      "It was inevitable, yet revolutionary. The year 2026 marked a turning point where the human eye, as sharp as it may be, was supplemented by the unwavering gaze of the machine. AiBS was born not to replace the drama of the diamond, but to help explain what this new era of ball-strike accountability actually means.",
      "Our mission is simple: transparency. Every pitch, every challenge, and every decision deserves to be logged, organized, analyzed, and presented in a way that makes sense. Baseball already has the numbers. The real problem is giving those numbers shape, context, and a language fans can actually use.",
      "From the data layer to the game page, the Observatory is meant to make ABS legible. It takes a rules change that could feel abstract or overly technical and turns it into something a fan can inspect: team tendencies, umpire behavior, challenge value, and the practical consequences of those decisions on the field.",
    ],
    quickFacts: [
      { label: "Focus", value: "ABS telemetry, challenge outcomes, and strike-zone context" },
      { label: "Audience", value: "Fans first, with front-office-grade clarity" },
      { label: "Approach", value: "Explain the data before trying to impress with it" },
    ],
    featureCards: [
      {
        title: "The Architect",
        subtitle: "UI / UX / STRATEGY",
        imageSrc: "/images/about/architect.png",
        imageAlt: "The Architect",
        subtitleColor: "text-blue-800",
        linkHref: "/about/architect",
        rotateDegree: -2,
        stats: [
          { label: "Design Sys", value: "V2.4" },
          { label: "Components", value: "84" },
          { label: "Motion", value: "Framer" },
          { label: "Aesthetic", value: "Modern" },
        ],
        description: "Builds interfaces that make complex baseball analytics readable in seconds, not minutes.",
      },
      {
        title: "The Brain",
        subtitle: "AI / DATA / CORE",
        imageSrc: "/images/about/brain.png",
        imageAlt: "The Brain",
        subtitleColor: "text-red-800",
        linkHref: "/about/brain",
        rotateDegree: 2,
        stats: [
          { label: "Pipelines", value: "Active" },
          { label: "Throughput", value: "10k/s" },
          { label: "Models", value: "v4" },
          { label: "Latency", value: "<50ms" },
        ],
        description: "Turns raw tracking data into stable, explainable baseball intelligence.",
      },
    ],
    sections: [
      {
        eyebrow: "Mission",
        heading: "Baseball data should not require translation by insiders.",
        paragraphs: [
          "A lot of sports analytics products either flatten the sport into a spreadsheet or bury useful information beneath jargon. AiBS is trying to avoid both failures. It is designed so a curious fan can navigate league-level patterns, team behavior, and individual umpire tendencies without needing a technical background just to get started.",
          "That matters even more with ABS because the topic already comes with noise. Fans argue about fairness, catcher framing, the role of umpiring, and whether technology improves or sterilizes the game. A useful product should help people evaluate those questions with context instead of empty certainty.",
        ],
      },
      {
        eyebrow: "What Lives Here",
        heading: "The product is built around explanation, not just presentation.",
        paragraphs: [
          "The frontend is organized so charts tell one clear story at a time. Team views show tendencies and league positioning. Umpire views show accuracy, volatility, and challenge exposure. Game views show what happened in a way that ties challenge events back to count state and leverage.",
          "The AI layer exists for the same reason. Not every user wants to decode a scatter plot or understand a variance axis on sight. Built-in explanations turn the product into a translator, helping a fan move from seeing a chart to understanding what the chart is actually saying.",
          "This is also why the original Starting Battery cards remain part of the piece. The Architect and The Brain are not throwaway flavor. They describe the two sides of the product that have to stay aligned: an interface that earns trust and a data core that deserves it.",
        ],
        bullets: [
          "League, team, umpire, and game slices are designed to answer different questions without duplicating noise.",
          "Charts are audited so tooltips, axes, and labels stay aligned with the actual underlying data.",
          "AI explanations are meant to support reasoning, not replace it.",
        ],
      },
      {
        eyebrow: "Standard",
        heading: "The point is better dialogue.",
        paragraphs: [
          "The product philosophy is direct: if you are going to make a claim, there should be a way to inspect it. That standard applies to praise, criticism, and debate alike. If a team manages the challenge system well, users should be able to prove it. If an umpire shows unusual variance, users should be able to see it.",
          "AiBS is meant to give fans a tool for grounded conversation. Less gibberish. Less talking out of your ass about something you have not actually looked at. More opinions backed by charts, evidence, and a willingness to inspect the facts.",
        ],
        pullQuote: "A baseball argument is more interesting when both sides can point to the same evidence.",
      },
    ],
    relatedSlugs: ["architect", "brain", "abs-explained"],
  },
  {
    slug: "abs-explained",
    title: "What ABS Actually Is",
    dek: "A plain-language breakdown of the Automated Ball-Strike challenge system, where it came from, why MLB adopted it, and what its first Major League season is trying to solve.",
    authorName: "Colby Reichenbach",
    articleType: "explainer",
    publishedAt: "2026-03-03",
    publishedLabel: "Rules Primer",
    readTime: "8 min read",
    accentClass: "text-blue-900",
    heroEyebrow: "ABS Explainer",
    heroHeading: "The 2026 season is MLB's first year with the ABS challenge system in regular Major League play.",
    leadParagraphs: [
      "ABS stands for Automated Ball-Strike. In Major League Baseball's current form, it does not mean a computer calls every pitch automatically. It means the home-plate umpire still calls the game, but a pitcher, catcher, or batter can immediately challenge a ball-or-strike call and send it to the Hawk-Eye system for review.",
      "That distinction matters. MLB did test full 'robot ump' formats in prior experiments, but the version that reached the majors is the challenge model. The league chose a compromise that preserves the rhythm and personality of a human plate umpire while giving players a fast correction tool for the most consequential misses.",
      "As of March 8, 2026, this is the first Major League season using the ABS Challenge System after years of testing in the Atlantic League, the Florida State League, Triple-A, 2025 Spring Training, and the 2025 All-Star Game.",
    ],
    quickFacts: [
      { label: "Major League Debut", value: "2026 season" },
      { label: "Who Can Challenge", value: "Only the pitcher, catcher, or batter" },
      { label: "Baseline Rules", value: "Two challenges per team; successful challenges are retained" },
    ],
    sections: [
      {
        eyebrow: "History",
        heading: "The league did not jump straight into the majors.",
        paragraphs: [
          "The full ABS concept first showed up in the independent Atlantic League in 2019. MLB then expanded testing through the affiliated Minor Leagues beginning in 2021, introduced the challenge format in the Florida State League in 2022, and used ABS in Triple-A starting in 2022 while comparing full automation against the challenge model.",
          "By June 25, 2024, all Triple-A games shifted to the challenge system for the rest of that season. That was a meaningful signal. It showed the league had learned enough from the earlier experiments to narrow in on a preferred format instead of continuing to split time evenly between two philosophies.",
        ],
        stats: [
          { label: "First full ABS trial", value: "Atlantic League, 2019" },
          { label: "Challenge trial", value: "Florida State League, 2022" },
          { label: "Triple-A use", value: "Started in 2022" },
        ],
      },
      {
        eyebrow: "How It Works",
        heading: "The on-field process is intentionally fast.",
        paragraphs: [
          "MLB's version uses Hawk-Eye cameras to track pitch location relative to a hitter-specific strike zone. If the pitcher, catcher, or batter thinks the call was wrong, that player immediately taps his cap or helmet and verbally challenges. No dugout consultation and no manager participation are allowed.",
          "The ball's location is measured as it passes the middle of the plate. The zone is 17 inches wide, the top is set at 53.5 percent of a player's measured height, and the bottom is set at 27 percent. If any part of the ball catches any part of the zone, the pitch is ruled a strike.",
          "MLB has said the review process takes roughly 15 seconds. In the league's 2025 Spring Training experiment, the average challenge took 13.8 seconds, which is short enough that the system functions more like a quick correction than a traditional replay stoppage.",
        ],
        bullets: [
          "Each team begins with two challenges.",
          "A team keeps the challenge if the call is overturned.",
          "The scoreboard and broadcast show the result after review.",
        ],
      },
      {
        eyebrow: "Why MLB Did It",
        heading: "The challenge system is MLB's middle-ground answer to a trust problem.",
        paragraphs: [
          "MLB did not adopt ABS because umpires suddenly became bad at their jobs. The issue is narrower than that. When one or two missed ball-strike calls decide the tone of a plate appearance, players and fans want a correction mechanism they trust. The challenge model creates that release valve without placing every pitch entirely in the hands of automation.",
          "It also preserves strategy. Players have to choose when a challenge is worth spending. That creates a new skill layer around count leverage, pitch certainty, catcher feel, and late-game discipline.",
        ],
        pullQuote: "MLB chose a correction system, not a full replacement system.",
      },
      {
        eyebrow: "Early Results",
        heading: "The 2025 major-league trial gave the league enough confidence to move forward.",
        paragraphs: [
          "In 2025 Spring Training, ABS was used in roughly 60 percent of games across 13 parks. MLB reported a 52.2 percent overturn rate, up from 50.6 percent in Triple-A in 2024. The league also reported 4.1 challenges per game on average, with catchers posting the highest success rate among challengers.",
          "That combination matters because it suggests the system was used often enough to matter, but not so often that games turned into challenge marathons. The test produced enough action to be relevant without swamping the pace of play.",
        ],
        stats: [
          { label: "Spring 2025 overturn rate", value: "52.2%" },
          { label: "Average challenges", value: "4.1 per game" },
          { label: "Average review time", value: "13.8 seconds" },
        ],
      },
      {
        eyebrow: "Debate",
        heading: "There is still a real baseball argument here.",
        paragraphs: [
          "Supporters see ABS as overdue accountability. They argue the game already uses elite tracking technology everywhere else, so leaving the most visible calls uncorrected makes less and less sense. Critics worry that any automated zone, even a challenge-based one, chips away at the craft of receiving, framing, and adjusting to a human umpire's zone over the course of a night.",
          "Both sides have a point. The important thing is that the debate is no longer abstract. The 2026 season is not a thought experiment. It is the first true Major League season in which fans, players, and teams get to judge whether the challenge version actually improves the game.",
        ],
      },
    ],
    sources: [
      {
        label: "MLB press release on 2026 launch",
        href: "https://www.mlb.com/press-release/press-release-mlb-announces-abs-challenge-system-coming-to-the-major-leagues-beginning-in-the-2026-season",
      },
      {
        label: "MLB overview of the 2026 Ball-Strike Challenge System",
        href: "https://www.mlb.com/news/ball-strike-challenge-system-2026",
      },
      {
        label: "MLB Spring Training 2025 ABS results",
        href: "https://www.mlb.com/news/automated-ball-strike-system-results-mlb-spring-training-2025",
      },
      {
        label: "MLB on Triple-A challenge-system rollout in 2024",
        href: "https://www.mlb.com/news/triple-a-abs-challenge-system",
      },
    ],
    relatedSlugs: ["about-aibs", "why-i-built-aibs"],
  },
  {
    slug: "why-i-built-aibs",
    title: "Why I Built AiBS",
    dek: "A founder note on baseball, data, and the case for giving everyday fans tools that let them argue from evidence instead of noise.",
    authorName: "Colby Reichenbach",
    articleType: "founder",
    publishedAt: "2026-03-05",
    publishedLabel: "Founder Note",
    readTime: "5 min read",
    accentClass: "text-[#2d5a27]",
    heroEyebrow: "Founder Letter",
    heroHeading: "I built this because baseball deserves better conversations.",
    leadParagraphs: [
      "I love baseball because it invites obsession. There is history in it, rhythm in it, and more information in a single game than most people realize. The problem is not that baseball lacks data. The problem is that too much of that data is trapped behind interfaces or language that make normal fans feel like the conversation belongs to someone else.",
      "AiBS is my attempt to fix that. I wanted a product that makes baseball information accessible to people who care deeply about the game but do not necessarily work in analytics, engineering, or player development. If a fan wants to understand ABS, challenge value, umpire trends, or why a chart matters, the product should help rather than intimidate.",
      "I also care about the standard of the conversation itself. A lot of sports discourse is built on confidence without evidence. I do not think that is harmless. If we are going to make strong claims about the game, we should be willing to inspect the facts behind them.",
    ],
    quickFacts: [
      { label: "Core belief", value: "Opinions get better when the evidence is visible" },
      { label: "Target user", value: "Curious fans, not just technical specialists" },
      { label: "Product principle", value: "Explain the chart, then let the user explore" },
    ],
    sections: [
      {
        eyebrow: "Accessibility",
        heading: "Data only matters if people can use it.",
        paragraphs: [
          "There is no shortage of baseball dashboards. What is rarer is a product that respects the user's time and context. AiBS is meant to make advanced information legible. That means clearer labels, better axes, stronger chart logic, and plain-language explanations that connect a metric to an actual baseball consequence.",
          "That is also why the product includes AI explanations. They are not there to fabricate expertise. They are there so a user can ask what a chart means, what a pattern suggests, or why a number matters and get a grounded answer without needing to reverse-engineer the interface.",
        ],
      },
      {
        eyebrow: "Dialogue",
        heading: "The goal is not to eliminate opinion. It is to sharpen it.",
        paragraphs: [
          "Baseball should still be argued about. That is part of the fun. But the argument gets better when people can test their instincts. If someone thinks a team is gaming the challenge system well, they should be able to verify that. If someone thinks an umpire had a rough week, there should be a path from that claim to a chart and then to the underlying evidence.",
          "To me, that is the difference between dialogue and noise. One is curious and accountable. The other is just filling space.",
        ],
        pullQuote: "If you are interested in something, use the tool, inspect the numbers, and then talk.",
      },
      {
        eyebrow: "Where It Goes",
        heading: "This is meant to grow as the game changes.",
        paragraphs: [
          "ABS is going to evolve. The way teams challenge will evolve. Fan questions will evolve too. The about section is set up like an editorial desk because I want space to document that evolution clearly, whether the next piece is a deeper technical explainer, a product note, or a new perspective on how the system changes baseball culture.",
          "The product should keep earning trust. That means adding coverage when it is useful and avoiding filler when it is not.",
        ],
      },
    ],
    relatedSlugs: ["about-aibs", "abs-explained"],
  },
  {
    slug: "architect",
    title: "The Architect",
    dek: "How the frontend and product strategy try to make a dense baseball subject feel immediate, elegant, and useful.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-06",
    publishedLabel: "Profile",
    readTime: "4 min read",
    accentClass: "text-blue-900",
    heroEyebrow: "Profile",
    heroHeading: "Designing the interface is designing the argument.",
    leadParagraphs: [
      "The frontend of AiBS is not treated as decoration after the real work is done. It is part of the core baseball logic. If a chart confuses the user, if a page buries the point, or if a trendline feels disconnected from the game action, the product is failing even if the data pipeline underneath it is technically correct.",
      "That is why the UI and UX side of the project focuses on hierarchy, pacing, and trust. The job is to help someone read a baseball situation correctly in a few seconds and then decide whether they want the quick answer or the deeper explanation.",
    ],
    quickFacts: [
      { label: "Priority", value: "Readable analytics under game-speed attention" },
      { label: "Tension", value: "Premium editorial feel without obscuring the data" },
      { label: "Standard", value: "Every visual should answer a baseball question" },
    ],
    sections: [
      {
        eyebrow: "Interface",
        heading: "Good UI reduces the cost of understanding.",
        paragraphs: [
          "The visual language is intentionally assertive. Typography, spacing, reference lines, and color are all doing explanatory work. They help establish what is primary, what is supporting evidence, and where the eye should go first.",
          "That matters because baseball analytics can fail through subtle clutter. A label in the wrong place, a tooltip that does not match a plotted point, or an axis with ugly fractional values can quietly erode trust. The frontend has to be disciplined enough that the user rarely notices the effort behind the presentation.",
        ],
      },
      {
        eyebrow: "Product Strategy",
        heading: "A fan should be able to enter anywhere and still make sense of the system.",
        paragraphs: [
          "Some users come in through a game page. Others care about a favorite team or a specific umpire. The product has to support those entry points without turning the experience into five disconnected dashboards. The interface strategy is to keep each page opinionated while maintaining one shared mental model for the user.",
          "That is why consistency in chart behavior matters. Hover states, tooltip language, visual scales, and card patterns need to reinforce each other. The product should feel like one publication with multiple desks, not a collection of unrelated widgets.",
        ],
      },
    ],
    relatedSlugs: ["brain", "about-aibs"],
  },
  {
    slug: "brain",
    title: "The Brain",
    dek: "The data, model, and explanation layer that turns pitch-tracking inputs into something the product can trust and present.",
    authorName: "Colby Reichenbach",
    articleType: "profile",
    publishedAt: "2026-03-07",
    publishedLabel: "Profile",
    readTime: "4 min read",
    accentClass: "text-red-900",
    heroEyebrow: "Profile",
    heroHeading: "Truth in this product starts with disciplined processing.",
    leadParagraphs: [
      "The Brain is the part of AiBS that users do not see directly, but it determines whether anything on the screen deserves confidence. It is responsible for turning raw pitch and challenge information into stable metrics, structured comparisons, and explanations that preserve the baseball meaning of the data.",
      "That means ingesting data cleanly, protecting the relationships between plotted points and tooltip payloads, and making sure a chart tells the same story no matter whether a user is reading the axis, the hover state, or the annotation line.",
    ],
    quickFacts: [
      { label: "Role", value: "Translate telemetry into trustworthy product inputs" },
      { label: "Focus", value: "Accuracy, consistency, and explainability" },
      { label: "Constraint", value: "Fast enough for live product use, careful enough for review" },
    ],
    sections: [
      {
        eyebrow: "Pipeline",
        heading: "Data quality is a product feature.",
        paragraphs: [
          "A baseball analytics product can look polished and still be wrong. That is why the data layer has to treat mapping, aggregation, and chart formatting as first-order concerns. The numbers need to survive the trip from source data to visualization without silent distortion.",
          "In practice that means auditing transforms, verifying axis domains, checking tooltip bindings, and standardizing formatting so the system does not accidentally imply precision it does not have.",
        ],
      },
      {
        eyebrow: "Explanation",
        heading: "The intelligence layer should clarify, not improvise.",
        paragraphs: [
          "AiBS uses AI to help interpret data, but the standard is strict. The model should explain what is already there, connect metrics to baseball outcomes, and give the user a better path through the information. It should not invent insight or bluff around weak evidence.",
          "That is the real job of the brain in this project: not to sound smart, but to help the product stay honest while remaining useful.",
        ],
      },
    ],
    relatedSlugs: ["architect", "about-aibs"],
  },
];

export function getAboutArticleBySlug(slug: string) {
  return (
    ABOUT_ARTICLES.find((article) => article.slug === slug || article.aliases?.includes(slug)) ?? null
  );
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
