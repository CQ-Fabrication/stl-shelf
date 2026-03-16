import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { guidePages, type GuidePageData } from "../src/components/marketing/guides/guides-data";
import {
  seoPageGroups,
  seoPageList,
  type SeoPageData,
} from "../src/components/marketing/seo/seo-pages-data";
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

const legacyGuidePages = [guidePages.modelPreviewInBrowser, guidePages.organizeObjFiles] as const;

const REQUIRED_PATHS: SitePath[] = [
  "/",
  "/faqs",
  "/guides",
  "/pricing",
  "/about",
  ...seoPageList.map((page) => page.path),
  ...legacyGuidePages.map((page) => page.path),
];

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

function pageLabel(pathname: SitePath): string {
  if (pathname === "/") return "Homepage";
  if (pathname === "/faqs") return "FAQs";
  if (pathname === "/guides") return "Guides";
  if (pathname === "/pricing") return "Pricing";
  if (pathname === "/about") return "About";

  return (
    seoPageList.find((page) => page.path === pathname)?.listTitle ||
    legacyGuidePages.find((page) => page.path === pathname)?.listTitle ||
    pathname
  );
}

function renderFaqItems(items: readonly { question: string; answer: string }[]): string[] {
  return items.flatMap((faq) => [`### ${faq.question}`, faq.answer]);
}

function renderRelatedLinks(paths: readonly SitePath[]): string {
  return [
    "## Related links",
    ...paths.map((pathname) => `- [${pageLabel(pathname)}](${markdownUrl(pathname)})`),
  ].join("\n");
}

function renderGuidePage(guide: GuidePageData): MarkdownPage {
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
      renderRelatedLinks([
        "/guides",
        "/pricing",
        "/organize-stl-files",
        "/private-3d-model-library",
      ]),
    ],
  };
}

function renderSeoPage(page: SeoPageData): MarkdownPage {
  return {
    path: page.path,
    title: page.h1,
    summary: [page.description, ...page.intro],
    sections: [
      "## Category definition",
      ...page.semanticStatements.map((statement) => `- ${statement}`),
      "",
      "## STL Shelf helps you",
      ...page.featureList.map((item) => `- ${item}`),
      "",
      `## ${page.workflowTitle}`,
      ...page.workflow.map((step, index) => `${index + 1}. **${step.title}**: ${step.description}`),
      "",
      ...page.sections.flatMap((section) => {
        const blocks = [`## ${section.title}`];

        if (section.paragraphs) {
          blocks.push(...section.paragraphs);
          blocks.push("");
        }

        if (section.bullets) {
          blocks.push(...section.bullets.map((bullet) => `- ${bullet}`));
          blocks.push("");
        }

        if (section.ordered) {
          blocks.push(...section.ordered.map((item, index) => `${index + 1}. ${item}`));
          blocks.push("");
        }

        return blocks;
      }),
      "## FAQ",
      ...renderFaqItems(page.faqs),
      "",
      renderRelatedLinks(page.internalLinks.map((link) => link.href)),
      "",
      "## Conclusion",
      page.ctaDescription,
      `- Call to action: ${page.ctaTitle}`,
    ],
  };
}

function buildHomePage(): MarkdownPage {
  return {
    path: "/",
    title: "STL Shelf - Private 3D Model Library Software",
    summary: [
      "STL Shelf is software designed to organize, catalog, version, and manage private 3D printing model libraries.",
      "It helps users manage STL, 3MF, OBJ, and PLY files with tags, version history, and browser preview.",
      "Use the hosted version managed by us or self-host the open-source product when control matters more.",
    ],
    sections: [
      "## What is STL Shelf?",
      "STL Shelf is a software designed to organize, catalog, version, and manage private 3D printing model libraries.",
      "STL Shelf is a private 3D model library for makers and print farms.",
      "STL Shelf is an open-source software for managing private 3D printing model libraries.",
      "",
      "## Who it is for",
      "- Makers and hobbyists.",
      "- Design iterators.",
      "- Digital hoarders.",
      "- Small print farms.",
      "",
      "## Problems it solves",
      "- Folder chaos across downloads, drives, and cloud storage.",
      "- Weak search for large STL libraries.",
      "- Missing version history for repeated jobs.",
      "- No quick browser preview before printing.",
      "",
      "## STL Shelf helps you",
      "- organize STL files",
      "- manage large 3D model libraries",
      "- tag and categorize files",
      "- track version history",
      "- preview models in browser",
      "- keep files private",
      "- self-host your archive if desired",
      "- use a hosted version managed by us",
      "",
      renderRelatedLinks([
        "/stl-file-management-software",
        "/how-to-organize-stl-files",
        "/private-3d-model-library-software",
        "/self-hosted-3d-model-library-software",
        "/guides",
        "/faqs",
      ]),
    ],
  };
}

