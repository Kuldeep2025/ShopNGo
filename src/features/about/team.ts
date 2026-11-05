export interface TeamMember {
  name: string;
  role: string;
  summary: string;
  areas: string[];
  contributions: string[];
}

export const PROJECT_TITLE = "ShopNGo";
export const PROJECT_TAGLINE = "Discover. Understand. Compare. Buy. Track.";

/**
 * Edit this list to change the About page.
 * Each person owns a separate area, so no contribution is listed twice.
 */
export const TEAM: TeamMember[] = [
  {
    name: "Jaskaran Singh",
    role: "Project name, architecture and frontend lead",
    summary: "Gave the project its name and shape, and made every screen look and feel the way it does.",
    areas: ["Project name", "Architecture", "Page flow", "Frontend", "CSS styling"],
    contributions: [
      "Chose the project name, ShopNGo, and its tagline: Discover. Understand. Compare. Buy. Track.",
      "Designed the architecture of the whole project: how the pages, components, data and services fit together",
      "Planned the flow of every page, from home to search, product, cart, checkout, orders, seller, moderator and delivery screens",
      "Defined how each component connects to the others, so the same building blocks are reused across the site",
      "Wrote all the CSS styling and the frontend of every page, including layouts, colours, dark mode, animations and mobile screens",
    ],
  },
  {
    name: "Kuldeep Behera",
    role: "Project lead, backend, authentication and deployment",
    summary: "Built the engine behind the screens and put the finished project on the internet.",
    areas: ["Backend", "Database", "Authentication", "Deployment", "Delivery"],
    contributions: [
      "Built the backend: the APIs for catalogue, search, compare, cart, orders, payments, sellers, moderators and delivery partners",
      "Designed the database and loaded the catalogue of 2230 mall products with descriptions and images",
      "Built sign-in with email, Google and phone, and role checks on the server for customers, sellers, moderators, delivery partners and admins",
      "Built the seller application, the moderator review, and the delivery partner system with live location and order tracking",
      "Deployed the live website, ran the database migrations, and kept it awake so it opens at any time",
    ],
  },
  {
    name: "Pankaj Gupta",
    role: "AI integration, testing, automation and documentation",
    summary: "Made the project smarter, checked that it works, and wrote it all down.",
    areas: ["AI integration", "Testing", "Automation", "Research", "Documentation"],
    contributions: [
      "Integrated the AI shopping assistant that answers only from catalogue data, using free models with a safe fallback",
      "Tested the features across devices and reported fixes, including the full purchase and delivery flow",
      "Automated the checks and routine jobs, such as test scripts and the scheduled health check",
      "Researched the data insights, recommendations and AI shopping assistant ideas",
      "Wrote the project report and the user documentation",
    ],
  },
];

export const STATS = [
  { value: 2230, suffix: "", label: "products in the catalogue" },
  { value: 5, suffix: "", label: "kinds of users: shopper, seller, moderator, delivery partner, admin" },
  { value: 40, suffix: "+", label: "backend endpoints" },
  { value: 3, suffix: "", label: "students, one academic project" },
];

export const FEATURES = [
  { title: "A full mall catalogue", text: "2230 products across clothing, electronics, grocery, home, beauty, toys, books and more, each with a description and an image." },
  { title: "Search and compare", text: "Find products by name, category and price, then compare them side by side before you buy." },
  { title: "AI shopping assistant", text: "Ask a question in plain words. It answers only from real catalogue data, and never makes up prices." },
  { title: "Cart, checkout and orders", text: "A cart that always shows the true price and stock, multi-store orders and a complete order history." },
  { title: "Verified sellers", text: "Anyone can apply to sell. A moderator reviews each application before a store goes live." },
  { title: "Delivery partners", text: "Anyone can apply to deliver. Partners go online, share their location, accept nearby orders and complete them." },
  { title: "Live order tracking", text: "Customers see the delivery partner, the distance and the estimated time on a live map." },
  { title: "Works like an app", text: "Installs on a phone from the browser, loads fast and shows an offline page without internet." },
  { title: "Built for everyone", text: "Works with screen readers, keyboards and dark mode, with clear labels on every control." },
];

export const FLOW = [
  { step: "Browse", text: "Explore categories, search and compare" },
  { step: "Cart", text: "Add items from one or many stores" },
  { step: "Order", text: "Pick an address and place the order" },
  { step: "Pay", text: "Pay with the demo payment" },
  { step: "Deliver", text: "A nearby partner picks it up" },
  { step: "Track", text: "Follow it live until it arrives" },
];

export const LAYERS = [
  { name: "Frontend", text: "Next.js and React pages styled with Tailwind CSS: responsive, animated and accessible.", tech: "Next.js, React, Tailwind CSS" },
  { name: "Backend", text: "Server routes that check every request, enforce roles and keep prices and stock honest.", tech: "Next.js API routes, Zod" },
  { name: "Database", text: "A hosted PostgreSQL database holding products, stores, orders, deliveries and users.", tech: "Prisma, Neon PostgreSQL" },
  { name: "Authentication", text: "Sign in with email, Google or phone. The server verifies every sign-in token.", tech: "Firebase Authentication" },
  { name: "AI", text: "A catalogue-grounded assistant on free models, with a safe fallback when a model is unavailable.", tech: "Groq, OpenRouter (free models)" },
  { name: "Location", text: "Free location services: the browser's location, OpenStreetMap maps and distance estimates.", tech: "Geolocation API, OpenStreetMap" },
  { name: "Hosting", text: "Live on the web, installable as an app, and kept awake with scheduled health checks.", tech: "Render, PWA, GitHub Actions" },
];
