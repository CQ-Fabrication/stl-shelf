import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import {
  guideList,
  guidePages,
  type GuidePageData,
} from "../src/components/marketing/guides/guides-data";
import { marketingFaqs } from "../src/components/marketing/sections/faq.data";

const SITE_URL = "https://stl-shelf.com";
const OUTPUT_DIRECTORY = path.resolve(import.meta.dir, "..", "public");

type SitePath = `/${string}` | "/";

type MarkdownPage = {
  path: SitePath;
  title: string;
  summary: string[];
  sections: string[];
};

const REQUIRED_PATHS: readonly SitePath[] = [
  "/",
  "/faqs",
  "/guides",
  "/organize-stl-files",
  "/stl-file-organizer",
  "/stop-stl-folder-chaos",
  "/private-3d-model-library",
  "/3d-model-preview-in-browser",
  "/version-control-for-stl-files",
  "/tagging-system-for-3d-models",
  "/self-hosted-3d-model-library",
  "/organize-3mf-files",
  "/organize-obj-files",
  "/pricing",
  "/about",
];

const pageLabels: Record<SitePath, string> = {
  "/": "Homepage",
  "/faqs": "FAQs",
  "/guides": "Guides hub",
  "/organize-stl-files": "Organize STL files",
  "/stl-file-organizer": "STL file organizer",
  "/stop-stl-folder-chaos": "Stop STL folder chaos",
  "/private-3d-model-library": "Private 3D model library",
  "/3d-model-preview-in-browser": "3D model preview in browser",
  "/version-control-for-stl-files": "Version control for STL files",
  "/tagging-system-for-3d-models": "Tagging system for 3D models",
  "/self-hosted-3d-model-library": "Self-hosted 3D model library",
  "/organize-3mf-files": "Organize 3MF files",
  "/organize-obj-files": "Organize OBJ files",
  "/pricing": "Pricing",
  "/about": "About",
};

const linkLabels: Record<SitePath, string> = {
  "/": "Home",
  "/faqs": "FAQs",
  "/guides": "Guides hub",
  "/organize-stl-files": "Organize STL files",
  "/stl-file-organizer": "STL file organizer",
  "/stop-stl-folder-chaos": "Stop STL folder chaos",
  "/private-3d-model-library": "Private 3D model library",
  "/3d-model-preview-in-browser": "3D model preview in browser",
  "/version-control-for-stl-files": "Version control for STL files",
  "/tagging-system-for-3d-models": "Tagging system for 3D models",
  "/self-hosted-3d-model-library": "Self-hosted 3D model library",
  "/organize-3mf-files": "Organize 3MF files",
  "/organize-obj-files": "Organize OBJ files",
  "/pricing": "Pricing",
  "/about": "About",
};

const guideRelatedPaths: Record<GuidePageData["path"], SitePath[]> = {
  "/organize-stl-files": [
    "/stl-file-organizer",
    "/stop-stl-folder-chaos",
    "/tagging-system-for-3d-models",
  ],
  "/stl-file-organizer": [
    "/organize-stl-files",
    "/tagging-system-for-3d-models",
    "/version-control-for-stl-files",
  ],
  "/organize-3mf-files": [
    "/organize-stl-files",
    "/organize-obj-files",
    "/self-hosted-3d-model-library",
  ],
  "/organize-obj-files": [
    "/organize-stl-files",
    "/organize-3mf-files",
    "/self-hosted-3d-model-library",
  ],
  "/version-control-for-stl-files": [
    "/organize-stl-files",
    "/3d-model-preview-in-browser",
    "/tagging-system-for-3d-models",
  ],
  "/tagging-system-for-3d-models": [
    "/organize-stl-files",
    "/stl-file-organizer",
    "/version-control-for-stl-files",
  ],
  "/private-3d-model-library": ["/self-hosted-3d-model-library", "/organize-stl-files", "/pricing"],
  "/3d-model-preview-in-browser": [
    "/version-control-for-stl-files",
    "/organize-stl-files",
    "/tagging-system-for-3d-models",
  ],
  "/stop-stl-folder-chaos": [
    "/organize-stl-files",
    "/stl-file-organizer",
    "/tagging-system-for-3d-models",
  ],
};