function buildFaqsPage(): MarkdownPage {
  return {
    path: "/faqs",
    title: "STL Shelf FAQs",
    summary: [
      "High-intent FAQ content for STL Shelf covering organization, archive management, product positioning, open source, and self-hosting.",
    ],
    sections: [
      "## Frequently asked questions",
      ...renderFaqItems(marketingFaqs),
      "",
      renderRelatedLinks(["/", "/guides", "/stl-file-management-software", "/pricing"]),
    ],
  };
}

function buildGuidesPage(): MarkdownPage {
  return {
    path: "/guides",
    title: "STL Shelf Guides, Comparisons, and Category Pages",
    summary: [
      "The main content hub for STL Shelf pillar pages, supporting guides, comparison pages, and open-source/self-hosted pages.",
    ],
    sections: [
      ...seoPageGroups.flatMap((group) => [
        `## ${group.title}`,
        ...group.pages.map(
          (page) => `- [${page.listTitle}](${markdownUrl(page.path)}): ${page.description}`,
        ),
        "",
      ]),
      renderRelatedLinks(["/", "/faqs", "/pricing", "/about"]),
    ],
  };
}

function buildPricingPage(): MarkdownPage {
  return {
    path: "/pricing",
    title: "STL Shelf Pricing",
    summary: [
      "Pricing and plans for STL Shelf.",
      "Use the canonical HTML page as the source of truth for the latest plan details.",
    ],
    sections: [
      "## What pricing supports",
      "- Hosted STL Shelf plans.",
      "- Commercial path for the managed version.",
      "- Plan details and limits can change over time.",
      "",
      "## Source of truth",
      `- Canonical HTML page: ${canonicalUrl("/pricing")}`,
      "",
      renderRelatedLinks([
        "/",
        "/private-3d-model-library-software",
        "/self-hosted-3d-model-library",
      ]),
    ],
  };
}

function buildAboutPage(): MarkdownPage {
  return {
    path: "/about",
    title: "About STL Shelf",
    summary: [
      "About STL Shelf, private 3D model library software for organizing, cataloging, versioning, and managing 3D printing files.",
      "Built by makers who needed more than folders and generic cloud storage.",
    ],
    sections: [
      "## Product summary",
      "STL Shelf is a software designed to organize, catalog, version, and manage private 3D printing model libraries.",
      "It is built for makers, hobbyists, design iterators, digital hoarders, and small print farms.",
      "",
      "## Positioning",
      "- Private 3D model library software.",
      "- Open source and self-hostable.",
      "- Hosted version managed by us for the simplest path.",
      "- Not a marketplace, not a social platform, not an import/sync hub.",
      "",
      "## Contact",
      "- hello@stl-shelf.com",
      "- support@stl-shelf.com",
      "",
      renderRelatedLinks(["/", "/guides", "/pricing", "/self-hosted-3d-model-library"]),
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
  return [
    buildHomePage(),
    buildFaqsPage(),
    buildGuidesPage(),
    ...seoPageList.map((page) => renderSeoPage(page)),
    ...legacyGuidePages.map((page) => renderGuidePage(page)),
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
    console.log(`- [x] ${pageLabel(pathname)}: ${markdownPath(pathname)}`);
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
