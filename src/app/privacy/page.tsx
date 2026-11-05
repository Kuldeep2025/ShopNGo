import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/features/legal/LegalPage";
import { CONTACT_EMAIL } from "@/features/legal/meta";

export const metadata: Metadata = {
  title: "Privacy Policy | ShopNGo",
  description:
    "How ShopNGo, an academic final-year project, collects, uses, shares and protects your personal data, and the choices and rights you have.",
};

const sections: LegalSection[] = [
  {
    id: "about",
    title: "Who we are and what this policy covers",
    paragraphs: [
      "ShopNGo is a multi-store online marketplace built by Kuldeep Behera, Pankaj Gupta and Jaskaran Singh as an academic minor project in their final year. This policy explains what personal data the website collects, why, who else handles it, and what you can ask us to do.",
      "Because this is a student project, it is run on free hosting for learning and demonstration. We try to follow good practice and the spirit of India's Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000, but we do not claim to be a registered business or to have formal legal certification.",
    ],
  },
  {
    id: "collect",
    title: "What data we collect",
    bullets: [
      "Account data: your name, email address or phone number, profile picture if your Google account provides one, and a sign-in identifier, handled through Firebase Authentication (Google sign-in, email and password, or phone code).",
      "Profile data: the display name, role (customer, seller, delivery partner, moderator or admin) and preferences you set.",
      "Addresses and location: delivery addresses you save, and your location when you place an order for delivery or when you allow your browser to share it. Delivery partners share live location while delivering an order.",
      "Orders and payments: items, quantities, prices, delivery address, order status and history. Payments here are demo or test only, so we do not collect or store real card, UPI or bank details.",
      "Reviews and content: ratings, review text and anything else you post.",
      "Seller and delivery partner applications: the store or business details, contact details and documents or answers you submit when you apply.",
      "AI assistant questions: the text you type to the shopping assistant.",
      "Basic technical logs: pages requested, time, browser type and error information, kept by our hosting service for running and fixing the site.",
    ],
  },
  {
    id: "use",
    title: "Why we use your data",
    bullets: [
      "To create your account, sign you in and keep it secure.",
      "To show products, take orders, route deliveries and show order tracking.",
      "To let sellers manage listings and orders, and delivery partners complete deliveries.",
      "To show reviews, review seller and delivery applications, and keep the marketplace trustworthy.",
      "To answer your questions through the AI assistant.",
      "To find and fix bugs, prevent misuse and demonstrate the project for academic assessment.",
    ],
    after: ["We do not sell your personal data and we do not use it for advertising."],
  },
  {
    id: "basis",
    title: "On what basis we use your data",
    paragraphs: [
      "In plain words: we use your data mainly because you gave consent by creating an account and using a feature, or because it is needed to give you the service you asked for, such as delivering an order. Under the DPDP Act, 2023 this is consent, and certain uses you would reasonably expect when you voluntarily give us data for a purpose.",
      "Location is only used when you allow it. You can refuse or withdraw this permission in your browser settings at any time. Some delivery features will then not work.",
    ],
  },
  {
    id: "sharing",
    title: "Who else handles your data",
    paragraphs: ["We use these outside services to run the site. They process data under their own terms and privacy policies."],
    bullets: [
      "Firebase and Google: sign-in, and optional usage analytics if you allow it.",
      "Neon: the Postgres database where accounts, orders, reviews and listings are stored.",
      "Render: the hosting service that runs the website and keeps server logs.",
      "OpenStreetMap and Nominatim: address search and maps. The place or address text you search for is sent to them.",
      "AI providers such as Groq, OpenRouter and other free AI services: they receive only the question text you type to the assistant, not your name, email or account details. Please do not type personal or sensitive information into the assistant.",
      "Within the marketplace: a seller sees what is needed to fulfil your order, such as items and delivery address. A delivery partner sees the address and contact needed to deliver it.",
    ],
    after: ["Some of these services store data on servers outside India. We may also share data if the law requires it."],
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    paragraphs: [
      "We use cookies and your browser's local storage for sign-in sessions, your cart, your theme choice (light or dark) and similar settings. If analytics are on, Firebase Analytics may also use them. You can control analytics with the privacy preferences button in the page footer, and you can clear cookies and site data in your browser at any time. Clearing them may sign you out.",
    ],
  },
  {
    id: "retention",
    title: "How long we keep data",
    paragraphs: [
      "We keep account, order and review data while your account exists and for as long as the project is running or being assessed. Server logs are kept for a short period by the hosting service. When you ask us to delete your data, we remove or anonymise it unless we must keep something for a legal reason or to protect against abuse. When the project is finally shut down, the database may be deleted.",
    ],
  },
  {
    id: "security",
    title: "How we protect your data",
    paragraphs: [
      "We use sign-in through Firebase, checks on the server for every role, encrypted connections (HTTPS) and a managed database. No online service is perfectly secure, and this is a student project, so please do not store anything you would not be comfortable losing. If you find a security problem, please tell us at the email below.",
    ],
  },
  {
    id: "rights",
    title: "Your rights and choices",
    bullets: [
      "Access: ask what data we hold about you.",
      "Correction: fix wrong or incomplete data. Most details can be edited in your account page.",
      "Deletion: ask us to delete your account and data.",
      "Withdraw consent: stop sharing location, turn off analytics, or stop using the site.",
      "Grievance: complain if you think we have handled your data wrongly.",
    ],
    after: [`To use any of these rights, email ${CONTACT_EMAIL} from the address linked to your account. We will try to reply within 30 days.`],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      "ShopNGo is not meant for children under 18. If you are under 18, please use it only with a parent or guardian. If you think a child has given us data without a parent's consent, tell us and we will delete it.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    paragraphs: [
      "We may update this policy as the project changes. The date at the top shows the latest version. If we make an important change we will try to show a notice on the site. By continuing to use ShopNGo after a change, you accept the updated policy.",
    ],
  },
  {
    id: "contact",
    title: "Contact and grievance",
    paragraphs: [
      `For questions, requests or complaints about your data, contact Kuldeep Behera, project lead, at ${CONTACT_EMAIL}. We will acknowledge your message and try to resolve it promptly.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This page explains in simple words what information ShopNGo collects when you use the website, how it is used, and what choices you have."
      sections={sections}
      other={{ href: "/terms", label: "Terms and Conditions" }}
    />
  );
}
