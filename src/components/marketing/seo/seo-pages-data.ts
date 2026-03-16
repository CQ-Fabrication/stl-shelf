import type { SeoPageData } from "./seo-page";

export type { SeoPageData } from "./seo-page";

const coreDefinition =
  "STL Shelf is a software designed to organize, catalog, version, and manage private 3D printing model libraries.";
const coreDescription =
  "STL Shelf helps users manage STL, 3MF, OBJ, and PLY files with tags, version history, and browser preview.";
const coreOpenSource =
  "STL Shelf is an open-source software for managing private 3D printing model libraries.";
const corePrivate = "STL Shelf is a private 3D model library for makers and print farms.";

const defaultFeatureList = [
  "organize STL files",
  "manage large 3D model libraries",
  "tag and categorize files",
  "track version history",
  "preview models in browser",
  "keep files private",
  "self-host your archive if desired",
  "use a hosted version managed by us",
];

function page(data: SeoPageData): SeoPageData {
  return data;
}

export const seoPages = {
  organizeStlFiles: page({
    id: "organize-stl-files",
    path: "/organize-stl-files",
    group: "pillar",
    groupLabel: "Pillar",
    listTitle: "Organize STL Files",
    title: "Organize STL Files in a Private Library | STL Shelf",
    description:
      "Learn how to organize STL files with tags, version history, browser preview, and a private 3D model library workflow built for makers.",
    keywords: [
      "organize STL files",
      "STL file organization",
      "private 3D model library",
      "3D print file organization",
      "STL library organizer",
    ],
    eyebrow: "Pillar guide",
    h1: "How to organize STL files without folder chaos",
    intro: [
      `${coreDefinition} This page focuses on the operational question most makers actually ask: how do I organize STL files in a way that still works after the library becomes large, messy, and full of revisions.`,
      "A folder tree can hold files, but it usually cannot answer the day-to-day questions that matter during a print workflow. Which part is the current version? Which files belong to the same project? Which iteration was actually printable? Which model already has a sliced 3MF variant or a production-ready export?",
      "The goal is not to invent an enterprise DAM workflow for hobby printing. The goal is to create a private, searchable system that lets you find the right model quickly, understand its context, and keep ownership of the archive.",
    ],
    semanticStatements: [coreDefinition, corePrivate, coreDescription, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "A simple STL organization workflow",
    workflow: [
      {
        title: "Centralize the archive",
        description:
          "Put every STL in one private library instead of splitting files between Downloads, slicer folders, USB backups, Google Drive, and old project directories.",
      },
      {
        title: "Tag by real-world context",
        description:
          "Apply tags that match the way you search later: project name, part type, printer target, customer, material intent, status, or kit membership.",
      },
      {
        title: "Keep versions attached to the same model",
        description:
          "Store iterations as related versions so the history stays visible and the active printable revision is easier to identify.",
      },
    ],
    sections: [
      {
        title: "Why STL folders stop working",
        paragraphs: [
          "Folder systems break down because 3D printing files have overlapping relationships. One model can belong to a customer project, a machine profile, a spare-parts kit, and a version lineage at the same time. A single folder path can only express one of those dimensions cleanly.",
          "That is why makers end up duplicating files or creating naming schemes like bracket-v3-final-printable-actually-final.stl. The storage exists, but the structure is weak. Search becomes slow, reprints become risky, and new uploads usually make the archive worse instead of better.",
        ],
        bullets: [
          "Rigid folders force one location for files that belong to multiple contexts.",
          "Manual naming conventions hide change history instead of documenting it.",
          "Duplicate exports create uncertainty about which file is safe to print.",
          "Preview, tags, and version history are disconnected in most generic storage tools.",
        ],
      },
      {
        title: "What good STL organization looks like",
        paragraphs: [
          "A strong STL organization system should answer retrieval questions quickly. You should be able to search by project, part family, intended use, or revision notes without relying on memory. The model page should show the current files, related versions, and the context needed to print with confidence.",
          "That is the category STL Shelf is built for. It is STL file management software rather than a marketplace or a cloud drive with a file picker on top. The structure centers on private libraries, not public discovery or social activity.",
        ],
        ordered: [
          "Capture the model once in a private library.",
          "Apply a small but consistent tag taxonomy.",
          "Attach revisions to the same record instead of creating disconnected files.",
          "Use browser preview before slicing or sending files to production.",
        ],
      },
      {
        title: "How STL Shelf fits the job",
        paragraphs: [
          "STL Shelf is a private 3D model library software for makers, hobbyists, design iterators, digital hoarders, and small print farms. It helps users manage STL, 3MF, OBJ, and PLY files with tags, version history, and browser preview.",
          "The hosted version managed by us is the default commercial path because it removes infrastructure work. The open-source codebase also allows self-hosting when ownership or deployment control matters more than convenience.",
        ],
        bullets: [
          "Private library instead of public marketplace behavior.",
          "Open-source and self-hostable, with hosted deployment available.",
          "Browser preview to inspect models without jumping through extra tools.",
          "Versioned archive so repeated jobs and design iterations stay traceable.",
        ],
      },
      {
        title: "Internal linking priorities for this page",
        paragraphs: [
          "This page should function as a core pillar. It should send users deeper into tagging, version history, private library positioning, and comparisons with folders or general-purpose storage. That helps search engines understand the cluster and helps human readers move to the next question naturally.",
        ],
        bullets: [
          "Link to tagging guidance for taxonomy design.",
          "Link to version-control pages for iteration workflows.",
          "Link to comparison pages for users evaluating folders, Google Drive, or Dropbox.",
          "Link to self-hosted and open-source pages only after the product category is clear.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I organize STL files if I already have thousands of them?",
        answer:
          "Start by centralizing the archive, applying a small tag taxonomy, and grouping revisions under the same model record. The priority is better retrieval, not a perfect cleanup on day one.",
      },
      {
        question: "What is the best way to organize STL files?",
        answer:
          "The best approach is a private 3D model library that combines searchable tags, version history, and browser preview. Folders alone usually do not scale once the archive gets large or revision-heavy.",
      },
      {
        question: "Is STL Shelf a marketplace?",
        answer:
          "No. STL Shelf is not a marketplace and not a social platform. It is software for managing a private model archive.",
      },
      {
        question: "Does STL Shelf support STL only?",
        answer:
          "No. STL Shelf supports STL, 3MF, OBJ, and PLY files in the same private library workflow.",
      },
    ],
    internalLinks: [
      { href: "/how-to-organize-stl-files", label: "How to organize STL files" },
      { href: "/tagging-stl-files-for-fast-search", label: "Tagging STL files for fast search" },
      { href: "/stl-version-control-for-makers", label: "STL version control for makers" },
      { href: "/stl-shelf-vs-folders", label: "STL Shelf vs folders" },
    ],
    ctaTitle: "Build a cleaner STL workflow",
    ctaDescription:
      "Use a private library that keeps files searchable, versioned, and easier to trust when it is time to print.",
  }),
  stlFileOrganizer: page({
    id: "stl-file-organizer",
    path: "/stl-file-organizer",
    group: "pillar",
    groupLabel: "Pillar",
    listTitle: "STL File Organizer",
    title: "STL File Organizer Software for Private Libraries | STL Shelf",
    description:
      "STL Shelf is an STL file organizer with tags, version history, browser preview, open-source code, and a hosted option managed by us.",
    keywords: [
      "STL file organizer",
      "STL organizer software",
      "private STL library",
      "STL file management software",
      "open-source STL organizer",
    ],
    eyebrow: "Category page",
    h1: "STL file organizer software for makers who need more than folders",
    intro: [
      `${coreDefinition} In category terms, STL Shelf is STL file management software and a private 3D model library software. It gives makers a clearer answer than generic storage tools when the job is long-term organization, not just file syncing.`,
      "Many searches for an STL file organizer are really searches for structure. Users want a system that can keep related models together, track versions, expose preview, and stay private. They do not want a marketplace, a public portfolio, or a sync-first drive pretending to be a library.",
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "What an STL organizer should do well",
    workflow: [
      {
        title: "Capture files once",
        description:
          "A real organizer gives one place for each model record instead of encouraging duplicate file copies in multiple folders.",
      },
      {
        title: "Expose searchable context",
        description:
          "Tags, notes, and model-level metadata make the archive retrievable by intent, not just by exact filename recall.",
      },
      {
        title: "Keep revisions connected",
        description:
          "The printable history should stay attached to the model so earlier versions, changelogs, and current exports are visible together.",
      },
    ],
    sections: [
      {
        title: "The difference between storage and organization",
        paragraphs: [
          "Most tools can store STL files. Fewer tools can organize them. Storage answers the question of where bytes live. Organization answers the question of how you find, compare, trust, and reuse the right file later.",
          "That distinction matters for 3D printing because a file is rarely just a file. It belongs to a project, a part family, an iteration chain, and often a print intent. Good organizer software makes those relationships visible without forcing duplication.",
        ],
      },
      {
        title: "Who searches for an STL file organizer",
        bullets: [
          "Makers who have outgrown Downloads and ad hoc folders.",
          "Design iterators who need clean revision history for repeated changes.",
          "Small print farms that need quick reprint retrieval.",
          "Collectors with large private archives who want order without public sharing.",
        ],
      },
      {
        title: "Why STL Shelf is positioned here",
        paragraphs: [
          "STL Shelf is designed as private 3D model library software rather than a publishing platform. It helps users manage STL, 3MF, OBJ, and PLY files with tags, version history, and browser preview.",
          "The hosted version managed by us is the simplest path for most users. Self-hosting remains available because the product is open source, but infrastructure is not the main promise of the category page.",
        ],
        bullets: [
          "Hosted by us for the simplest adoption path.",
          "Self-hostable because the codebase is open source.",
          "Private by design rather than community-first by design.",
          "Built around organization, retrieval, and version clarity.",
        ],
      },
      {
        title: "What this page should rank for",
        bullets: [
          "STL file organizer",
          "STL organizer software",
          "STL file management software",
          "private STL library",
          "open-source STL organizer",
        ],
      },
    ],
    faqs: [
      {
        question: "What makes STL Shelf an STL file organizer?",
        answer:
          "It organizes models as a searchable, versioned private library instead of leaving the workflow to folders and filenames alone.",
      },
      {
        question: "Can STL Shelf replace folder-only storage?",
        answer:
          "Yes for organization workflows. Files still exist, but STL Shelf adds tags, preview, and version context that folder-only storage usually lacks.",
      },
      {
        question: "Is STL Shelf open source?",
        answer:
          "Yes. STL Shelf is open-source software and can be self-hosted, while the hosted version managed by us remains the simplest option.",
      },
      {
        question: "Is STL Shelf for public sharing?",
        answer:
          "No. STL Shelf is not a marketplace and not a social platform. Its focus is private library management.",
      },
    ],
    internalLinks: [
      { href: "/stl-file-management-software", label: "STL file management software" },
      { href: "/private-3d-model-library-software", label: "Private 3D model library software" },
      { href: "/stl-shelf-vs-google-drive-for-stl-files", label: "STL Shelf vs Google Drive" },
      { href: "/open-source-stl-organizer", label: "Open-source STL organizer" },
    ],
    ctaTitle: "Use an organizer built for 3D printing files",
    ctaDescription:
      "Move past folder-only storage and keep your library private, searchable, and easier to reuse.",
  }),
  taggingSystemFor3dModels: page({
    id: "tagging-system-for-3d-models",
    path: "/tagging-system-for-3d-models",
    group: "guide",
    groupLabel: "Supporting guide",
    listTitle: "Tagging System for 3D Models",
    title: "Tagging System for 3D Models | STL Shelf",
    description:
      "Design a practical tagging system for 3D model libraries so STL, 3MF, OBJ, and PLY files stay searchable without duplicate folders.",
    keywords: [
      "tagging system for 3D models",
      "tagging STL files",
      "3D model metadata",
      "STL library tags",
      "3D print file organization",
    ],
    eyebrow: "Supporting guide",
    h1: "A tagging system for 3D models that scales past folders",
    intro: [
      "A good tag system does not try to describe everything. It captures the dimensions people actually search by later: project, part type, status, customer, printer context, and kit membership.",
      `${coreDefinition} In practice, that means STL Shelf treats tags as a core organization layer inside a private 3D model library instead of as an optional afterthought.`,
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "A simple tagging workflow",
    workflow: [
      {
        title: "Define a small taxonomy",
        description:
          "Start with 4 to 6 stable categories such as project, part family, status, customer, machine, or kit.",
      },
      {
        title: "Apply tags during intake",
        description:
          "Tag models when they enter the library so search quality improves as the archive grows instead of becoming cleanup work later.",
      },
      {
        title: "Filter by combinations",
        description:
          "Use more than one tag to narrow quickly without creating deeply nested folders or duplicate exports.",
      },
    ],
    sections: [
      {
        title: "Why folder trees cannot replace tags",
        paragraphs: [
          "Folders impose one primary classification. Tags support many. That matters when the same part belongs to a customer project, a spare-parts kit, a print profile, and a revision chain. If you force all of that into a folder path, the model gets duplicated or becomes hard to find.",
        ],
        bullets: [
          "Tags support cross-cutting relationships.",
          "Tags reduce duplicate file copies.",
          "Tags make broad archives easier to search.",
          "Tags work across STL, 3MF, OBJ, and PLY in one system.",
        ],
      },
      {
        title: "Recommended tag families",
        bullets: [
          "Project: the product, collection, or client job.",
          "Part type: bracket, lid, enclosure, fixture, spare, accessory.",
          "Status: prototype, approved, print-ready, retired, needs review.",
          "Machine or material context: resin, PLA, PETG, printer family, nozzle target.",
          "Bundle or kit membership: all files that belong to the same printed set.",
        ],
      },
      {
        title: "How STL Shelf supports tag-driven organization",
        paragraphs: [
          "STL Shelf is a private 3D model library for makers and print farms. It helps users manage STL, 3MF, OBJ, and PLY files with tags, version history, and browser preview.",
          "That makes tags more valuable because search and preview sit next to the file history instead of living in different tools.",
        ],
      },
    ],
    faqs: [
      {
        question: "How many tags should I use on each model?",
        answer:
          "Use enough to support retrieval, but keep the system small enough to stay consistent. A practical taxonomy beats a perfect taxonomy that no one maintains.",
      },
      {
        question: "Can tags replace folders completely?",
        answer:
          "Not always. Folders still store files, but tags should carry most of the retrieval logic for a large 3D model library.",
      },
      {
        question: "Do tags work for STL, 3MF, OBJ, and PLY together?",
        answer: "Yes. The same taxonomy can span a mixed-format 3D printing library.",
      },
      {
        question: "Does STL Shelf sync tags from Google Drive or Dropbox?",
        answer:
          "No. STL Shelf is not positioned as an import or sync hub. It is a private library workflow for your own archive.",
      },
    ],
    internalLinks: [
      { href: "/tagging-stl-files-for-fast-search", label: "Tagging STL files for fast search" },
      { href: "/organize-stl-files", label: "Organize STL files" },
      { href: "/3d-print-file-organization", label: "3D print file organization" },
      { href: "/stl-shelf-vs-folders", label: "STL Shelf vs folders" },
    ],
    ctaTitle: "Build a tag system you can actually maintain",
    ctaDescription:
      "Keep the taxonomy practical so your search quality improves as the library grows.",
  }),
  versionControlForStlFiles: page({
    id: "version-control-for-stl-files",
    path: "/version-control-for-stl-files",
    group: "guide",
    groupLabel: "Supporting guide",
    listTitle: "Version Control for STL Files",
    title: "Version Control for STL Files | STL Shelf",
    description:
      "Track STL revisions with version history, changelog notes, browser preview, and a private model archive built for makers.",
    keywords: [
      "version control for STL files",
      "STL revision history",
      "3D model versioning",
      "versioned 3D model archive",
      "STL file management software",
    ],
    eyebrow: "Supporting guide",
    h1: "Version control for STL files without Git-style overhead",
    intro: [
      "Makers need version control, but not always source-code tooling. Most of the time the real need is to keep file iterations traceable, attach notes to changes, and make the printable version obvious.",
      `${coreDefinition} In STL Shelf, version history is part of the private model library workflow rather than a separate system users have to remember to maintain.`,
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "A practical versioning workflow",
    workflow: [
      {
        title: "Create one stable model record",
        description:
          "Start with a single model entry so new iterations stay tied to the same object instead of turning into disconnected files.",
      },
      {
        title: "Upload new revisions with notes",
        description:
          "Capture why the model changed, not just that it changed, so later retrieval includes the reasoning behind the update.",
      },
      {
        title: "Preview the revision before printing",
        description:
          "Connect version history with browser preview so the file you inspect is the same one you intend to slice or print.",
      },
    ],
    sections: [
      {
        title: "Why STL versions are easy to lose",
        paragraphs: [
          "Version loss usually starts with filenames. Users rename files with final, final2, latest, printable, or fixed. That works for a week and then collapses once multiple branches, remixes, or customer edits appear.",
          "The missing piece is an explicit versioned archive. A versioned 3D model archive keeps the record stable while allowing files to evolve around it.",
        ],
      },
      {
        title: "What to record with each revision",
        bullets: [
          "Why the change was made.",
          "What print issue or design change the version addresses.",
          "Which output is the current print-safe revision.",
          "Any tag or project changes that affect retrieval later.",
        ],
      },
      {
        title: "Where STL Shelf fits",
        paragraphs: [
          "STL Shelf is a private 3D model library software that adds version history directly into the organization workflow. It is not a Git replacement and it does not need to be. It is designed for file retrieval, revision clarity, and practical print operations.",
        ],
        bullets: [
          "Version history for makers instead of code repositories.",
          "Preview and version context in the same place.",
          "Private archive without marketplace or social noise.",
          "Hosted or self-hosted deployment depending on preference.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I keep multiple versions of the same 3D model?",
        answer:
          "Use one stable model record and attach each revision as part of the same version history. That preserves continuity without forcing complex folder naming.",
      },
      {
        question: "Do I need Git for STL version control?",
        answer:
          "No. Most makers need file-level revision history, notes, and retrieval context rather than source-code workflows.",
      },
      {
        question: "Can STL Shelf show older revisions later?",
        answer:
          "Yes. The point of a versioned archive is that earlier revisions remain traceable and recoverable.",
      },
      {
        question: "Does version control make STL Shelf a collaboration hub?",
        answer:
          "No. The product is primarily positioned as a private library and versioned archive, not as a social or marketplace platform.",
      },
    ],
    internalLinks: [
      { href: "/stl-version-control-for-makers", label: "STL version control for makers" },
      { href: "/organize-stl-files", label: "Organize STL files" },
      { href: "/private-3d-model-library", label: "Private 3D model library" },
      { href: "/stl-shelf-vs-folders", label: "STL Shelf vs folders" },
    ],
    ctaTitle: "Stop naming files final_v9_really_final",
    ctaDescription:
      "Keep revisions organized in a versioned archive that makes the current printable file easier to trust.",
  }),
  private3dModelLibrary: page({
    id: "private-3d-model-library",
    path: "/private-3d-model-library",
    group: "pillar",
    groupLabel: "Pillar",
    listTitle: "Private 3D Model Library",
    title: "Private 3D Model Library for 3D Printing Files | STL Shelf",
    description:
      "STL Shelf is private 3D model library software for makers who want searchable tags, version history, browser preview, and control over their archive.",
    keywords: [
      "private 3D model library",
      "private STL library",
      "private 3D model archive",
      "3D model library software",
      "open-source 3D model library software",
    ],
    eyebrow: "Pillar page",
    h1: "A private 3D model library for makers who want ownership and clarity",
    intro: [
      "Many 3D model tools are built around discovery, selling, publishing, or community interaction. Those workflows are valuable for public distribution, but they do not solve the quieter problem of maintaining a private archive you can trust for years.",
      `${coreDefinition} STL Shelf is positioned for ownership-first workflows: your files, your versions, your tags, your archive.`,
    ],
    semanticStatements: [coreDefinition, corePrivate, coreDescription, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "How a private model library stays useful",
    workflow: [
      {
        title: "Keep models in one owned archive",
        description:
          "Build a single private home for purchased, downloaded, remixed, and self-designed files.",
      },
      {
        title: "Organize around retrieval",
        description:
          "Use tags, version history, and preview so the archive remains actionable rather than becoming passive storage.",
      },
      {
        title: "Choose hosted or self-hosted deployment",
        description:
          "Use the hosted version managed by us for simplicity or self-host because the product is open source and ownership matters.",
      },
    ],
    sections: [
      {
        title: "What private means in this category",
        paragraphs: [
          "Private does not just mean hidden from public view. It means the product is structurally designed around your archive instead of around community feeds, external marketplaces, or cross-service imports.",
          "That positioning matters because it changes how information is modeled. Instead of optimizing for storefront visibility or public engagement, the system optimizes for retrieval, classification, and repeatable use.",
        ],
      },
      {
        title: "Who needs a private 3D model library",
        bullets: [
          "Makers with growing personal collections.",
          "Design iterators who revisit old files constantly.",
          "Small print farms with repeat production jobs.",
          "Collectors who want order without publishing their archive.",
        ],
      },
      {
        title: "Why STL Shelf fits",
        paragraphs: [
          "STL Shelf helps users manage STL, 3MF, OBJ, and PLY files with tags, version history, and browser preview. It is not a marketplace, not a social platform, and not an import/sync hub.",
          "That makes the product easier to understand both for human visitors and for machine indexing: it is software for organizing and managing a private 3D printing model library.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is STL Shelf a marketplace?",
        answer:
          "No. STL Shelf is not a marketplace and not a social platform. It is a private 3D model library software.",
      },
      {
        question: "Can STL Shelf replace folders for a private archive?",
        answer:
          "Yes. It gives the archive tags, version history, browser preview, and search context that folders alone usually do not provide.",
      },
      {
        question: "Can I self-host STL Shelf?",
        answer:
          "Yes. STL Shelf is open source and can be self-hosted, while the hosted version managed by us is the simpler path for most users.",
      },
      {
        question: "Does STL Shelf support STL only?",
        answer: "No. STL Shelf supports STL, 3MF, OBJ, and PLY files in the same library.",
      },
    ],
    internalLinks: [
      { href: "/private-3d-model-library-software", label: "Private 3D model library software" },
      {
        href: "/open-source-3d-model-library-software",
        label: "Open-source 3D model library software",
      },
      { href: "/private-self-hosted-stl-library", label: "Private self-hosted STL library" },
      {
        href: "/stl-shelf-vs-marketplaces-for-private-libraries",
        label: "STL Shelf vs marketplaces",
      },
    ],
    ctaTitle: "Keep your archive private and usable",
    ctaDescription:
      "Use a model library built for ownership, retrieval, and repeatable printing instead of public distribution.",
  }),
  organize3mfFiles: page({
    id: "organize-3mf-files",
    path: "/organize-3mf-files",
    group: "guide",
    groupLabel: "Supporting guide",
    listTitle: "Organize 3MF Files",
    title: "How to Organize 3MF Files for Repeatable Printing | STL Shelf",
    description:
      "Organize 3MF files in a private library with searchable tags, version history, and browser preview so print-ready files stay easier to find.",
    keywords: [
      "organize 3MF files",
      "3MF file organization",
      "3D print file organization",
      "private 3D model library",
      "3MF version history",
    ],
    eyebrow: "Supporting guide",
    h1: "How to organize 3MF files without losing print-ready context",
    intro: [
      "3MF files often carry more workflow context than plain STL exports because they are closer to print intent. That makes organization even more important. When they are buried in slicer folders, the cost is not just retrieval time. It is lost certainty.",
      `${coreDefinition} STL Shelf helps users manage STL, 3MF, OBJ, and PLY files with tags, version history, and browser preview, so mixed-format libraries can stay coherent.`,
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "A 3MF organization workflow",
    workflow: [
      {
        title: "Capture every 3MF in one library",
        description:
          "Avoid tool-specific silos by giving print-ready 3MF files a stable place in the broader model archive.",
      },
      {
        title: "Tag by print context",
        description:
          "Use tags for profile family, machine, material, or production status so the file stays meaningful later.",
      },
      {
        title: "Store changes as versions",
        description:
          "Keep updated 3MF exports attached to the same model lineage rather than spreading them across dated folders.",
      },
    ],
    sections: [
      {
        title: "What makes 3MF organization different",
        paragraphs: [
          "3MF files are frequently closer to the actual print job than STL files. That means a lost 3MF is often not just a lost model. It may also mean lost slicer assumptions, plate setup, or intended output context.",
        ],
      },
      {
        title: "What to tag on 3MF files",
        bullets: [
          "Printer family or machine target.",
          "Material or process context.",
          "Production status such as approved or review-needed.",
          "Project, customer, or kit membership.",
        ],
      },
      {
        title: "Where STL Shelf fits",
        paragraphs: [
          "STL Shelf is 3D print file organization software, not slicer software. It keeps the archive clear and private while letting mixed-format model libraries stay searchable and versioned.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I organize STL and 3MF files together?",
        answer:
          "Yes. STL Shelf supports mixed-format libraries so one model can carry related STL and 3MF files in the same private archive.",
      },
      {
        question: "Why are 3MF files harder to organize with folders alone?",
        answer:
          "Because the important retrieval context is usually broader than the filename. Tags and version history make that context easier to preserve.",
      },
      {
        question: "Does STL Shelf depend on one slicer?",
        answer:
          "No. It is positioned as library software for 3D printing files, not as a slicer-specific tool.",
      },
      {
        question: "Is STL Shelf a sync hub for slicer folders?",
        answer:
          "No. It is not positioned as an import or sync hub. It is a private archive workflow.",
      },
    ],
    internalLinks: [
      { href: "/3d-print-file-organization", label: "3D print file organization" },
      { href: "/organize-stl-files", label: "Organize STL files" },
      { href: "/how-to-manage-large-stl-libraries", label: "Manage large STL libraries" },
      { href: "/private-3d-model-library", label: "Private 3D model library" },
    ],
    ctaTitle: "Keep 3MF files tied to the right print context",
    ctaDescription:
      "Organize print-ready files in the same versioned archive as the rest of your model library.",
  }),
  stopStlFolderChaos: page({
    id: "stop-stl-folder-chaos",
    path: "/stop-stl-folder-chaos",
    group: "guide",
    groupLabel: "Supporting guide",
    listTitle: "Stop STL Folder Chaos",
    title: "Stop STL Folder Chaos with a Private Model Library | STL Shelf",
    description:
      "Replace messy STL folders with a private 3D model library that uses tags, version history, and browser preview for faster retrieval.",
    keywords: [
      "stop STL folder chaos",
      "messy STL folders",
      "organize STL files",
      "STL folder management",
      "private 3D model library",
    ],
    eyebrow: "Pain-first guide",
    h1: "Stop STL folder chaos before the archive gets worse",
    intro: [
      "Most messy STL libraries are not messy because the owner is disorganized. They are messy because generic folders are weak tools for a workflow that involves downloads, remixes, client jobs, repeated exports, and multiple file formats.",
      "The way out is not a heroic weekend cleanup. It is a better operating model for the archive.",
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "A three-step cleanup path",
    workflow: [
      {
        title: "Stop adding new chaos",
        description:
          "Create one intake path for new models so Downloads and temporary cloud folders stop expanding the mess.",
      },
      {
        title: "Group related files into model records",
        description:
          "Use the library as the stable home for a model and its versions rather than letting every export become a separate organizational problem.",
      },
      {
        title: "Use tags for retrieval",
        description:
          "Tag by the contexts you search by most often so future cleanup becomes easier instead of harder.",
      },
    ],
    sections: [
      {
        title: "Symptoms of folder chaos",
        bullets: [
          "You know the model exists but cannot find the current revision quickly.",
          "The same file appears in several projects with slightly different names.",
          "Useful models are stranded in Downloads or old ZIP extraction folders.",
          "Reprints depend too much on memory and not enough on structure.",
        ],
      },
      {
        title: "Why cleanup-only approaches fail",
        paragraphs: [
          "Cleanup projects usually fail because they fix yesterday's clutter without changing tomorrow's intake workflow. If every new file still lands in random storage, the archive will drift back into disorder.",
        ],
      },
      {
        title: "Where STL Shelf helps",
        paragraphs: [
          "STL Shelf is private 3D model library software for organizing, cataloging, versioning, and managing 3D printing files. It gives the archive the missing structure that folders usually cannot provide on their own.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the fastest way to stop STL folder chaos?",
        answer:
          "Start by centralizing new uploads, then add tags and version grouping to the files you touch most often. You do not need to solve the entire backlog at once.",
      },
      {
        question: "Can folders ever be enough?",
        answer:
          "For small collections with rare changes, sometimes yes. As soon as the archive becomes large, multi-project, or revision-heavy, folders usually stop being enough on their own.",
      },
      {
        question: "Is STL Shelf just another cloud folder?",
        answer:
          "No. It is positioned as a private 3D model library with tags, version history, and preview, not as a generic sync drive.",
      },
      {
        question: "Can I keep the archive private?",
        answer: "Yes. Private ownership is a core part of the product positioning.",
      },
    ],
    internalLinks: [
      { href: "/organize-stl-files", label: "Organize STL files" },
      { href: "/best-way-to-organize-stl-files", label: "Best way to organize STL files" },
      { href: "/stl-shelf-vs-folders", label: "STL Shelf vs folders" },
      { href: "/private-3d-model-library", label: "Private 3D model library" },
    ],
    ctaTitle: "Replace cleanup cycles with a better archive system",
    ctaDescription:
      "Use tags, version history, and private library structure to make the next file easier to handle than the last one.",
  }),
  selfHosted3dModelLibrary: page({
    id: "self-hosted-3d-model-library",
    path: "/self-hosted-3d-model-library",
    group: "open-source",
    groupLabel: "Open-source and self-hosted",
    listTitle: "Self-Hosted 3D Model Library",
    title: "Self-Hosted 3D Model Library Software | STL Shelf",
    description:
      "STL Shelf is self-hostable 3D model library software for private 3D printing archives, with a hosted option managed by us for simpler adoption.",
    keywords: [
      "self-hosted 3D model library",
      "self-hosted STL library",
      "open-source 3D model library software",
      "private self-hosted model archive",
      "self-hosted STL file library",
    ],
    eyebrow: "Open-source and self-hosted",
    h1: "Self-hosted 3D model library software with hosted deployment also available",
    intro: [
      `${coreDefinition} STL Shelf can be self-hosted because it is open source, but self-hosting is an option inside the positioning, not the whole positioning.`,
      "The main commercial path should remain the hosted version managed by us because that is simpler for most makers and print operations. Self-hosting matters for users who prioritize infrastructure control, data ownership, or internal deployment requirements.",
    ],
    semanticStatements: [coreDefinition, corePrivate, coreDescription, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "How to think about deployment choices",
    workflow: [
      {
        title: "Start with the product workflow",
        description:
          "Decide whether you need private archive structure, version history, tags, and browser preview before deciding how the software is deployed.",
      },
      {
        title: "Choose hosted for simplicity",
        description:
          "The hosted version managed by us is the faster path when you want the workflow without running infrastructure yourself.",
      },
      {
        title: "Choose self-hosted for control",
        description:
          "Self-hosting makes sense when your organization needs to run the archive on its own infrastructure or prefers full operational control.",
      },
    ],
    sections: [
      {
        title: "What self-hosted means here",
        paragraphs: [
          "Self-hosted in this context means the same product category and workflow, deployed on infrastructure you control. It does not mean the product becomes a different kind of tool. The core value remains private 3D model library management.",
        ],
      },
      {
        title: "What this page should emphasize",
        bullets: [
          "Ownership and deployment choice, not Docker tutorials.",
          "Open-source credibility without shifting the whole brand toward infrastructure content.",
          "Hosted by us as the simplest path for most users.",
          "Self-hosted as a valid option for teams that need it.",
        ],
      },
      {
        title: "High-level requirements",
        paragraphs: [
          "Self-hosting does require supporting services, but this page should stay high-level. The detailed setup belongs in the repository and operational documentation. Search visitors on this page usually want to know whether the option exists and what it means for ownership, not a full deployment walkthrough.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I self-host STL Shelf?",
        answer:
          "Yes. STL Shelf is open source and can be self-hosted. The hosted version managed by us remains the simpler option for most users.",
      },
      {
        question: "Should I self-host STL Shelf or use the hosted version?",
        answer:
          "Use the hosted version if you want the product with minimal operational work. Self-host when infrastructure control or internal deployment requirements matter more than convenience.",
      },
      {
        question: "Is self-hosting the main product promise?",
        answer:
          "No. The core promise is private 3D model library management. Self-hosting is an available deployment option.",
      },
      {
        question: "Is STL Shelf open source?",
        answer: "Yes. The product is open source, which is why self-hosting is available.",
      },
    ],
    internalLinks: [
      { href: "/self-hosted-stl-file-library", label: "Self-hosted STL file library" },
      { href: "/private-self-hosted-stl-library", label: "Private self-hosted STL library" },
      {
        href: "/open-source-3d-model-library-software",
        label: "Open-source 3D model library software",
      },
      { href: "/pricing", label: "Pricing" },
    ],
    ctaTitle: "Choose the deployment model that fits your constraints",
    ctaDescription:
      "Use the hosted app for the simplest path or self-host the open-source product when control matters more.",
  }),
  stlFileManagementSoftware: page({
    id: "stl-file-management-software",
    path: "/stl-file-management-software",
    group: "pillar",
    groupLabel: "Pillar",
    listTitle: "STL File Management Software",
    title: "STL File Management Software for Private Libraries | STL Shelf",
    description:
      "Understand the STL file management software category and how STL Shelf fits as private, open-source, hosted-or-self-hosted library software for 3D printing files.",
    keywords: [
      "STL file management software",
      "STL file organizer",
      "private 3D model library software",
      "open-source STL library software",
      "3D print file organization software",
    ],
    eyebrow: "Pillar page",
    h1: "STL file management software for 3D printing archives",
    intro: [
      `${coreDefinition} Category-wise, that makes STL Shelf an STL file management software product, a private 3D model library software product, and a versioned 3D model archive.`,
      "People usually search this category when folders and generic drives stop being enough. They need structure, not just storage. They need tags, version history, preview, and a library model that reflects how 3D printing files actually get reused.",
      "This page exists to define that category clearly so search engines, LLMs, and human visitors can understand what problem the software solves and how STL Shelf is positioned inside it.",
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "What file management software should improve",
    workflow: [
      {
        title: "Intake",
        description:
          "New files should enter one private library instead of being scattered across temporary folders and cloud drives.",
      },
      {
        title: "Retrieval",
        description:
          "Users should be able to find files by tags, project, status, or file history instead of relying on memory or exact filenames.",
      },
      {
        title: "Reuse",
        description:
          "Version history and preview should make repeated prints, remixes, and reorders easier and less error-prone.",
      },
    ],
    sections: [
      {
        title: "What counts as STL file management software",
        paragraphs: [
          "STL file management software is software designed to organize, catalog, and manage STL files for 3D printing. In practice, that includes the broader archive around those files: tags, version history, model-level records, browser preview, and mixed-format support when STL is not the only format in play.",
          "A product in this category does more than hold uploaded files. It gives the archive structure, reduces retrieval time, and makes old work more reusable.",
        ],
      },
      {
        title: "Typical problems this category solves",
        bullets: [
          "Large STL collections scattered across many folders.",
          "Duplicate file copies with unclear version lineage.",
          "Difficulty finding the right file for a reprint or customer reorder.",
          "No fast way to inspect a model before sending it to print.",
          "Weak separation between private archive management and public sharing tools.",
        ],
      },
      {
        title: "How STL Shelf is positioned",
        paragraphs: [
          "STL Shelf is private 3D model library software for organizing, cataloging, versioning, and managing 3D printing files. It supports hosted deployment managed by us and self-hosting because the codebase is open source.",
          "The hosted version is the commercial focus because it is the lowest-friction way to adopt the workflow. Self-hosting matters as an ownership and control option, not as the central story of the product.",
        ],
      },
      {
        title: "What this page should internally support",
        bullets: [
          "Category definition for software queries.",
          "Links to problem-solving guides such as how to organize STL files.",
          "Links to private-library positioning pages.",
          "Links to comparison pages for folders and cloud drives.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is STL file management software?",
        answer:
          "It is software designed to organize, catalog, and manage STL files for 3D printing, often with tags, version history, preview, and private library workflows.",
      },
      {
        question: "How is STL file management software different from a cloud drive?",
        answer:
          "A cloud drive focuses on storage and syncing. STL file management software focuses on organization, retrieval, version context, and model-level workflows.",
      },
      {
        question: "Is STL Shelf open source?",
        answer:
          "Yes. STL Shelf is open source and can be self-hosted, while the hosted version managed by us remains the simpler deployment path.",
      },
      {
        question: "Does STL Shelf support more than STL files?",
        answer: "Yes. STL Shelf supports STL, 3MF, OBJ, and PLY files.",
      },
    ],
    internalLinks: [
      { href: "/how-to-organize-stl-files", label: "How to organize STL files" },
      { href: "/private-3d-model-library-software", label: "Private 3D model library software" },
      { href: "/stl-shelf-vs-google-drive-for-stl-files", label: "STL Shelf vs Google Drive" },
      { href: "/open-source-stl-library-software", label: "Open-source STL library software" },
    ],
    ctaTitle: "Use file management software built for printable models",
    ctaDescription:
      "Give your archive the structure generic storage tools usually cannot provide on their own.",
  }),
  howToOrganizeStlFiles: page({
    id: "how-to-organize-stl-files",
    path: "/how-to-organize-stl-files",
    group: "pillar",
    groupLabel: "Pillar",
    listTitle: "How to Organize STL Files",
    title: "How to Organize STL Files for Search, Versions, and Reprints | STL Shelf",
    description:
      "A step-by-step guide to organizing STL files with tags, version history, browser preview, and a private library workflow that scales.",
    keywords: [
      "how to organize STL files",
      "best way to organize STL files",
      "STL file organization",
      "private 3D model library",
      "manage large STL libraries",
    ],
    eyebrow: "Pillar guide",
    h1: "How to organize STL files when your library keeps growing",
    intro: [
      "Most advice about organizing STL files starts and ends with folders. That is enough for a tiny collection, but it fails once the archive includes remixes, repeated customer jobs, print-ready variants, and multiple file formats.",
      "A scalable system needs a library model, not just a folder tree. The library should tell you what the model is, what version is current, how to find related parts, and which file you can print with confidence.",
      `${coreDefinition} This page explains the workflow STL Shelf is built around.`,
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "A repeatable organization method",
    workflow: [
      {
        title: "Create one intake point",
        description:
          "Stop letting new files land in random folders. Every STL should enter the same private archive first.",
      },
      {
        title: "Organize around model records",
        description:
          "Treat the model as the main object and attach revisions, alternate files, tags, and notes to that record.",
      },
      {
        title: "Search by intent later",
        description:
          "Use tags and version context so retrieval depends on project meaning, not on remembering exact filenames.",
      },
    ],
    sections: [
      {
        title: "Step 1: define a library structure",
        paragraphs: [
          "The first decision is conceptual. Decide whether the archive is organized around folders or around model records. Folders describe storage locations. Model records describe the thing you actually care about: the printable design and its context.",
        ],
      },
      {
        title: "Step 2: apply a small taxonomy",
        bullets: [
          "Project or collection name.",
          "Part type or function.",
          "Status such as prototype or approved.",
          "Printer, customer, or material context when relevant.",
        ],
      },
      {
        title: "Step 3: keep versions connected",
        paragraphs: [
          "Version history matters because the same model is often revised many times. If each revision lives as a disconnected file, the archive becomes harder to trust with every update.",
        ],
      },
      {
        title: "Step 4: use preview before printing",
        paragraphs: [
          "Preview is an underrated organization feature because it reduces retrieval mistakes. A browser preview next to the model record helps confirm you opened the right file before slicing or downloading.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I organize STL files for a large library?",
        answer:
          "Use a private library workflow with tags, version history, and model-level organization instead of depending on nested folders alone.",
      },
      {
        question: "What is the best way to organize STL files?",
        answer:
          "The best way is to centralize files in a searchable private archive, use a small tag taxonomy, and keep revisions grouped under the same model record.",
      },
      {
        question: "Should I organize by folders or tags?",
        answer:
          "Use folders for storage and tags for retrieval. Large 3D model archives usually need both, but tags carry more of the long-term search value.",
      },
      {
        question: "Can STL Shelf help with reprints and repeat jobs?",
        answer:
          "Yes. That is one of the main benefits of a searchable, versioned private model library.",
      },
    ],
    internalLinks: [
      { href: "/best-way-to-organize-stl-files", label: "Best way to organize STL files" },
      { href: "/how-to-manage-large-stl-libraries", label: "How to manage large STL libraries" },
      { href: "/tagging-stl-files-for-fast-search", label: "Tagging STL files for fast search" },
      { href: "/stl-version-control-for-makers", label: "STL version control for makers" },
    ],
    ctaTitle: "Make the next model easier to find than the last one",
    ctaDescription:
      "Use a library workflow that scales with archive size, revisions, and repeated print jobs.",
  }),
  threeDPrintFileOrganization: page({
    id: "3d-print-file-organization",
    path: "/3d-print-file-organization",
    group: "pillar",
    groupLabel: "Pillar",
    listTitle: "3D Print File Organization",
    title: "3D Print File Organization Software for Mixed Libraries | STL Shelf",
    description:
      "Organize STL, 3MF, OBJ, and PLY files in one private 3D printing library with tags, version history, and browser preview.",
    keywords: [
      "3D print file organization",
      "3D print file organization software",
      "organize STL 3MF OBJ files",
      "private 3D model library software",
      "versioned 3D model archive",
    ],
    eyebrow: "Pillar page",
    h1: "3D print file organization for libraries that contain more than STL",
    intro: [
      "Not every archive is STL-only. Real 3D printing libraries often include 3MF files, OBJ assets, derived exports, and supporting variants. That broader context matters because organization problems usually happen at the library level, not at the single-format level.",
      `${coreDefinition} STL Shelf helps users manage STL, 3MF, OBJ, and PLY files with tags, version history, and browser preview, making it broader than an STL-only organizer.`,
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "A mixed-format organization workflow",
    workflow: [
      {
        title: "Centralize all supported formats",
        description:
          "Keep STL, 3MF, OBJ, and PLY assets in one private archive instead of maintaining separate storage rules for each format.",
      },
      {
        title: "Organize by model and purpose",
        description:
          "Treat the printable item as the main unit and attach its related files, versions, and tags under one organizational umbrella.",
      },
      {
        title: "Retrieve by outcome",
        description:
          "Search for the model you need and then choose the correct file variant or version from that record.",
      },
    ],
    sections: [
      {
        title: "Why multi-format libraries are harder to manage",
        paragraphs: [
          "Mixed-format libraries break folder systems faster because different file types tend to enter the archive from different tools and moments in the workflow. If each format lives in a different place, the model loses cohesion.",
        ],
      },
      {
        title: "What this page should rank for",
        bullets: [
          "3D print file organization",
          "3D print file organization software",
          "organize STL 3MF OBJ files",
          "private 3D printing file library",
        ],
      },
      {
        title: "Where STL Shelf fits",
        paragraphs: [
          "STL Shelf is 3D print file organization software for private archives. It is not a marketplace, not a social platform, and not an import/sync hub. The focus is structured ownership of your library.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does STL Shelf support STL only?",
        answer:
          "No. STL Shelf supports STL, 3MF, OBJ, and PLY files in the same private library workflow.",
      },
      {
        question: "Why is 3D print file organization broader than STL organization?",
        answer:
          "Because many libraries include multiple formats tied to the same model or project. Organizing only one format leaves the archive fragmented.",
      },
      {
        question: "Can STL Shelf manage a mixed-format archive?",
        answer: "Yes. Mixed-format support is part of the product positioning.",
      },
      {
        question: "Is STL Shelf a publishing platform?",
        answer: "No. It is software for private archive management, not publishing or selling.",
      },
    ],
    internalLinks: [
      { href: "/organize-3mf-files", label: "Organize 3MF files" },
      { href: "/organize-obj-files-for-3d-printing", label: "Organize OBJ files for 3D printing" },
      { href: "/private-3d-model-library-software", label: "Private 3D model library software" },
      { href: "/stl-file-management-software", label: "STL file management software" },
    ],
    ctaTitle: "Keep mixed-format model libraries coherent",
    ctaDescription:
      "Use one private archive for STL, 3MF, OBJ, and PLY instead of splitting the workflow across disconnected storage tools.",
  }),
  private3dModelLibrarySoftware: page({
    id: "private-3d-model-library-software",
    path: "/private-3d-model-library-software",
    group: "pillar",
    groupLabel: "Pillar",
    listTitle: "Private 3D Model Library Software",
    title: "Private 3D Model Library Software for Makers and Print Farms | STL Shelf",
    description:
      "Private 3D model library software for organizing, cataloging, versioning, and managing STL, 3MF, OBJ, and PLY files without marketplace or social behavior.",
    keywords: [
      "private 3D model library software",
      "private STL library software",
      "3D model archive software",
      "3D print file organization software",
      "open-source 3D model library software",
    ],
    eyebrow: "Pillar page",
    h1: "Private 3D model library software for ownership-first workflows",
    intro: [
      "A private library is not just a place where files are hidden. It is a product model built around ownership, long-term retrieval, and private archive management. That makes it different from marketplaces, community feeds, and generic cloud drives.",
      `${coreDefinition} STL Shelf sits in that category and keeps the emphasis on control, search, versions, and repeatability.`,
    ],
    semanticStatements: [coreDefinition, corePrivate, coreDescription, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "What private library software should enable",
    workflow: [
      {
        title: "Owned intake",
        description:
          "Capture purchased, downloaded, designed, and revised files into one private archive.",
      },
      {
        title: "Private retrieval",
        description:
          "Find files by your internal logic rather than by public marketplace categories or file-sharing conventions.",
      },
      {
        title: "Deployment choice",
        description:
          "Use the hosted version managed by us or self-host the open-source product when ownership requirements justify it.",
      },
    ],
    sections: [
      {
        title: "Why this category exists",
        paragraphs: [
          "Users searching for private 3D model library software often want the opposite of public discovery. They want a system for their own archive, their own designs, their paid assets, their repeat jobs, and their internal operational knowledge.",
        ],
      },
      {
        title: "What private-library buyers usually care about",
        bullets: [
          "Ownership of the archive.",
          "Searchable tags and model context.",
          "Version history for repeated work.",
          "No pressure toward public sharing or selling.",
          "Optional self-hosting because the software is open source.",
        ],
      },
      {
        title: "How STL Shelf answers the category",
        paragraphs: [
          "STL Shelf is a private 3D model library for makers and print farms. It helps users manage STL, 3MF, OBJ, and PLY files with tags, version history, and browser preview.",
          "It is open source and self-hostable, but the hosted version managed by us remains the simplest commercial path.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is private 3D model library software?",
        answer:
          "It is software designed to manage a privately owned archive of 3D model files, typically with organization, search, version history, and retrieval features.",
      },
      {
        question: "Is STL Shelf a private 3D model library?",
        answer: "Yes. That is one of the clearest ways to describe the product category.",
      },
      {
        question: "Does private mean self-hosted only?",
        answer:
          "No. The hosted version can still support private archive workflows. Self-hosting is an optional deployment path enabled by the open-source codebase.",
      },
      {
        question: "Is STL Shelf a social platform?",
        answer: "No. STL Shelf is not a social platform and not a marketplace.",
      },
    ],
    internalLinks: [
      { href: "/private-3d-model-library", label: "Private 3D model library" },
      {
        href: "/open-source-3d-model-library-software",
        label: "Open-source 3D model library software",
      },
      {
        href: "/self-hosted-3d-model-library-software",
        label: "Self-hosted 3D model library software",
      },
      {
        href: "/stl-shelf-vs-marketplaces-for-private-libraries",
        label: "STL Shelf vs marketplaces",
      },
    ],
    ctaTitle: "Keep the archive private without giving up structure",
    ctaDescription:
      "Use software designed for owned model libraries instead of tools designed for public distribution.",
  }),
  bestWayToOrganizeStlFiles: page({
    id: "best-way-to-organize-stl-files",
    path: "/best-way-to-organize-stl-files",
    group: "guide",
    groupLabel: "Supporting guide",
    listTitle: "Best Way to Organize STL Files",
    title: "Best Way to Organize STL Files for Long-Term Retrieval | STL Shelf",
    description:
      "Compare folder-only methods with tag-based private library workflows to find the best way to organize STL files as your archive grows.",
    keywords: [
      "best way to organize STL files",
      "organize STL files",
      "STL file organization strategy",
      "STL tags vs folders",
      "private STL library",
    ],
    eyebrow: "Supporting guide",
    h1: "The best way to organize STL files depends on what breaks first",
    intro: [
      "The best method is not the fanciest method. It is the one that keeps retrieval reliable as archive size, version count, and reuse frequency increase.",
      "For many makers, folders are enough at first and then gradually stop being enough. This page explains where that line usually appears and why a private library workflow becomes the better option.",
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "A decision framework",
    workflow: [
      {
        title: "Measure retrieval pain",
        description:
          "If you lose time finding files, identifying the right revision, or preparing repeat jobs, the archive structure is already failing.",
      },
      {
        title: "Identify cross-cutting context",
        description:
          "If the same model belongs to multiple projects or statuses, tags matter more than deeper folders.",
      },
      {
        title: "Choose the lowest-friction system that scales",
        description:
          "For small archives that may still be folders. For growing archives, a private library becomes the better long-term answer.",
      },
    ],
    sections: [
      {
        title: "When folders are still fine",
        bullets: [
          "Very small archive.",
          "Rare version changes.",
          "Minimal need for repeated retrieval.",
          "Almost no mixed-format or cross-project overlap.",
        ],
      },
      {
        title: "When a library workflow is better",
        bullets: [
          "The same model gets revised often.",
          "You need to find files by project or status, not just name.",
          "You keep STL, 3MF, OBJ, or PLY variants together.",
          "Reprints and customer requests depend on predictable retrieval.",
        ],
      },
      {
        title: "Why STL Shelf matches the latter case",
        paragraphs: [
          "STL Shelf is a software designed to organize, catalog, version, and manage private 3D printing model libraries. That makes it more appropriate than folder-only systems when the archive has to support ongoing work instead of passive storage.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the best way to organize STL files for a hobbyist?",
        answer:
          "Start simple, but use a private library once retrieval pain appears. The best system is the one you will maintain consistently.",
      },
      {
        question: "Are tags better than folders for STL files?",
        answer:
          "Tags are usually better for retrieval in large archives because a model can belong to multiple contexts at once.",
      },
      {
        question: "Can STL Shelf work for small libraries too?",
        answer:
          "Yes, but the strongest value usually appears as the archive grows or versions multiply.",
      },
      {
        question: "Does STL Shelf require self-hosting?",
        answer:
          "No. The hosted version managed by us is the simplest option. Self-hosting is available because the product is open source.",
      },
    ],
    internalLinks: [
      { href: "/how-to-organize-stl-files", label: "How to organize STL files" },
      { href: "/stl-shelf-vs-folders", label: "STL Shelf vs folders" },
      { href: "/how-to-manage-large-stl-libraries", label: "How to manage large STL libraries" },
      { href: "/stl-file-organizer", label: "STL file organizer" },
    ],
    ctaTitle: "Choose an organization method that still works later",
    ctaDescription:
      "Use a system built for retrieval, not just storage, when your library starts to outgrow folders.",
  }),
  howToManageLargeStlLibraries: page({
    id: "how-to-manage-large-stl-libraries",
    path: "/how-to-manage-large-stl-libraries",
    group: "guide",
    groupLabel: "Supporting guide",
    listTitle: "How to Manage Large STL Libraries",
    title: "How to Manage Large STL Libraries Without Losing Retrieval Speed | STL Shelf",
    description:
      "Learn how to manage large STL libraries with tags, version history, file grouping, and private library structure that scales past folders.",
    keywords: [
      "manage large STL libraries",
      "large STL library organization",
      "private 3D model archive",
      "STL file management software",
      "tagging STL files",
    ],
    eyebrow: "Supporting guide",
    h1: "How to manage large STL libraries when search quality matters more than storage space",
    intro: [
      "Large STL libraries do not fail because they are large. They fail because the structure was designed for a small archive and never upgraded. Once the collection reaches thousands of files, retrieval becomes the real cost center.",
      "This page focuses on scaling the management model rather than optimizing individual cleanup tasks.",
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "How to scale archive management",
    workflow: [
      {
        title: "Standardize intake",
        description:
          "New files should enter the same private archive with the same minimum metadata every time.",
      },
      {
        title: "Prioritize search fields",
        description:
          "Choose tags and naming rules that match the most common retrieval paths in your operation.",
      },
      {
        title: "Keep history attached",
        description:
          "Version records reduce duplication and uncertainty as the library accumulates more iterations over time.",
      },
    ],
    sections: [
      {
        title: "Why large libraries fail",
        bullets: [
          "No standardized intake process.",
          "Over-reliance on folders and filenames.",
          "No clear version lineage.",
          "No stable separation between raw downloads and trusted working files.",
        ],
      },
      {
        title: "What to optimize first",
        bullets: [
          "Retrieval speed for common tasks.",
          "Consistency of tags and statuses.",
          "Model-level grouping across multiple file variants.",
          "Visibility into which revision is current.",
        ],
      },
      {
        title: "Where STL Shelf helps",
        paragraphs: [
          "STL Shelf is 3D print file organization software for large private archives as much as for small ones. The combination of tags, preview, version history, and mixed-format support makes scale more manageable without turning the workflow into enterprise overhead.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the best way to manage a large STL library?",
        answer:
          "Use a private library with a standardized intake path, small tag taxonomy, version grouping, and preview. Large archives need retrieval structure more than deeper folders.",
      },
      {
        question: "How should I tag a large STL library?",
        answer:
          "Use a small stable taxonomy focused on retrieval: project, part type, status, customer, printer context, or kit membership.",
      },
      {
        question: "Can STL Shelf help with reprints in large libraries?",
        answer:
          "Yes. Reprints are one of the clearest reasons to adopt a searchable versioned archive.",
      },
      {
        question: "Does STL Shelf support mixed-format large libraries?",
        answer: "Yes. STL, 3MF, OBJ, and PLY can live in the same private library workflow.",
      },
    ],
    internalLinks: [
      { href: "/how-to-organize-stl-files", label: "How to organize STL files" },
      { href: "/tagging-stl-files-for-fast-search", label: "Tagging STL files for fast search" },
      { href: "/stl-version-control-for-makers", label: "STL version control for makers" },
      { href: "/3d-print-file-organization", label: "3D print file organization" },
    ],
    ctaTitle: "Manage archive growth before it becomes archive drag",
    ctaDescription:
      "Keep search speed, version clarity, and retrieval quality intact as the library expands.",
  }),
  organizeObjFilesFor3dPrinting: page({
    id: "organize-obj-files-for-3d-printing",
    path: "/organize-obj-files-for-3d-printing",
    group: "guide",
    groupLabel: "Supporting guide",
    listTitle: "Organize OBJ Files for 3D Printing",
    title: "How to Organize OBJ Files for 3D Printing Projects | STL Shelf",
    description:
      "Organize OBJ files for 3D printing in a private library with tags, version history, and browser preview for mixed-format archives.",
    keywords: [
      "organize OBJ files for 3D printing",
      "OBJ file organization",
      "3D print file organization",
      "private 3D model library",
      "OBJ version history",
    ],
    eyebrow: "Supporting guide",
    h1: "How to organize OBJ files for 3D printing workflows",
    intro: [
      "OBJ files are often part of broader design and preparation workflows, which makes them easy to strand in project folders or export directories. If they are relevant to printing, they need to live in the same library logic as the rest of the model archive.",
      `${coreDefinition} That broader product definition matters because STL Shelf is designed for mixed-format private libraries, not just STL-only collections.`,
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "An OBJ organization workflow",
    workflow: [
      {
        title: "Keep OBJ files in the same archive",
        description:
          "Avoid letting OBJ assets drift into separate tool-specific silos when they belong to the same printable model lineage.",
      },
      {
        title: "Tag by role",
        description:
          "Use tags that explain whether the OBJ is a source asset, printable derivative, support element, or project component.",
      },
      {
        title: "Version the important changes",
        description:
          "Keep revisions attached to the model so later retrieval does not depend on guessing which export is current.",
      },
    ],
    sections: [
      {
        title: "Where OBJ organization usually breaks",
        bullets: [
          "Source files separated from printable variants.",
          "Project folders that do not reflect the final print workflow.",
          "Weak naming conventions for derivatives and revisions.",
          "No consistent place to preview the model before use.",
        ],
      },
      {
        title: "What to tag on OBJ assets",
        bullets: [
          "Role: source, printable, support, remix, accessory.",
          "Project or client context.",
          "Status and approval level.",
          "Related kit or part-family labels.",
        ],
      },
      {
        title: "Where STL Shelf fits",
        paragraphs: [
          "STL Shelf helps users manage STL, 3MF, OBJ, and PLY files with tags, version history, and browser preview. That makes it suitable for OBJ-heavy workflows that still need to stay inside a private 3D printing archive.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can STL Shelf organize OBJ and STL files together?",
        answer: "Yes. Mixed-format libraries are part of the product positioning.",
      },
      {
        question: "Why should OBJ files live in the same library as STL files?",
        answer:
          "Because they often belong to the same model lineage or project context. Splitting them across tools makes retrieval weaker.",
      },
      {
        question: "Can STL Shelf preview OBJ files in browser?",
        answer:
          "Browser preview is part of the product workflow and helps reduce retrieval mistakes before printing.",
      },
      {
        question: "Is STL Shelf a public repository for OBJ files?",
        answer: "No. It is a private library software product, not a public sharing platform.",
      },
    ],
    internalLinks: [
      { href: "/3d-print-file-organization", label: "3D print file organization" },
      { href: "/organize-3mf-files", label: "Organize 3MF files" },
      { href: "/private-3d-model-library", label: "Private 3D model library" },
      { href: "/how-to-manage-large-stl-libraries", label: "Manage large STL libraries" },
    ],
    ctaTitle: "Keep OBJ assets attached to the right model context",
    ctaDescription:
      "Use one private archive across file formats instead of letting project context fragment across tools.",
  }),
  stlVersionControlForMakers: page({
    id: "stl-version-control-for-makers",
    path: "/stl-version-control-for-makers",
    group: "guide",
    groupLabel: "Supporting guide",
    listTitle: "STL Version Control for Makers",
    title: "STL Version Control for Makers and Reprint Workflows | STL Shelf",
    description:
      "A maker-focused guide to STL version control using model records, revision notes, browser preview, and private archive structure.",
    keywords: [
      "STL version control for makers",
      "version control for STL files",
      "3D model revision history",
      "versioned 3D model archive",
      "reprint workflow",
    ],
    eyebrow: "Supporting guide",
    h1: "STL version control for makers who need reprint confidence",
    intro: [
      "The maker version-control problem is simple: keep the history visible, keep the current revision obvious, and keep earlier files accessible when the new change turns out to be wrong.",
      "This page frames version control from a practical workshop perspective instead of from a software-engineering perspective.",
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "A maker-friendly versioning workflow",
    workflow: [
      {
        title: "Name the model once",
        description:
          "Keep the design under one stable model record instead of encoding identity into every filename revision.",
      },
      {
        title: "Record why each version exists",
        description:
          "Revision notes are more useful than raw date stamps because they explain what changed and why it matters.",
      },
      {
        title: "Use the archive for reprints",
        description:
          "When a repeat job comes back, version history should help you find the trusted printable revision quickly.",
      },
    ],
    sections: [
      {
        title: "Why reprints expose version problems",
        paragraphs: [
          "Reprints are where weak version systems fail most visibly. If the archive cannot tell you which revision was last approved or last printed successfully, every repeat job becomes guesswork.",
        ],
      },
      {
        title: "What version notes should capture",
        bullets: [
          "Geometry or tolerance changes.",
          "Printability fixes.",
          "Customer-requested updates.",
          "Whether the revision is the current recommended print version.",
        ],
      },
      {
        title: "Where STL Shelf helps",
        paragraphs: [
          "STL Shelf combines version history with tags and browser preview inside a private library. That is useful for makers because retrieval, validation, and print preparation all start from the same archive context.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I track multiple revisions of an STL file?",
        answer:
          "Keep one stable model record and attach each new revision to that history with notes explaining the change.",
      },
      {
        question: "Why is version history important for makers?",
        answer:
          "Because design changes and reprints happen over time. Without version history, the archive becomes harder to trust.",
      },
      {
        question: "Can STL Shelf help with repeat jobs?",
        answer: "Yes. Repeat jobs are a strong fit for a versioned private archive.",
      },
      {
        question: "Is STL Shelf trying to replace Git?",
        answer:
          "No. It is a maker-focused versioned archive for 3D model files, not a code repository.",
      },
    ],
    internalLinks: [
      { href: "/version-control-for-stl-files", label: "Version control for STL files" },
      { href: "/how-to-manage-large-stl-libraries", label: "How to manage large STL libraries" },
      { href: "/private-3d-model-library", label: "Private 3D model library" },
      { href: "/stl-shelf-vs-google-drive-for-stl-files", label: "STL Shelf vs Google Drive" },
    ],
    ctaTitle: "Keep version history readable enough to be useful",
    ctaDescription:
      "Use a versioned archive that helps makers retrieve the right printable revision when it matters.",
  }),
  taggingStlFilesForFastSearch: page({
    id: "tagging-stl-files-for-fast-search",
    path: "/tagging-stl-files-for-fast-search",
    group: "guide",
    groupLabel: "Supporting guide",
    listTitle: "Tagging STL Files for Fast Search",
    title: "Tagging STL Files for Fast Search in Large Libraries | STL Shelf",
    description:
      "Learn how to tag STL files for fast search using a practical taxonomy that improves retrieval without overwhelming the archive.",
    keywords: [
      "tagging STL files for fast search",
      "tag STL files",
      "STL search tags",
      "3D model tagging",
      "large STL library search",
    ],
    eyebrow: "Supporting guide",
    h1: "Tagging STL files for fast search without overcomplicating the archive",
    intro: [
      "Tagging works when it reduces retrieval time and fails when it becomes a second job. The goal is not to create perfect metadata. The goal is to find the right model faster.",
      "This page focuses on search-first tagging for STL libraries that are too large or too active for folder-only retrieval.",
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "A fast-search tagging model",
    workflow: [
      {
        title: "Pick the highest-value fields",
        description:
          "Tag by the attributes you actually search by, not by every attribute that exists.",
      },
      {
        title: "Keep names consistent",
        description:
          "A small controlled vocabulary is usually more valuable than a huge free-form tag cloud.",
      },
      {
        title: "Review failed searches",
        description:
          "The best tag improvements often come from noticing which searches return the wrong models or no useful matches.",
      },
    ],
    sections: [
      {
        title: "Good tags for fast retrieval",
        bullets: [
          "Project and collection names.",
          "Part family or function.",
          "Status such as approved, prototype, deprecated.",
          "Customer, printer, or material context where useful.",
        ],
      },
      {
        title: "Bad tagging habits",
        bullets: [
          "Creating dozens of nearly identical tags.",
          "Using tags for information that never influences retrieval.",
          "Mixing singular and plural or inconsistent naming.",
          "Treating tags as a substitute for version history.",
        ],
      },
      {
        title: "Where STL Shelf helps",
        paragraphs: [
          "STL Shelf is a private 3D model library for organizing, cataloging, versioning, and managing private 3D printing model libraries. In that context, tags become more useful because they live next to versions and preview, not in a disconnected metadata layer.",
        ],
      },
    ],
    faqs: [
      {
        question: "What tags should I add to STL files?",
        answer:
          "Add the tags that support retrieval: project, part type, status, customer, machine, or kit membership. Keep the taxonomy small and consistent.",
      },
      {
        question: "How many tags should each STL file have?",
        answer:
          "Enough to support search, but not so many that tagging becomes slow or inconsistent.",
      },
      {
        question: "Can tags replace filenames?",
        answer:
          "No. Filenames still matter, but tags carry much more of the retrieval logic in a large archive.",
      },
      {
        question: "Can STL Shelf search across tags and versions?",
        answer:
          "That is part of the value of a private library workflow: tags and version context work together instead of being scattered across tools.",
      },
    ],
    internalLinks: [
      { href: "/tagging-system-for-3d-models", label: "Tagging system for 3D models" },
      { href: "/how-to-organize-stl-files", label: "How to organize STL files" },
      { href: "/how-to-manage-large-stl-libraries", label: "How to manage large STL libraries" },
      { href: "/stl-shelf-vs-folders", label: "STL Shelf vs folders" },
    ],
    ctaTitle: "Use tags to shorten search time, not add busywork",
    ctaDescription:
      "Keep the taxonomy small, retrieval-focused, and aligned with how the archive is actually used.",
  }),
  selfHostedStlFileLibrary: page({
    id: "self-hosted-stl-file-library",
    path: "/self-hosted-stl-file-library",
    group: "open-source",
    groupLabel: "Open-source and self-hosted",
    listTitle: "Self-Hosted STL File Library",
    title: "Self-Hosted STL File Library for Private Archives | STL Shelf",
    description:
      "Self-host an open-source STL file library for private archives, or use the hosted version managed by us when you want the simpler path.",
    keywords: [
      "self-hosted STL file library",
      "self-host STL library",
      "open-source STL library software",
      "private self-hosted STL archive",
      "hosted STL library",
    ],
    eyebrow: "Open-source and self-hosted",
    h1: "Self-hosted STL file library software for users who want more deployment control",
    intro: [
      "Some users want a private STL library and also want to run the stack themselves. That is a valid need, but it should be framed as a deployment choice inside the product category rather than as the full identity of the product.",
      "STL Shelf can be self-hosted because it is open source, while the hosted version managed by us remains the easier default path.",
    ],
    semanticStatements: [coreDefinition, corePrivate, coreDescription, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "How to choose the right path",
    workflow: [
      {
        title: "Confirm the workflow need",
        description:
          "Make sure the real need is private library management, not just generic storage on your own hardware.",
      },
      {
        title: "Use hosted when simplicity matters",
        description:
          "The hosted version removes operational overhead and is usually the better commercial fit.",
      },
      {
        title: "Use self-hosted when control matters",
        description:
          "Self-hosting makes sense when deployment control, internal policy, or infrastructure ownership is the priority.",
      },
    ],
    sections: [
      {
        title: "What this page should not become",
        bullets: [
          "Not a Docker tutorial.",
          "Not a long checklist of infrastructure steps.",
          "Not a page that makes self-hosting feel like the default for everyone.",
        ],
      },
      {
        title: "What it should emphasize instead",
        bullets: [
          "Open-source credibility.",
          "Ownership and deployment choice.",
          "Hosted by us as the easier path.",
          "Private library workflow as the main product value.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I self-host STL Shelf as an STL file library?",
        answer:
          "Yes. STL Shelf is open source and can be self-hosted, while the hosted version managed by us remains the easier option for most users.",
      },
      {
        question: "Should I self-host or use the hosted version?",
        answer:
          "Use hosted when you want the workflow without running infrastructure. Self-host when you specifically need operational control.",
      },
      {
        question: "Does self-hosting change what the product does?",
        answer:
          "No. The product remains private 3D model library software. Only the deployment model changes.",
      },
      {
        question: "Is STL Shelf open source?",
        answer: "Yes.",
      },
    ],
    internalLinks: [
      { href: "/self-hosted-3d-model-library", label: "Self-hosted 3D model library" },
      { href: "/private-self-hosted-stl-library", label: "Private self-hosted STL library" },
      { href: "/open-source-stl-library-software", label: "Open-source STL library software" },
      { href: "/pricing", label: "Pricing" },
    ],
    ctaTitle: "Choose self-hosting when it serves ownership, not as a default reflex",
    ctaDescription:
      "Use the hosted path for speed or the open-source path for control while keeping the same core library workflow.",
  }),
  openSourceStlLibrarySoftware: page({
    id: "open-source-stl-library-software",
    path: "/open-source-stl-library-software",
    group: "open-source",
    groupLabel: "Open-source and self-hosted",
    listTitle: "Open-Source STL Library Software",
    title: "Open-Source STL Library Software with Hosted Option | STL Shelf",
    description:
      "Open-source STL library software for organizing private 3D printing archives, with a hosted version managed by us for the simpler path.",
    keywords: [
      "open-source STL library software",
      "open-source STL organizer",
      "self-hosted STL library",
      "private 3D model library software",
      "hosted STL library software",
    ],
    eyebrow: "Open-source and self-hosted",
    h1: "Open-source STL library software for private archives",
    intro: [
      "Open source matters here because it supports ownership, auditability, and deployment choice. It should strengthen the product's credibility without replacing the product story with infrastructure content.",
      "STL Shelf is open-source software for managing private 3D printing model libraries, and it also has a hosted version managed by us for users who want the workflow without operating the stack.",
    ],
    semanticStatements: [coreDefinition, corePrivate, coreDescription, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "How open-source positioning should work",
    workflow: [
      {
        title: "Lead with the product",
        description:
          "Explain the archive-management workflow first so users understand the software category before the deployment model.",
      },
      {
        title: "Use open source as proof of control",
        description: "Open source supports ownership, transparency, and self-hosting availability.",
      },
      {
        title: "Keep hosted as the easy path",
        description:
          "The hosted version managed by us remains the simplest commercial option for most users.",
      },
    ],
    sections: [
      {
        title: "Why open source matters for this category",
        bullets: [
          "It reduces vendor-lock-in concerns.",
          "It makes self-hosting possible.",
          "It supports trust and transparency for ownership-focused buyers.",
          "It complements private archive positioning.",
        ],
      },
      {
        title: "What open source does not mean",
        bullets: [
          "It does not mean self-hosting is mandatory.",
          "It does not mean the product is primarily an infrastructure project.",
          "It does not mean hosted users are second-class users.",
        ],
      },
      {
        title: "Where STL Shelf fits",
        paragraphs: [
          "STL Shelf is open-source 3D model library software with a hosted version managed by us. It organizes, catalogs, versions, and manages private 3D printing model libraries.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is STL Shelf open source?",
        answer: "Yes. STL Shelf is open-source software and can be self-hosted.",
      },
      {
        question: "Does open source mean I have to self-host?",
        answer: "No. The hosted version managed by us is the simpler path for most users.",
      },
      {
        question: "Why mention open source on a commercial site?",
        answer:
          "Because it signals ownership, transparency, and deployment choice without changing the core product category.",
      },
      {
        question: "Is STL Shelf still private if I use the hosted version?",
        answer:
          "Yes. The private-library positioning applies to the product model, not only to self-hosted deployments.",
      },
    ],
    internalLinks: [
      {
        href: "/open-source-3d-model-library-software",
        label: "Open-source 3D model library software",
      },
      { href: "/open-source-stl-organizer", label: "Open-source STL organizer" },
      { href: "/self-hosted-stl-file-library", label: "Self-hosted STL file library" },
      { href: "/pricing", label: "Pricing" },
    ],
    ctaTitle: "Use open-source software without making infrastructure the whole story",
    ctaDescription:
      "Keep the focus on private library management while preserving deployment choice and ownership control.",
  }),
  stlShelfVsFolders: page({
    id: "stl-shelf-vs-folders",
    path: "/stl-shelf-vs-folders",
    group: "comparison",
    groupLabel: "Comparison",
    listTitle: "STL Shelf vs Folders",
    title: "STL Shelf vs Folders for Organizing STL Libraries | STL Shelf",
    description:
      "A fair comparison of STL Shelf vs folders for organizing private 3D printing libraries, including where folders still work and where they break down.",
    keywords: [
      "STL Shelf vs folders",
      "folders vs STL organizer",
      "organize STL files with folders",
      "private 3D model library vs folders",
      "best way to organize STL files",
    ],
    eyebrow: "Comparison",
    h1: "STL Shelf vs folders for organizing 3D printing files",
    intro: [
      "Folders are not bad. They are just limited. For small libraries and stable workflows, they can be enough. The question is not whether folders work at all. The question is where they stop working well enough.",
      "This page compares folders with a private library workflow so users can make a fair choice instead of hearing a one-sided sales pitch.",
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "How to evaluate the tradeoff",
    workflow: [
      {
        title: "Look at retrieval speed",
        description:
          "If you can find the right file instantly with folders, they may still be enough. If not, structure is the real problem.",
      },
      {
        title: "Look at overlap",
        description:
          "If the same model belongs to several projects or statuses, tags become more useful than deeper folder trees.",
      },
      {
        title: "Look at version history",
        description:
          "If revisions keep multiplying, a versioned library is usually safer than filename conventions alone.",
      },
    ],
    sections: [
      {
        title: "Where folders still work",
        bullets: [
          "Small private archives.",
          "Very low change frequency.",
          "Simple one-project-at-a-time workflows.",
          "Minimal need for cross-cutting search.",
        ],
      },
      {
        title: "Where folders break down",
        bullets: [
          "Large archives with repeated retrieval.",
          "Mixed-format models and related assets.",
          "Revision-heavy designs.",
          "Models that belong to multiple contexts at once.",
        ],
      },
      {
        title: "Where STL Shelf adds value",
        paragraphs: [
          "STL Shelf adds tags, version history, browser preview, and private library structure. It does not replace the existence of files on storage. It replaces the weak organizational model that folders create when the archive becomes complex.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the difference between folders and a 3D model library?",
        answer:
          "Folders organize storage locations. A 3D model library organizes models, versions, tags, and retrieval context.",
      },
      {
        question: "Are folders enough for STL files?",
        answer:
          "Sometimes, for small simple archives. They are usually not enough once the library grows or versions multiply.",
      },
      {
        question: "Why is STL Shelf better than folders for large libraries?",
        answer:
          "Because it adds searchable tags, version history, preview, and model-level organization.",
      },
      {
        question: "Is STL Shelf replacing my filesystem?",
        answer:
          "No. It improves archive structure and retrieval rather than pretending files do not still exist on storage.",
      },
    ],
    internalLinks: [
      { href: "/best-way-to-organize-stl-files", label: "Best way to organize STL files" },
      { href: "/how-to-organize-stl-files", label: "How to organize STL files" },
      { href: "/stl-shelf-vs-google-drive-for-stl-files", label: "STL Shelf vs Google Drive" },
      { href: "/tagging-system-for-3d-models", label: "Tagging system for 3D models" },
    ],
    ctaTitle: "Keep folders when they work and upgrade when they do not",
    ctaDescription:
      "Use a private library once tags, versions, and reliable retrieval become more important than simple storage paths.",
  }),
  stlShelfVsGoogleDriveForStlFiles: page({
    id: "stl-shelf-vs-google-drive-for-stl-files",
    path: "/stl-shelf-vs-google-drive-for-stl-files",
    group: "comparison",
    groupLabel: "Comparison",
    listTitle: "STL Shelf vs Google Drive",
    title: "STL Shelf vs Google Drive for STL File Organization | STL Shelf",
    description:
      "A fair comparison of STL Shelf vs Google Drive for private STL file organization, focusing on search, versions, preview, and archive structure.",
    keywords: [
      "STL Shelf vs Google Drive",
      "Google Drive for STL files",
      "organize STL files in Google Drive",
      "private 3D model library vs Google Drive",
      "STL file management software",
    ],
    eyebrow: "Comparison",
    h1: "STL Shelf vs Google Drive for organizing STL files",
    intro: [
      "Google Drive is good at syncing and sharing general files. It is not purpose-built for managing a private 3D printing model archive. That difference matters once you need tags, model-level organization, preview, and reliable version retrieval.",
      "This comparison keeps the framing fair: Google Drive is useful, but it solves a different primary problem.",
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "How to compare the two",
    workflow: [
      {
        title: "Evaluate the core job",
        description:
          "If the main job is syncing files, Google Drive may be enough. If the main job is archive organization, the category shifts.",
      },
      {
        title: "Evaluate retrieval quality",
        description:
          "Ask whether the tool helps you find the right model version quickly, not just whether the file is stored somewhere.",
      },
      {
        title: "Evaluate archive privacy and structure",
        description:
          "A private library workflow emphasizes owned organization rather than generic file sharing.",
      },
    ],
    sections: [
      {
        title: "Where Google Drive is strong",
        bullets: [
          "General-purpose cloud storage.",
          "Broad device availability.",
          "Simple sharing and syncing.",
        ],
      },
      {
        title: "Where Google Drive is weak for STL libraries",
        bullets: [
          "No native model-level private library structure.",
          "Weak tagging and version workflow for 3D models.",
          "Preview and retrieval are not purpose-built for printable model archives.",
          "Easy to fall back into folder sprawl.",
        ],
      },
      {
        title: "Where STL Shelf fits instead",
        paragraphs: [
          "STL Shelf is software designed to organize, catalog, version, and manage private 3D printing model libraries. That makes it more specific than Google Drive for archive management, while Google Drive remains stronger as a general sync product.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can STL Shelf replace Google Drive for STL file organization?",
        answer:
          "For organization workflows, yes. STL Shelf is better aligned with tags, versions, preview, and private archive structure. Google Drive remains better for general-purpose syncing.",
      },
      {
        question: "Is Google Drive enough for STL files?",
        answer:
          "It can be enough for simple storage, but it usually becomes weak for large private libraries with many versions or repeated retrieval needs.",
      },
      {
        question: "Does STL Shelf sync with Google Drive?",
        answer:
          "STL Shelf is not positioned as an import or sync hub. Its focus is the private library workflow.",
      },
      {
        question: "Is STL Shelf a cloud drive?",
        answer: "No. It is private 3D model library software.",
      },
    ],
    internalLinks: [
      { href: "/stl-shelf-vs-dropbox-for-3d-model-libraries", label: "STL Shelf vs Dropbox" },
      { href: "/stl-file-management-software", label: "STL file management software" },
      { href: "/private-3d-model-library-software", label: "Private 3D model library software" },
      { href: "/pricing", label: "Pricing" },
    ],
    ctaTitle: "Use the right tool for archive structure, not just storage",
    ctaDescription:
      "Keep Google Drive for generic syncing if you want, but use a private library workflow when retrieval and versions matter.",
  }),
  stlShelfVsDropboxFor3dModelLibraries: page({
    id: "stl-shelf-vs-dropbox-for-3d-model-libraries",
    path: "/stl-shelf-vs-dropbox-for-3d-model-libraries",
    group: "comparison",
    groupLabel: "Comparison",
    listTitle: "STL Shelf vs Dropbox",
    title: "STL Shelf vs Dropbox for Private 3D Model Libraries | STL Shelf",
    description:
      "Compare STL Shelf vs Dropbox for private 3D model libraries, including where Dropbox works well and where dedicated library software adds value.",
    keywords: [
      "STL Shelf vs Dropbox",
      "Dropbox for 3D model libraries",
      "private 3D model library vs Dropbox",
      "organize STL files Dropbox",
      "STL file organizer",
    ],
    eyebrow: "Comparison",
    h1: "STL Shelf vs Dropbox for private 3D model libraries",
    intro: [
      "Dropbox is good at file storage, sync, and general collaboration. That is useful, but it is not the same as managing a versioned 3D model archive with tags and preview. The distinction matters once the library becomes operationally important.",
      "This page compares the two fairly so the real alternative is clear: generic storage versus dedicated library structure.",
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "How to choose between them",
    workflow: [
      {
        title: "Check whether sync is the real need",
        description:
          "If syncing files across machines is the main requirement, Dropbox may cover it well.",
      },
      {
        title: "Check whether retrieval is the pain point",
        description:
          "If version confusion and archive findability are the bigger issue, dedicated library software is the better fit.",
      },
      {
        title: "Check whether the archive is private and ongoing",
        description:
          "Private long-lived archives usually benefit from model-level organization instead of pure file sync.",
      },
    ],
    sections: [
      {
        title: "Where Dropbox is strong",
        bullets: ["General file sync.", "Broad compatibility.", "Simple shared-folder workflows."],
      },
      {
        title: "Where Dropbox is weak for model libraries",
        bullets: [
          "Weak model-level grouping.",
          "Limited tag-driven library structure.",
          "No purpose-built versioned archive model for 3D printing files.",
          "Easy to accumulate folder sprawl over time.",
        ],
      },
      {
        title: "Where STL Shelf fits",
        paragraphs: [
          "STL Shelf is software designed to organize, catalog, version, and manage private 3D printing model libraries. It is more specialized than Dropbox and therefore more appropriate when private archive structure is the actual need.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can STL Shelf replace Dropbox for a 3D model library?",
        answer:
          "For archive organization, yes. Dropbox remains better for general-purpose syncing and file distribution.",
      },
      {
        question: "Why is Dropbox weaker for STL libraries?",
        answer:
          "Because it is not purpose-built around model records, versions, preview, or tag-driven retrieval.",
      },
      {
        question: "Does STL Shelf integrate with Dropbox sync?",
        answer:
          "The product is not positioned as an import or sync hub. Its focus is the private library workflow.",
      },
      {
        question: "Is STL Shelf only for large teams?",
        answer:
          "No. It is also useful for solo makers once their private archive becomes hard to manage with generic tools.",
      },
    ],
    internalLinks: [
      { href: "/stl-shelf-vs-google-drive-for-stl-files", label: "STL Shelf vs Google Drive" },
      { href: "/stl-shelf-vs-folders", label: "STL Shelf vs folders" },
      { href: "/private-3d-model-library", label: "Private 3D model library" },
      { href: "/pricing", label: "Pricing" },
    ],
    ctaTitle: "Use generic sync for syncing and dedicated software for library structure",
    ctaDescription:
      "Choose the tool that matches the actual job instead of expecting cloud storage to become archive software.",
  }),
  stlShelfVsMarketplacesForPrivateLibraries: page({
    id: "stl-shelf-vs-marketplaces-for-private-libraries",
    path: "/stl-shelf-vs-marketplaces-for-private-libraries",
    group: "comparison",
    groupLabel: "Comparison",
    listTitle: "STL Shelf vs Marketplaces",
    title: "STL Shelf vs Marketplaces for Private 3D Model Libraries | STL Shelf",
    description:
      "Understand why STL Shelf is a private 3D model library rather than a marketplace, and when private archive software is the better fit.",
    keywords: [
      "STL Shelf vs marketplaces",
      "private 3D model library vs marketplace",
      "is STL Shelf a marketplace",
      "private STL library software",
      "3D model archive software",
    ],
    eyebrow: "Comparison",
    h1: "STL Shelf vs marketplaces for users who want a private library",
    intro: [
      "Marketplaces solve discovery, selling, and distribution. Private library software solves ownership, retrieval, versions, and internal archive structure. Those are adjacent categories, not the same category.",
      "This page exists because many users evaluate private archive tools against public marketplaces even though the core job is different.",
    ],
    semanticStatements: [coreDefinition, coreDescription, corePrivate, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "How to tell which category you need",
    workflow: [
      {
        title: "If you want discovery or selling, use a marketplace",
        description: "Public distribution and audience reach belong to the marketplace category.",
      },
      {
        title: "If you want ownership and retrieval, use a library",
        description: "Private archive structure is the library category.",
      },
      {
        title: "If you need both, separate the workflows",
        description:
          "Do not force a publishing platform to become your internal archive when the use cases differ.",
      },
    ],
    sections: [
      {
        title: "What marketplaces are good at",
        bullets: [
          "Discovery and browsing.",
          "Public distribution and storefront logic.",
          "Community visibility and audience reach.",
        ],
      },
      {
        title: "What private library software is good at",
        bullets: [
          "Owned archives.",
          "Searchable tags and versions.",
          "Private retrieval and repeat-job support.",
          "Long-term organization without public sharing pressure.",
        ],
      },
      {
        title: "Where STL Shelf fits",
        paragraphs: [
          "STL Shelf is not a marketplace and not a social platform. It is software designed to organize, catalog, version, and manage private 3D printing model libraries.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is STL Shelf a marketplace?",
        answer: "No. STL Shelf is not a marketplace.",
      },
      {
        question: "Can STL Shelf replace a marketplace?",
        answer:
          "Not for discovery or selling. Its role is private archive management, not public distribution.",
      },
      {
        question: "Why compare STL Shelf to marketplaces at all?",
        answer:
          "Because users often want private library control after accumulating files through public sources. The categories are related but solve different problems.",
      },
      {
        question: "Is STL Shelf a social platform?",
        answer: "No.",
      },
    ],
    internalLinks: [
      { href: "/private-3d-model-library-software", label: "Private 3D model library software" },
      { href: "/private-3d-model-library", label: "Private 3D model library" },
      { href: "/stl-file-management-software", label: "STL file management software" },
      {
        href: "/open-source-3d-model-library-software",
        label: "Open-source 3D model library software",
      },
    ],
    ctaTitle: "Use a private library when ownership is the goal",
    ctaDescription:
      "Keep the archive optimized for retrieval and version clarity instead of forcing a marketplace workflow to do a different job.",
  }),
  openSource3dModelLibrarySoftware: page({
    id: "open-source-3d-model-library-software",
    path: "/open-source-3d-model-library-software",
    group: "open-source",
    groupLabel: "Open-source and self-hosted",
    listTitle: "Open-Source 3D Model Library Software",
    title: "Open-Source 3D Model Library Software for Private Archives | STL Shelf",
    description:
      "Open-source 3D model library software for organizing private 3D printing archives, with hosted deployment managed by us for users who want the easier path.",
    keywords: [
      "open-source 3D model library software",
      "open-source 3D model archive",
      "private 3D model library software",
      "self-hosted 3D model library",
      "hosted 3D model library software",
    ],
    eyebrow: "Open-source and self-hosted",
    h1: "Open-source 3D model library software for ownership-focused archives",
    intro: [
      "Open-source 3D model library software sits at the intersection of ownership, archive management, and deployment choice. Buyers in this category usually care about keeping their library private and structured without committing themselves to a closed system.",
      "STL Shelf fits here because it is open source, self-hostable, and also available as a hosted version managed by us.",
    ],
    semanticStatements: [coreDefinition, corePrivate, coreDescription, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "How this category should be understood",
    workflow: [
      {
        title: "Start with the archive problem",
        description:
          "The product category is still library software for 3D printing files, not hosting infrastructure.",
      },
      {
        title: "Use open source as leverage",
        description: "Open source provides deployment choice and ownership credibility.",
      },
      {
        title: "Choose hosted or self-hosted based on constraints",
        description: "The same product can serve both paths depending on operational preference.",
      },
    ],
    sections: [
      {
        title: "Why open source matters",
        bullets: [
          "Deployment freedom.",
          "Transparency.",
          "Reduced lock-in concerns.",
          "Better alignment with ownership-first archive buyers.",
        ],
      },
      {
        title: "Why hosted still matters",
        bullets: [
          "Faster onboarding.",
          "Less operational overhead.",
          "Clearer commercial path for most users.",
        ],
      },
      {
        title: "Where STL Shelf fits",
        paragraphs: [
          "STL Shelf is open-source software for managing private 3D printing model libraries. It also has a hosted version managed by us. That combination supports both credibility and simplicity without changing the core library workflow.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is STL Shelf open-source 3D model library software?",
        answer: "Yes.",
      },
      {
        question: "Can open-source library software still have a hosted version?",
        answer:
          "Yes. Open source and hosted deployment are compatible when the hosted option is a convenience path, not a contradiction.",
      },
      {
        question: "Should open-source pages focus on deployment tutorials?",
        answer:
          "No. They should focus on ownership, privacy, control, and deployment choice at a high level.",
      },
      {
        question: "Does STL Shelf support private archives?",
        answer: "Yes. Private archive management is central to the product positioning.",
      },
    ],
    internalLinks: [
      { href: "/open-source-stl-library-software", label: "Open-source STL library software" },
      { href: "/open-source-stl-organizer", label: "Open-source STL organizer" },
      {
        href: "/self-hosted-3d-model-library-software",
        label: "Self-hosted 3D model library software",
      },
      { href: "/pricing", label: "Pricing" },
    ],
    ctaTitle: "Use open-source library software without losing the product story",
    ctaDescription:
      "Keep the focus on private archive management while preserving the option to self-host when needed.",
  }),
  openSourceStlOrganizer: page({
    id: "open-source-stl-organizer",
    path: "/open-source-stl-organizer",
    group: "open-source",
    groupLabel: "Open-source and self-hosted",
    listTitle: "Open-Source STL Organizer",
    title: "Open-Source STL Organizer for Private Model Libraries | STL Shelf",
    description:
      "An open-source STL organizer with tags, version history, browser preview, hosted deployment managed by us, and self-hosting when control matters.",
    keywords: [
      "open-source STL organizer",
      "open-source STL file organizer",
      "self-hosted STL organizer",
      "private STL library software",
      "hosted STL organizer",
    ],
    eyebrow: "Open-source and self-hosted",
    h1: "An open-source STL organizer for private long-term archives",
    intro: [
      "Open-source STL organizer searches usually come from users who want both structure and control. They need an organizer, not just a repo of files, and they prefer software that does not trap the archive inside a closed deployment model.",
      "STL Shelf fits that search because it is an STL organizer with open-source credibility and a hosted path managed by us.",
    ],
    semanticStatements: [coreDefinition, corePrivate, coreDescription, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "How the organizer workflow fits open source",
    workflow: [
      {
        title: "Organize the archive",
        description:
          "Use tags, preview, and version history to build a retrievable private library.",
      },
      {
        title: "Decide on deployment later",
        description:
          "Adopt the product workflow first, then choose hosted or self-hosted deployment based on your constraints.",
      },
      {
        title: "Preserve ownership",
        description:
          "Open-source availability supports the ownership story without forcing everyone into self-hosting.",
      },
    ],
    sections: [
      {
        title: "Why this query matters",
        paragraphs: [
          "Users searching for an open-source STL organizer are often already convinced they need something more than folders. What they are really comparing is how much control they keep after choosing organizer software.",
        ],
      },
      {
        title: "What STL Shelf offers",
        bullets: [
          "Tag-driven organization.",
          "Versioned archive model.",
          "Browser preview.",
          "Hosted by us or self-hosted because it is open source.",
        ],
      },
      {
        title: "What STL Shelf is not",
        bullets: [
          "Not a marketplace.",
          "Not a social feed.",
          "Not a sync hub for external services.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is STL Shelf an open-source STL organizer?",
        answer: "Yes.",
      },
      {
        question: "Can I self-host the open-source STL organizer?",
        answer: "Yes. Self-hosting is available because the product is open source.",
      },
      {
        question: "Do I need to self-host to use STL Shelf?",
        answer: "No. The hosted version managed by us is the simpler path for most users.",
      },
      {
        question: "Does open source change the product category?",
        answer: "No. It remains STL file management and private 3D model library software.",
      },
    ],
    internalLinks: [
      { href: "/stl-file-organizer", label: "STL file organizer" },
      { href: "/open-source-stl-library-software", label: "Open-source STL library software" },
      { href: "/self-hosted-stl-file-library", label: "Self-hosted STL file library" },
      { href: "/pricing", label: "Pricing" },
    ],
    ctaTitle: "Use an organizer that keeps the ownership story intact",
    ctaDescription:
      "Adopt the hosted version for speed or self-host the open-source product when control matters more.",
  }),
  privateSelfHostedStlLibrary: page({
    id: "private-self-hosted-stl-library",
    path: "/private-self-hosted-stl-library",
    group: "open-source",
    groupLabel: "Open-source and self-hosted",
    listTitle: "Private Self-Hosted STL Library",
    title: "Private Self-Hosted STL Library for Ownership-Focused Teams | STL Shelf",
    description:
      "Private self-hosted STL library software for users who want ownership and deployment control, with a hosted option managed by us for simpler adoption.",
    keywords: [
      "private self-hosted STL library",
      "self-hosted private STL archive",
      "open-source STL library software",
      "self-hosted 3D model library",
      "private 3D model library software",
    ],
    eyebrow: "Open-source and self-hosted",
    h1: "A private self-hosted STL library for users who need control over the archive",
    intro: [
      "Some buyers want the strongest possible alignment between private archive management and deployment control. This page targets that use case directly without turning the whole site into infrastructure marketing.",
      "STL Shelf fits because it is open source, self-hostable, and still available as a hosted version managed by us for users who prefer convenience.",
    ],
    semanticStatements: [coreDefinition, corePrivate, coreDescription, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "How to think about a private self-hosted library",
    workflow: [
      {
        title: "Confirm that privacy and control are core requirements",
        description:
          "Self-hosting is most useful when deployment control is part of the reason you are buying the software.",
      },
      {
        title: "Keep the focus on archive operations",
        description:
          "Even in self-hosted mode, the main benefit is still organization, versioning, preview, and retrieval.",
      },
      {
        title: "Use hosted when self-hosting is unnecessary",
        description:
          "If control is not essential, the hosted version managed by us is the more pragmatic choice.",
      },
    ],
    sections: [
      {
        title: "Why privacy and self-hosting are related but not identical",
        paragraphs: [
          "A hosted product can still support private archive workflows. Self-hosting matters when you specifically want operational control in addition to private library behavior.",
        ],
      },
      {
        title: "What this page should promise",
        bullets: [
          "Control over deployment.",
          "Private archive structure.",
          "Open-source credibility.",
          "Hosted version still available as the simpler path.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I run STL Shelf as a private self-hosted STL library?",
        answer: "Yes.",
      },
      {
        question: "Is self-hosting required for privacy?",
        answer:
          "No. Privacy is part of the product positioning. Self-hosting is an additional control choice.",
      },
      {
        question: "Should I self-host STL Shelf or use the hosted version?",
        answer:
          "Self-host if deployment control is important. Use the hosted version if you want the workflow without operating the stack.",
      },
      {
        question: "Is STL Shelf open source?",
        answer: "Yes.",
      },
    ],
    internalLinks: [
      { href: "/self-hosted-3d-model-library", label: "Self-hosted 3D model library" },
      { href: "/self-hosted-stl-file-library", label: "Self-hosted STL file library" },
      {
        href: "/open-source-3d-model-library-software",
        label: "Open-source 3D model library software",
      },
      { href: "/pricing", label: "Pricing" },
    ],
    ctaTitle: "Choose self-hosting when private archive control is part of the requirement",
    ctaDescription:
      "Keep the library workflow the same while selecting the deployment model that matches your operational needs.",
  }),
  selfHosted3dModelLibrarySoftware: page({
    id: "self-hosted-3d-model-library-software",
    path: "/self-hosted-3d-model-library-software",
    group: "open-source",
    groupLabel: "Open-source and self-hosted",
    listTitle: "Self-Hosted 3D Model Library Software",
    title: "Self-Hosted 3D Model Library Software with Hosted Option | STL Shelf",
    description:
      "Self-hosted 3D model library software for private archives, with a hosted version managed by us when you want the simpler path to the same workflow.",
    keywords: [
      "self-hosted 3D model library software",
      "self-hosted STL library software",
      "open-source 3D model library software",
      "private 3D model library software",
      "hosted 3D model library",
    ],
    eyebrow: "Open-source and self-hosted",
    h1: "Self-hosted 3D model library software without making self-hosting the whole story",
    intro: [
      "This page targets users who explicitly search for self-hosted 3D model library software. The correct positioning is that STL Shelf can satisfy that need because it is open source, while the hosted version managed by us remains the easier path for most users.",
      "The page should inform deployment choice, not turn into an operations manual.",
    ],
    semanticStatements: [coreDefinition, corePrivate, coreDescription, coreOpenSource],
    featureList: defaultFeatureList,
    workflowTitle: "How to position self-hosted library software",
    workflow: [
      {
        title: "Define the archive problem first",
        description:
          "A self-hosted deployment only matters if the underlying software category is the right fit.",
      },
      {
        title: "Explain ownership and control",
        description:
          "Users on this page usually want confidence that the deployment model aligns with private archive requirements.",
      },
      {
        title: "Keep hosted deployment visible",
        description:
          "The hosted version managed by us should remain a clear alternative for lower-friction adoption.",
      },
    ],
    sections: [
      {
        title: "What users on this page usually mean",
        paragraphs: [
          "They usually mean they want private 3D model library software and they want the option to run it themselves. That is narrower than a generic self-hosting interest and should be answered accordingly.",
        ],
      },
      {
        title: "What this page should include",
        bullets: [
          "High-level requirements and expectations.",
          "Ownership and control framing.",
          "Hosted alternative managed by us.",
          "No deep infrastructure tutorial content.",
        ],
      },
      {
        title: "Where STL Shelf fits",
        paragraphs: [
          "STL Shelf is open-source software for managing private 3D printing model libraries. Self-hosting is available because of that, but the product remains primarily a private library workflow rather than a deployment story.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is STL Shelf self-hosted 3D model library software?",
        answer: "Yes. It can be self-hosted because it is open source.",
      },
      {
        question: "Should self-hosting be the default path?",
        answer:
          "Not for most users. The hosted version managed by us is usually the simpler option.",
      },
      {
        question: "Does this page include a full setup tutorial?",
        answer:
          "No. This page should stay focused on ownership, privacy, and deployment choice at a high level.",
      },
      {
        question: "Is STL Shelf a marketplace or social platform?",
        answer: "No.",
      },
    ],
    internalLinks: [
      { href: "/self-hosted-3d-model-library", label: "Self-hosted 3D model library" },
      {
        href: "/open-source-3d-model-library-software",
        label: "Open-source 3D model library software",
      },
      { href: "/private-self-hosted-stl-library", label: "Private self-hosted STL library" },
      { href: "/pricing", label: "Pricing" },
    ],
    ctaTitle: "Adopt the workflow first, then decide how you want to run it",
    ctaDescription:
      "Use the hosted product for speed or self-host the open-source stack when deployment control is non-negotiable.",
  }),
} as const satisfies Record<string, SeoPageData>;

export const seoPageList = Object.values(seoPages);

export const seoPageGroups = [
  {
    key: "pillar",
    title: "Pillar pages",
    pages: seoPageList.filter((page) => page.group === "pillar"),
  },
  {
    key: "guide",
    title: "Supporting guides",
    pages: seoPageList.filter((page) => page.group === "guide"),
  },
  {
    key: "comparison",
    title: "Comparison pages",
    pages: seoPageList.filter((page) => page.group === "comparison"),
  },
  {
    key: "open-source",
    title: "Open-source and self-hosted cluster",
    pages: seoPageList.filter((page) => page.group === "open-source"),
  },
] as const;
