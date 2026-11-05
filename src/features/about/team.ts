export interface TeamMember {
  name: string;
  role: string;
  contributions: string[];
}

export const PROJECT_TITLE = "ShopNGo";
export const PROJECT_TAGLINE = "Discover. Understand. Compare. Buy. Track.";

/** Edit this list to change the About page. */
export const TEAM: TeamMember[] = [
  {
    name: "Kuldeep Behera",
    role: "Project lead and full-stack developer",
    contributions: [
      "Designed the overall architecture, database and sign-in system",
      "Built the marketplace flows: catalogue, cart, checkout, orders, seller and moderator tools",
      "Made the app accessible for screen reader users and installable as a PWA",
      "Deployed the live website and automated its testing",
    ],
  },
  {
    name: "Pankaj Gupta",
    role: "Front-end and product experience",
    contributions: [
      "Shaped the look and feel, layouts and cinematic home page",
      "Prepared the product catalogue, categories and descriptions",
      "Worked on search, filters and mobile friendly screens",
    ],
  },
  {
    name: "Jaskaran Singh",
    role: "Quality, research and documentation",
    contributions: [
      "Tested features across devices and reported fixes",
      "Researched the data insights and AI shopping assistant ideas",
      "Wrote the project report and user documentation",
    ],
  },
];