function canonicalUrl(pathname: SitePath): string {
  return pathname === "/" ? `${SITE_URL}/` : `${SITE_URL}${pathname}`;
}

function markdownPath(pathname: SitePath): string {
  return pathname === "/" ? "/index.html.md" : `${pathname}.md`;
}

function markdownUrl(pathname: SitePath): string {
  return `${SITE_URL}${markdownPath(pathname)}`;
}

function markdownFilesystemPath(pathname: SitePath): string {
  const relativePath = pathname === "/" ? "index.html.md" : `${pathname.slice(1)}.md`;
  return path.join(OUTPUT_DIRECTORY, relativePath);
}

function link(pathname: SitePath): string {
  return `[${linkLabels[pathname]}](${markdownUrl(pathname)})`;
}

function renderFaqItems(items: readonly { question: string; answer: string }[]): string[] {
  return items.flatMap((faq) => [`### ${faq.question}`, faq.answer]);
}

function renderRelatedLinks(paths: readonly SitePath[]): string {
  return ["## Related links", ...paths.map((pathname) => `- ${link(pathname)}`)].join("\n");
}

function renderGuidePage(guide: GuidePageData): MarkdownPage {
  const related = Array.from(
    new Set<SitePath>(["/guides", "/pricing", ...(guideRelatedPaths[guide.path] ?? [])]),
  ).filter((pathname) => pathname !== guide.path);

  return {
    path: guide.path,
    title: guide.h1,
    summary: [guide.description, guide.intro],
    sections: [
      "## The problem",
      ...guide.problem.map((paragraph) => `- ${paragraph}`),
      "",
      "## Simple workflow",
      ...guide.steps.map((step, index) => `${index + 1}. **${step.title}**: ${step.description}`),
      "",
      "## What STL Shelf is / is not",
      "### STL Shelf is",
      ...guide.isItems.map((item) => `- ${item}`),
      "",
      "### STL Shelf is not",
      ...guide.isNotItems.map((item) => `- ${item}`),
      "",
      "## FAQ",
      ...renderFaqItems(guide.faqs),
      "",
      renderRelatedLinks(related),
    ],
  };
}

function buildHomePage(): MarkdownPage {
  return {
    path: "/",
    title: "STL Shelf - STL File Organizer & 3D Model Library",
    summary: [
      "STL file organizer and 3D model library for makers.",
      "Organize, tag, preview, and version STL, 3MF, OBJ, and PLY files in the cloud or on your own infrastructure.",
      "Manage your personal collection of 3D printable models with version control, preview, and smart organization.",
    ],
    sections: [
      "## Core promise",
      "- Organize your 3D printing library in one place.",
      "- Manage personal collections with version control, 3D preview, and structured organization.",
      "- Use the hosted app or deploy STL Shelf on your own infrastructure.",
      "",
      "## Supported file types",
      "- STL",
      "- OBJ",
      "- 3MF",
      "- PLY",
      "",
      "## Core workflow",
      "1. **Upload**: Drag and drop your 3D models with STL, OBJ, 3MF, and PLY support.",
      "2. **Organize**: Tag, categorize, and version models for fast retrieval.",
      "3. **Preview & Share**: Preview models in 3D, then download files or share inside your workflow.",
      "",
      "## Key capabilities",
      "- **Organized Library**: Keep all STL, OBJ, 3MF, and PLY files in one searchable library.",
      "- **Version Control**: Track design iterations with built-in history.",
      "- **3D Preview**: Inspect models interactively without external software.",
      "- **Smart Tags**: Organize with tags, categories, and custom metadata.",
      "- **Batch Download**: Download individual files or ZIP collections.",
      "- **Self-Hosted**: Run STL Shelf with PostgreSQL and S3-compatible storage on your own infrastructure.",
      "",
      "## Who it's for",
      "- **Hobbyist Makers**: Personal libraries for growing collections.",
      "- **Design Iterators**: Version tracking across frequent model updates.",
      "- **Small Print Farms**: Fast retrieval of production files for reprints.",
      "- **Digital Hoarders**: Search and structure for very large archives.",
      "",
      "## FAQ",
      ...marketingFaqs.flatMap((faq) => [
        `### ${faq.question}`,
        `${faq.answer} See ${link("/faqs")}.`,
      ]),
      "",
      renderRelatedLinks([
        "/faqs",
        "/guides",
        "/organize-stl-files",
        "/self-hosted-3d-model-library",
        "/pricing",
        "/about",
      ]),
    ],
  };
}

