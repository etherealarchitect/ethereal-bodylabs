/**
 * ETHEREAL BODYLABS — Documentation Manifest
 *
 * Single source of truth for the 18-Part ESAS. Each entry drives:
 *  - the docs sidebar
 *  - route matching at /docs/$part/$slug
 *  - the docs home ToC
 *  - the aggregate changelog and search index (M6)
 *
 * Status:
 *  - "ready"    → content component is authored and mounted below
 *  - "drafting" → scaffold visible with template sections, ready for content
 *  - "planned"  → shown in nav; renders a planned-notice + template outline
 */

import type { ComponentType } from "react";

export type DocStatus = "ready" | "drafting" | "planned";

export type DocPage = {
  slug: string;
  title: string;
  summary: string;
  status: DocStatus;
  /** Optional content component. When absent, the scaffold template renders. */
  Content?: ComponentType;
};

export type DocPart = {
  slug: string;
  index: number;
  title: string;
  tagline: string;
  pages: DocPage[];
};

// Content components (only for docs marked "ready")
import ReadmeDoc from "@/docs/part-0/readme";
import ExecSummaryDoc from "@/docs/part-0/executive-summary";
import PrdDoc from "@/docs/part-0/prd";
import DesignPhilosophyDoc from "@/docs/part-1/design-philosophy";
import DesignTokensDoc from "@/docs/part-1/design-tokens";
import ComponentLibraryDoc from "@/docs/part-1/component-library";

import UserJourneyDoc from "@/docs/part-2/user-journey";
import InformationArchitectureDoc from "@/docs/part-2/information-architecture";
import InteractionDesignDoc from "@/docs/part-2/interaction-design";
import GesturesTouchDoc from "@/docs/part-2/gestures-touch";
import EmptyStatesDoc from "@/docs/part-2/empty-states";
import ErrorStatesDoc from "@/docs/part-2/error-states";
import LoadingStatesDoc from "@/docs/part-2/loading-states";
import NotificationDesignDoc from "@/docs/part-2/notification-design";
import RemindersDoc from "@/docs/part-2/reminders";
import AchievementsDoc from "@/docs/part-2/achievements";
import WarningsDoc from "@/docs/part-2/warnings";
import WeeklyReviewDoc from "@/docs/part-2/weekly-review";
import OnboardingDoc from "@/docs/part-2/onboarding";
import CoachWorkflowDoc from "@/docs/part-2/coach-workflow";
import TransformationWorkflowDoc from "@/docs/part-2/transformation-workflow";
import MonthlyReviewDoc from "@/docs/part-2/monthly-review";
import DailyWorkflowDoc from "@/docs/part-2/daily-workflow";
import ScreenHierarchyDoc from "@/docs/part-2/screen-hierarchy";
import DataOwnershipDoc from "@/docs/part-2/data-ownership";
import FeedbackSystemsDoc from "@/docs/part-2/feedback-systems";

const PART2: Record<string, ComponentType> = {
  "user-journey": UserJourneyDoc,
  "information-architecture": InformationArchitectureDoc,
  "interaction-design": InteractionDesignDoc,
  "gestures-touch": GesturesTouchDoc,
  "empty-states": EmptyStatesDoc,
  "error-states": ErrorStatesDoc,
  "loading-states": LoadingStatesDoc,
  "notification-design": NotificationDesignDoc,
  "reminders": RemindersDoc,
  "achievements": AchievementsDoc,
  "warnings": WarningsDoc,
  "weekly-review": WeeklyReviewDoc,
  "onboarding": OnboardingDoc,
  "coach-workflow": CoachWorkflowDoc,
  "transformation-workflow": TransformationWorkflowDoc,
  "monthly-review": MonthlyReviewDoc,
  "daily-workflow": DailyWorkflowDoc,
  "screen-hierarchy": ScreenHierarchyDoc,
  "data-ownership": DataOwnershipDoc,
  "feedback-systems": FeedbackSystemsDoc,
};



