import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/features/legal/LegalPage";
import { CONTACT_EMAIL } from "@/features/legal/meta";
import { DEMO_NOTICE } from "@/features/legal/demoNotice";

export const metadata: Metadata = {
  title: "Terms and Conditions | ShopNGo",
  description:
    "The rules for using ShopNGo, an academic final-year marketplace project: accounts, roles, orders, payments (demo mode for now), conduct, content, AI assistant and liability.",
};

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    paragraphs: [
      "By creating an account or using ShopNGo you agree to these Terms and Conditions and to our Privacy Policy. If you do not agree, please do not use the site.",
      "ShopNGo is an academic final-year minor project. " + DEMO_NOTICE.terms,
    ],
  },
  {
    id: "eligibility",
    title: "Who can use ShopNGo",
    paragraphs: [
      "You must be at least 18 years old, or use the site with a parent or guardian. You must give correct information and be able to form a binding agreement under Indian law.",
    ],
  },
  {
    id: "accounts",
    title: "Your account",
    paragraphs: [
      "You sign in with Google, email or phone through Firebase. You are responsible for keeping your sign-in details safe and for what happens under your account. Tell us quickly if you think someone else has used it. One person should keep only one account.",
    ],
  },
  {
    id: "roles",
    title: "Roles on the site",
    bullets: [
      "Customer: browses, compares, orders, tracks deliveries and writes reviews.",
      "Seller: lists products for a store after applying and being approved.",
      "Delivery partner: delivers orders after applying and being approved.",
      "Moderator: reviews applications, listings and reviews to keep the marketplace trustworthy.",
      "Admin: the project team, who manage the site.",
    ],
    after: ["Roles can be given or removed at our discretion. Having a role does not make you an employee or agent of the project team."],
  },
  {
    id: "sellers",
    title: "Listings and seller duties",
    paragraphs: ["If you are a seller, you agree that:"],
    bullets: [
      "Your listings are accurate, with true descriptions, prices, stock and images that you have the right to use.",
      "You will not list illegal, counterfeit, dangerous or restricted goods.",
      "You will prepare orders honestly and on time, and treat customers fairly.",
      "Moderators may edit, hide or remove listings, and may suspend a store.",
    ],
  },
  {
    id: "orders",
    title: "Orders and payments (demo mode for now)",
    paragraphs: [
      DEMO_NOTICE.termsOrders,
    ],
  },
  {
    id: "delivery",
    title: "Delivery partner conduct",
    paragraphs: ["If you are a delivery partner, you agree to:"],
    bullets: [
      "Share your location only while delivering, and use it only for the delivery.",
      "Handle orders with care and deliver them to the correct address.",
      "Keep customer addresses and contact details private and use them only for that delivery.",
      "Follow traffic and safety laws. Never use the app while driving or riding in an unsafe way.",
      "Behave politely and honestly with customers and sellers.",
    ],
  },
  {
    id: "conduct",
    title: "What you must not do",
    bullets: [
      "Break any law or help anyone else do so.",
      "Pretend to be another person, or give false information.",
      "Post abusive, hateful, harassing, sexual or misleading content.",
      "Fake reviews, or pay or pressure others for reviews.",
      "Try to break, overload, scrape or get around the security of the site.",
      "Misuse another person's data, or share your account.",
      "Upload viruses or harmful code.",
    ],
    after: ["We may remove content or suspend accounts that break these rules."],
  },
  {
    id: "content",
    title: "Reviews and your content",
    paragraphs: [
      "You keep ownership of the reviews, listings and other content you post. By posting, you give ShopNGo a free, non-exclusive licence to store, display and use that content on the site and in project demonstrations and reports. You promise that you have the right to post it and that it does not harm anyone else's rights. You can ask us to delete your content.",
    ],
  },
  {
    id: "ai",
    title: "AI assistant",
    paragraphs: [
      "The shopping assistant uses third-party AI services and can be wrong, out of date or incomplete. Do not rely on it for medical, legal, financial or safety decisions. Check important details such as price, size and ingredients on the product page. Your question text is sent to the AI provider, so please do not type personal or sensitive information.",
    ],
  },
  {
    id: "ip",
    title: "Intellectual property and copyright",
    paragraphs: [
      "The ShopNGo code, design, text and logo are the work of the project team and are protected by copyright. The frontend design, project name, architecture and styling are by Jaskaran Singh. The backend, database, authentication, deployment and delivery system are by Kuldeep Behera. AI integration, testing, automation and documentation are by Pankaj Gupta. See the About page for the full credits.",
      "Product names, brands and images shown by sellers belong to their owners. You may view and use the site for your own personal use, but you may not copy, sell or republish the project without written permission, except as the law allows. If you think something on the site infringes your copyright, email us and we will look into it.",
    ],
  },
  {
    id: "disclaimer",
    title: "Disclaimers",
    paragraphs: [
      "ShopNGo is provided as is and as available, for learning and demonstration at this stage. We do not promise it will always be available, error-free or secure, and the free hosting may be slow or sleep. Product information is provided by sellers and the sample catalogue, and we do not guarantee it.",
    ],
  },
  {
    id: "liability",
    title: "Limits on our liability",
    paragraphs: [
      "To the extent the law allows, the project team is not liable for any loss or damage from using or not being able to use ShopNGo, including lost data, lost profit, or dealings between users. Because the service is free and academic, our total liability for any claim is limited to the amount you paid us, which is zero. Nothing here removes rights that cannot be removed by law.",
    ],
  },
  {
    id: "termination",
    title: "Ending your use",
    paragraphs: [
      "You can stop using ShopNGo at any time and ask us to delete your account. We may suspend or end access if you break these terms, or if the project is changed or shut down at the end of its academic use.",
    ],
  },
  {
    id: "law",
    title: "Governing law",
    paragraphs: [
      "These terms follow the laws of India, including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023. Any dispute is first to be settled by talking to us, and otherwise falls under the courts of India that have jurisdiction.",
    ],
  },
  {
    id: "changes",
    title: "Changes to these terms",
    paragraphs: [
      "We may update these terms as the project grows. The date at the top shows the latest version. Using ShopNGo after a change means you accept the new terms.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [`Questions about these terms can be sent to Kuldeep Behera at ${CONTACT_EMAIL}.`],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and Conditions"
      intro="These are the rules for using ShopNGo. Please read them before you create an account, buy, sell or deliver."
      sections={sections}
      other={{ href: "/privacy", label: "Privacy Policy" }}
    />
  );
}