function buildFaqsPage(): MarkdownPage {
  return {
    path: "/faqs",
    title: "FAQs - STL Shelf",
    summary: [
      "Frequently asked questions about STL Shelf.",
      "Includes product positioning, self-hosting prerequisites, and cloud-plan clarifications.",
      "Use this page as the main FAQ index for STL Shelf.",
    ],
    sections: [
      "## Frequently asked questions",
      ...renderFaqItems(marketingFaqs),
      "",
      renderRelatedLinks(["/", "/guides", "/self-hosted-3d-model-library", "/pricing"]),
    ],
  };
}

function buildGuidesPage(): MarkdownPage {
  return {
    path: "/guides",
    title: "Guides — Organize Your STL Library",
    summary: [
      "Practical STL Shelf guides to organize STL, 3MF, and OBJ files with tags, preview, and version history.",
      "Browse practical guides for organizing STL, 3MF, and OBJ files with a simple private library workflow.",
      "Use this hub as the starting point to choose the right guide page by intent.",
    ],
    sections: [
      "## Guide index",
      ...guideList.map(
        (guide) => `- [${guide.listTitle}](${markdownUrl(guide.path)}): ${guide.description}`,
      ),
      "",
      "## Start organizing today",
      "Build a private model library that stays clean as your collection grows.",
      "",
      renderRelatedLinks([
        "/",
        "/faqs",
        "/organize-stl-files",
        "/self-hosted-3d-model-library",
        "/pricing",
      ]),
    ],
  };
}

function buildSelfHostedPage(): MarkdownPage {
  const prerequisites = [
    "PostgreSQL",
    "S3-compatible storage (MinIO, R2, S3)",
    "Resend",
    "Cloudflare Turnstile",
    "OpenPanel",
    "Polar",
  ];

  const deploymentFlow = [
    "Clone the repository.",
    "Provision the required services.",
    "Set the environment variables.",
    "Run the app.",
  ];

  const serviceResponsibilities = [
    "PostgreSQL -> users, organizations, metadata, tags, version history",
    "S3-compatible storage -> file uploads and downloads",
    "Resend -> email verification, magic links, password reset, invitation emails",
    "Cloudflare Turnstile -> CAPTCHA on signup and auth flows",
    "OpenPanel -> product analytics and event tracking",
    "Polar -> billing, subscriptions, checkout, customer portal",
  ];

  return {
    path: "/self-hosted-3d-model-library",
    title: "Self-Host STL Shelf",
    summary: [
      "Deploy STL Shelf on your own infrastructure with PostgreSQL, S3-compatible storage, Resend, Cloudflare Turnstile, OpenPanel, and Polar.",
      "This page documents the prerequisites for a supported self-hosted deployment.",
      "Use the repository as the source of truth for the full setup.",
    ],
    sections: [
      "## Prerequisites",
      ...prerequisites.map((item) => `- ${item}`),
      "",
      "## Deployment flow",
      ...deploymentFlow.map((item, index) => `${index + 1}. ${item}`),
      "",
      "## What each service does",
      ...serviceResponsibilities.map((item) => `- ${item}`),
      "",
      "## Need the full setup?",
      "Use the repository as the source of truth for the complete setup.",
      "- https://github.com/CQ-Fabrication/stl-shelf",
      "",
      renderRelatedLinks([
        "/faqs",
        "/organize-stl-files",
        "/private-3d-model-library",
        "/pricing",
        "/about",
      ]),
    ],
  };
}