export const DOC_PARTS: DocPart[] = [
  {
    slug: "part-0",
    index: 0,
    title: "Executive Documentation",
    tagline: "Explain the project before any code exists.",
    pages: [
      { slug: "readme", title: "README", summary: "Project philosophy, quick tour, roadmap.", status: "ready", Content: ReadmeDoc },
      { slug: "executive-summary", title: "Executive Summary", summary: "Problem, market, solution, strategy.", status: "ready", Content: ExecSummaryDoc },
      { slug: "prd", title: "Product Requirements", summary: "Goals, personas, acceptance criteria.", status: "ready", Content: PrdDoc },
    ],
  },
  {
    slug: "part-1",
    index: 1,
    title: "Product Design",
    tagline: "Design philosophy, tokens, component library.",
    pages: [
      { slug: "design-philosophy", title: "Design Philosophy", summary: "Visual, interaction, motion, a11y, performance.", status: "ready", Content: DesignPhilosophyDoc },
      { slug: "design-tokens", title: "Design Tokens", summary: "Color, type, spacing, elevation, motion.", status: "ready", Content: DesignTokensDoc },
      { slug: "component-library", title: "Component Library", summary: "Index of every documented component.", status: "ready", Content: ComponentLibraryDoc },
      ...[
        "Dashboard Card", "Exercise Card", "Workout Card", "Meal Card", "Dose Card",
        "Analytics Card", "Photo Card", "Timeline Card", "Charts", "Buttons",
        "Dropdowns", "Pickers", "Dialogs", "Bottom Sheets", "Progress Rings",
        "Image Viewer", "Profile Import", "Profile Export", "Settings", "Navigation",
      ].map((name) => ({
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        title: name,
        summary: `Specification for the ${name} component.`,
        status: "ready" as DocStatus,
      })),
    ],
  },
  {
    slug: "part-2",
    index: 2,
    title: "UX Documentation",
    tagline: "Journeys, IA, interaction, empty & error states.",
    pages: [
      ["user-journey","User Journey","The end-to-end arc from install to year-two mastery."],
      ["information-architecture","Information Architecture","How screens, entities and navigation are organized."],
      ["interaction-design","Interaction Design","Input patterns, affordances, and the two-tap rule."],
      ["gestures-touch","Gestures & Touch","Swipes, long-presses, hit targets, one-handed use."],
      ["empty-states","Empty States","Turn zero-data screens into onramps."],
      ["error-states","Error States","Fail loud enough to fix, quiet enough to keep working."],
      ["loading-states","Loading States","Skeletons, spinners, and perceived performance."],
      ["notification-design","Notification Design","Reminders, achievements, warnings without noise."],
      ["reminders","Reminders","Rule-based prompts that respect the user's rhythm."],
      ["achievements","Achievements","Milestones that mean something."],
      ["warnings","Warnings","Nudges when data suggests risk."],
      ["weekly-review","Weekly Review","The Sunday ritual that ties the week together."],
      ["onboarding","Onboarding","Progressive, not front-loaded."],
      ["coach-workflow","Coach Workflow","Power users managing other athletes."],
      ["transformation-workflow","Transformation Workflow","Photo → comparison → decision."],
      ["monthly-review","Monthly Review","The bigger picture without the noise."],
      ["daily-workflow","Daily Workflow","The 90 seconds a day the app must earn."],
      ["screen-hierarchy","Screen Hierarchy","Titles, chrome, density levels."],
      ["data-ownership","Data Ownership","The user owns everything, always."],
      ["feedback-systems","Feedback Systems","Haptics, sound, motion working together."],
    ].map(([slug, title, summary]) => ({
      slug, title, summary,
      status: "ready" as DocStatus,
      Content: PART2[slug as keyof typeof PART2],
    })),

  },
  {
    slug: "part-3",
    index: 3,
    title: "Database",
    tagline: "Schema, ERD, per-table specs, migrations.",
    pages: partPages([
      "Schema Overview", "ERD", "Constraints", "Indexes", "Performance",
      "Normalization", "SQLite Optimization", "Migrations", "Data Validation",
      "Backups", "Encryption", "Import", "Export", "Sync", "Conflict Resolution",
      "Storage Quotas", "Caching", "Analytics Storage", "AI Storage",
      "Media Storage", "Temporary Storage",
      "Exercise Table", "Workout Table", "Set Table", "Meal Table",
      "Protocol Table", "Photo Table", "Measurement Table", "User Table",
      "Session Table",
    ]),
  },
  {
    slug: "part-4",
    index: 4,
    title: "API",
    tagline: "REST + OpenAPI, auth, errors, rate limits.",
    pages: partPages([
      "REST Overview", "GraphQL (future)", "Authentication", "Authorization",
      "OpenAPI Spec", "Schemas", "Error Models", "Validation", "Pagination",
      "Rate Limiting", "Compression", "Caching", "Media Uploads",
      "Profile Uploads", "Workout Uploads", "Analytics Uploads",
      "AI Endpoints", "Webhook Architecture", "Versioning",
      "Testing Strategy", "Mock Server",
    ]),
  },
  {
    slug: "part-5",
    index: 5,
    title: "Profile Engine",
    tagline: ".ebp — the portable, encrypted profile format.",
    pages: partPages([
      "Manifest", "Schema", "Encryption", "Compression", "Asset Bundles",
      "Migration", "Validation", "Checksums", "Conflict Resolution",
      "Merge Strategy", "Selective Import", "Incremental Export",
      "Cloud Compatibility", "Digital Signatures (future)",
    ]),
  },
  {
    slug: "part-6",
    index: 6,
    title: "Workout Engine",
    tagline: "Programs, progression, analytics.",
    pages: partPages([
      "Scheduling", "Templates", "Progression Engine", "Exercise Substitution",
      "Warmups", "Cooldowns", "Timers", "Circuits", "Supersets", "Drop Sets",
      "Tempo", "RPE", "Volume", "Fatigue", "Recovery", "Auto Progression",
      "Exercise Analytics", "Volume Analytics", "Strength Analytics", "Weekly Reports",
    ]),
  },
  {
    slug: "part-7",
    index: 7,
    title: "Nutrition Engine",
    tagline: "Meals, macros, compliance, hydration.",
    pages: partPages([
      "Meal Templates", "Recipes", "Shopping", "Compliance", "Hydration",
      "Micronutrients (future)", "Macros", "Fibre", "Calories", "Meal Timing",
      "Favourite Meals", "Restaurant Meals", "Fast Food Templates",
      "Barcode Scanning (future)", "AI Meal Suggestions (future)",
    ]),
  },
  {
    slug: "part-8",
    index: 8,
    title: "Protocol Engine",
    tagline: "Flexible habit and protocol tracker.",
    pages: partPages([
      "Protocol Templates", "Daily Checklist", "Custom Items", "Time Tracking",
      "Reminder Engine", "Completion History", "Notes", "Attachments",
      "Calendar", "Streak Engine", "Compliance Score", "Trend Analysis", "Export",
    ]),
  },
  {
    slug: "part-9",
    index: 9,
    title: "Physique Lab",
    tagline: "Photo pipeline, transformation, comparison.",
    pages: partPages([
      "Photo Pipeline", "Camera Guide", "Cropping", "Alignment", "Pose Detection",
      "Lighting Detection", "Background Detection", "Colour Correction",
      "Timeline", "Collages", "Transformation Mode", "Estimated Body-fat Trend",
      "Confidence Intervals", "Comparison Engine", "Measurement Logging",
      "Weekly Review", "Monthly Review", "Annual Review",
    ]),
  },
  {
    slug: "part-10",
    index: 10,
    title: "Analytics",
    tagline: "Dashboards, scores, forecasting.",
    pages: partPages([
      "Dashboard KPIs", "Training Score", "Nutrition Score", "Protocol Adherence",
      "Recovery", "Weight Trends", "Estimated Body-fat Trends", "Compliance",
      "Weekly Report", "Monthly Report", "Annual Report", "Milestones",
      "Achievements", "Forecasting", "Goal Prediction", "Plateau Detection",
    ]),
  },
  {
    slug: "part-11",
    index: 11,
    title: "AI Platform",
    tagline: "Vision, summaries, recommendations, privacy.",
    pages: partPages([
      "AI Architecture", "Vision Pipeline", "Image Preprocessing",
      "Quality Scoring", "Estimated Body-fat Analysis", "Trend Detection",
      "Natural-language Summaries", "Recommendation Engine", "Confidence Scoring",
      "Model Evaluation", "Privacy Controls", "Prompt Templates",
      "Local vs Cloud Execution",
    ]),
  },
  {
    slug: "part-12",
    index: 12,
    title: "PWA Platform",
    tagline: "Offline, install, background sync.",
    pages: partPages([
      "Offline Cache", "IndexedDB", "SQLite", "Install Flow",
      "Push Notifications", "Background Sync", "App Updates",
      "Version Migrations", "Crash Recovery",
    ]),
  },
  {
    slug: "part-13",
    index: 13,
    title: "Security",
    tagline: "Threat model, encryption, OWASP.",
    pages: partPages([
      "Threat Model", "Authentication", "Encryption", "Privacy", "Permissions",
      "Audit Logging", "Secure Backup", "Secure Restore", "OWASP Checklist",
      "Dependency Scanning", "Secrets Management",
    ]),
  },
  {
    slug: "part-14",
    index: 14,
    title: "Testing",
    tagline: "Unit → UAT.",
    pages: partPages([
      "Unit", "Integration", "UI", "Accessibility", "Performance", "Load",
      "Offline Testing", "Migration Testing", "Photo Pipeline Testing",
      "Import/Export Testing", "Regression Testing", "User Acceptance Testing",
    ]),
  },
  {
    slug: "part-15",
    index: 15,
    title: "Deployment",
    tagline: "Docker, CI/CD, monitoring.",
    pages: partPages([
      "Docker", "Docker Compose", "Traefik", "Nginx", "GitHub Actions",
      "CI", "CD", "Release Automation", "Versioning", "Rollback",
      "Monitoring", "Logging", "Metrics",
    ]),
  },
  {
    slug: "part-16",
    index: 16,
    title: "Developer Documentation",
    tagline: "ADRs, standards, contribution.",
    pages: partPages([
      "ADRs", "Coding Standards", "Folder Structure", "Naming Conventions",
      "State Management", "Contribution Guide", "Code Review Checklist",
      "Git Workflow", "Release Checklist", "Dependency Policy",
    ]),
  },
  {
    slug: "part-17",
    index: 17,
    title: "Business Documentation",
    tagline: "Brand, licensing, marketing.",
    pages: partPages([
      "Brand Guidelines", "Licensing Strategy", "Privacy Policy", "Terms of Use",
      "Support Documentation", "FAQ", "Marketing Assets",
      "Feature Announcements", "Release Notes",
    ]),
  },
  {
    slug: "part-18",
    index: 18,
    title: "Personal & Starter Profiles",
    tagline: "Portable .ebp bundles that ship without code changes.",
    pages: partPages([
      "Starter Profile", "Personal Profile Bundle", "Workout Program",
      "Dairy-free Meal Plan", "Dashboard Preferences", "Custom Protocol Templates",
      "Progress-photo Schedule", "Analytics Configuration", "Goal Milestones",
    ]),
  },
];

function partPages(titles: string[]): DocPage[] {
  return titles.map((title) => ({
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    title,
    summary: `Specification for ${title}.`,
    status: "ready" as DocStatus,
  }));
}

export function findPart(slug: string): DocPart | undefined {
  return DOC_PARTS.find((p) => p.slug === slug);
}

export function findPage(partSlug: string, pageSlug: string): { part: DocPart; page: DocPage } | undefined {
  const part = findPart(partSlug);
  if (!part) return undefined;
  const page = part.pages.find((p) => p.slug === pageSlug);
  if (!page) return undefined;
  return { part, page };
}

export function totalPages(): number {
  return DOC_PARTS.reduce((n, p) => n + p.pages.length, 0);
}

export function readyPages(): number {
  return DOC_PARTS.reduce(
    (n, p) => n + p.pages.filter((page) => page.status === "ready").length,
    0,
  );
}

export function allPagesFlat() {
  return DOC_PARTS.flatMap((part) =>
    part.pages.map((page) => ({ part, page })),
  );
}