function buildPricingPage(): MarkdownPage {
  return {
    path: "/pricing",
    title: "STL Shelf Pricing",
    summary: [
      "Simple, transparent pricing for STL Shelf.",
      "Start free and upgrade when you need more.",
      "Choose a plan for your 3D model library, from free personal collections to team-ready storage.",
    ],
    sections: [
      "## Overview",
      "- Simple, transparent pricing.",
      "- Start free and upgrade when needed.",
      "- All plans include 3D model preview, organization, and private storage.",
      "",
      "## Plans",
      "- Free, Basic, and Pro plans are available.",
      "- Billing intervals: monthly and yearly.",
      "- Save 10% with annual billing.",
      "- Bandwidth includes a monthly allowance.",
      "",
      "## Billing notes",
      "- Plan details can change; always verify against the canonical HTML pricing page.",
      "",
      "## Source of truth",
      `- For the latest live plan metadata, use the canonical HTML page: ${canonicalUrl("/pricing")}`,
      "",
      renderRelatedLinks([
        "/faqs",
        "/organize-stl-files",
        "/self-hosted-3d-model-library",
        "/private-3d-model-library",
        "/about",
      ]),
    ],
  };
}

function buildAboutPage(): MarkdownPage {
  return {
    path: "/about",
    title: "About STL Shelf",
    summary: [
      "STL Shelf is presented as a 3D model library built by makers, for makers.",
      "The page explains the origin story, product values, and open-source positioning.",
      "It also includes direct contact channels for product and support conversations.",
    ],
    sections: [
      "## Our story",
      "STL Shelf was born from frustration after managing thousands of STL files across hard drives, cloud folders, and USB sticks.",
      "The team frames the product as a response to folder chaos and emphasizes practical organization for both hobbyists and print farms.",
      "The positioning includes cloud convenience, self-hosted ownership, and no vendor lock-in.",
      "",
      "## What we believe",
      "- **Privacy First**: your data belongs to you; self-hosting is supported for full control.",
      "- **Built for Speed**: fast preview and search across large model collections.",
      "- **Made for Makers**: focused on real-world 3D printing library pain.",
      "",
      "## Open source",
      "STL Shelf is open source and can be self-hosted or contributed to on GitHub.",
      "- Repository: https://github.com/CQ-Fabrication/stl-shelf",
      "",
      "## Contact",
      "- hello@stl-shelf.com",
      "- support@stl-shelf.com",
      "",
      renderRelatedLinks(["/", "/faqs", "/guides", "/pricing", "/self-hosted-3d-model-library"]),
    ],
  };
}

function renderMarkdown(page: MarkdownPage): string {
  return [
    `# ${page.title}`,
    "",
    `Canonical: ${canonicalUrl(page.path)}`,
    "",
    ...page.summary,
    "",
    ...page.sections,
    "",
  ].join("\n");
}

function buildPages(): MarkdownPage[] {
  const guidePagesToRender = [
    guidePages.organizeStlFiles,
    guidePages.stlFileOrganizer,
    guidePages.stopStlFolderChaos,
    guidePages.private3dModelLibrary,
    guidePages.modelPreviewInBrowser,
    guidePages.versionControlForStlFiles,
    guidePages.taggingSystemFor3dModels,
    guidePages.organize3mfFiles,
    guidePages.organizeObjFiles,
  ].map((guide) => renderGuidePage(guide));

  return [
    buildHomePage(),
    buildFaqsPage(),
    buildGuidesPage(),
    ...guidePagesToRender,
    buildSelfHostedPage(),
    buildPricingPage(),
    buildAboutPage(),
  ];
}

async function writePages(pages: MarkdownPage[]) {
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  for (const page of pages) {
    const outputPath = markdownFilesystemPath(page.path);
    await writeFile(outputPath, renderMarkdown(page), "utf8");
  }
}

function validateCoverage(pages: MarkdownPage[]) {
  const pagePathSet = new Set(pages.map((page) => page.path));
  const missingPaths = REQUIRED_PATHS.filter((pathname) => !pagePathSet.has(pathname));

  if (missingPaths.length > 0) {
    throw new Error(`Missing required markdown pages: ${missingPaths.join(", ")}`);
  }
}

function printChecklist() {
  console.log("Markdown checklist:");
  for (const pathname of REQUIRED_PATHS) {
    const filePath = markdownPath(pathname);
    const label = pageLabels[pathname];
    console.log(`- [x] ${label}: ${filePath}`);
  }
}

async function main() {
  const pages = buildPages();
  validateCoverage(pages);
  await writePages(pages);
  printChecklist();
  console.log(`Generated ${String(pages.length)} markdown files in public/.`);
}

main().catch((error: unknown) => {
  console.error("Failed to generate marketing markdown files.");
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
});
