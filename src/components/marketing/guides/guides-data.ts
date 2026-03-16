export type GuideFaq = {
  question: string;
  answer: string;
};

export type GuideStep = {
  title: string;
  description: string;
};

export type GuidePageData = {
  id: string;
  path: `/${string}`;
  listTitle: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  problem: string[];
  steps: [GuideStep, GuideStep, GuideStep];
  isItems: string[];
  isNotItems: string[];
  faqs: [GuideFaq, GuideFaq, GuideFaq, GuideFaq];
  ctaTitle: string;
  ctaDescription: string;
};

export type GuideIndexPath =
  | "/organize-stl-files"
  | "/stl-file-organizer"
  | "/organize-3mf-files"
  | "/organize-obj-files"
  | "/version-control-for-stl-files"
  | "/tagging-system-for-3d-models"
  | "/private-3d-model-library"
  | "/self-hosted-3d-model-library"
  | "/3d-model-preview-in-browser"
  | "/stop-stl-folder-chaos";

export type GuideIndexEntry = {
  id: string;
  path: GuideIndexPath;
  listTitle: string;
  description: string;
};

const defaultIsItems = [
  "A private library for your STL, 3MF, and OBJ files",
  "Searchable tags that keep projects and parts organized",
  "Version history so every revision stays traceable",
  "Browser preview before you send models to print",
];

const defaultIsNotItems = [
  "No marketplace",
  "No sharing or social feed",
  "No import or sync from other services",
];

export const guidePages = {
  organizeStlFiles: {
    id: "organize-stl-files",
    path: "/organize-stl-files",
    listTitle: "Organize STL Files Without Folder Chaos",
    title: "Organize STL Files Without Folder Chaos - STL Shelf",
    description:
      "Organize STL, 3MF, and OBJ files in a private 3D model library with tags, preview, and version history.",
    h1: "Organize STL files without folder chaos",
    intro:
      "STL Shelf gives you a private home for every model, revision, and project so your files stop getting lost in random folders.",
    problem: [
      "Most makers keep STL files in Downloads, old cloud folders, and copied USB backups.",
      "That spread makes it hard to find the right model when you need to print fast.",
      "It also causes duplicate files and missing revisions that break repeatable results.",
    ],
    steps: [
      {
        title: "Save each model in one private library",
        description:
          "Upload STL, 3MF, and OBJ files into a single place instead of scattered folders.",
      },
      {
        title: "Tag by project, part, and printer intent",
        description:
          "Use practical tags so you can search by what the model is and where it belongs.",
      },
      {
        title: "Preview and track every revision",
        description: "Inspect models in-browser and keep version history with clear notes.",
      },
    ],
    isItems: defaultIsItems,
    isNotItems: defaultIsNotItems,
    faqs: [
      {
        question: "Can STL Shelf import models from Printables or Thingiverse?",
        answer: "No. STL Shelf does not import or sync from external services.",
      },
      {
        question: "Is STL Shelf a marketplace?",
        answer: "No. STL Shelf is a private model library for your own files.",
      },
      {
        question: "Can I keep multiple iterations of the same part?",
        answer: "Yes. Version history keeps each revision organized and searchable.",
      },
      {
        question: "Does this support STL only?",
        answer: "No. STL Shelf supports STL, 3MF, and OBJ in the same workflow.",
      },
    ],
    ctaTitle: "Ready to clean up your STL folders?",
    ctaDescription: "Start with a private, searchable library built for 3D printing workflows.",
  },
  stlFileOrganizer: {
    id: "stl-file-organizer",
    path: "/stl-file-organizer",
    listTitle: "STL File Organizer (Private)",
    title: "STL File Organizer (Private) — Tags, Preview, Version History",
    description:
      "Organize STL files in a private library with tags, 3D preview, and version history. No marketplace, no sharing - just your files.",
    h1: "STL File Organizer (Private)",
    intro:
      "Use a private STL organizer that focuses on clarity: tags, preview, and version history without marketplace noise.",
    problem: [
      "STL collections usually grow faster than folder systems.",
      "After a few months, similar file names and duplicated exports make retrieval slow.",
      "Without a structured workflow, critical revisions disappear at print time.",
    ],
    steps: [
      {
        title: "Move STL files into one private library",
        description:
          "Store all models in one place so every search starts from a single source of truth.",
      },
      {
        title: "Apply focused tags",
        description: "Tag by project, part, or status to find exactly what you need in seconds.",
      },
      {
        title: "Use preview plus version history",
        description: "Inspect models quickly and track each change with a clean revision timeline.",
      },
    ],
    isItems: defaultIsItems,
    isNotItems: defaultIsNotItems,
    faqs: [
      {
        question: "Is this a public repository?",
        answer: "No. STL Shelf is private and centered on your personal files.",
      },
      {
        question: "Can teams publish models from STL Shelf?",
        answer: "No. STL Shelf is not a publishing tool or marketplace.",
      },
      {
        question: "Why use tags if I already have folders?",
        answer: "Tags let one model belong to multiple contexts without duplicating files.",
      },
      {
        question: "Can I compare revisions later?",
        answer: "Yes. Version history keeps every STL revision available for reference.",
      },
    ],
    ctaTitle: "Build your private STL organizer",
    ctaDescription: "Keep every model, tag, and revision in one calm workflow.",
  },
  organize3mfFiles: {
    id: "organize-3mf-files",
    path: "/organize-3mf-files",
    listTitle: "How to Organize 3MF Files",
    title: "How to Organize 3MF Files (Without Folder Chaos)",
    description:
      "A simple workflow to organize 3MF projects with tags, preview, and version history in a private library.",
    h1: "How to organize 3MF files without folder chaos",
    intro:
      "3MF projects often carry slicer details and print intent, so keeping them organized matters for repeatable results.",
    problem: [
      "3MF files are often scattered between slicer exports, desktop folders, and cloud sync directories.",
      "This makes it hard to know which file is the latest print-ready version.",
      "Losing context around materials and profile intent wastes print time.",
    ],
    steps: [
      {
        title: "Centralize all 3MF projects",
        description:
          "Keep every 3MF file in one private library instead of slicer-specific folders.",
      },
      {
        title: "Tag by printer setup and purpose",
        description: "Use tags like prototype, production, or printer profile to filter quickly.",
      },
      {
        title: "Track revisions as versions",
        description:
          "Save each new print iteration with clear history so you can roll back confidently.",
      },
    ],
    isItems: defaultIsItems,
    isNotItems: defaultIsNotItems,
    faqs: [
      {
        question: "Does STL Shelf preserve 3MF workflow context?",
        answer:
          "It keeps your files and versions organized so context is easier to track over time.",
      },
      {
        question: "Can I organize 3MF and STL together?",
        answer:
          "Yes. STL Shelf supports mixed libraries with shared tagging and version workflows.",
      },
      {
        question: "Is this tied to one slicer?",
        answer: "No. STL Shelf is slicer-agnostic and focused on file organization.",
      },
      {
        question: "Do I need imports from cloud drives?",
        answer: "No. STL Shelf does not import or sync from external services.",
      },
    ],
    ctaTitle: "Organize your 3MF projects cleanly",
    ctaDescription: "Use a private workflow that keeps print-ready files easy to find.",
  },
  organizeObjFiles: {
    id: "organize-obj-files",
    path: "/organize-obj-files",
    listTitle: "Organize OBJ Files for 3D Printing",
    title: "How to Organize OBJ Files for 3D Printing Projects | STL Shelf",
    description:
      "Organize OBJ assets for 3D printing in a private library with tags, browser preview, and version history instead of scattered folders.",
    h1: "How to organize OBJ files for 3D printing projects",
    intro:
      "OBJ assets can include variants, remixes, and supports, so naming alone is rarely enough to keep a private 3D printing library organized.",
    problem: [
      "OBJ files often live in separate project directories with little shared structure.",
      "As revisions grow, people end up with final files that are impossible to trust.",
      "Searching across multiple folders slows down handoff and production.",
    ],
    steps: [
      {
        title: "Collect OBJ assets in one library",
        description: "Bring all project assets into a private hub with consistent naming.",
      },
      {
        title: "Tag by role and project",
        description:
          "Use tags like source, printable, support, kit, and client to keep context visible.",
      },
      {
        title: "Keep iteration history",
        description: "Store each revision as a version so you always know what changed and when.",
      },
    ],
    isItems: defaultIsItems,
    isNotItems: defaultIsNotItems,
    faqs: [
      {
        question: "Can OBJ files be previewed in-browser?",
        answer: "Yes. STL Shelf includes browser preview for faster inspection before printing.",
      },
      {
        question: "Can I manage OBJ and STL together?",
        answer: "Yes. STL Shelf supports mixed-format libraries in one workflow.",
      },
      {
        question: "Does STL Shelf publish OBJ files publicly?",
        answer: "No. STL Shelf is private and does not include sharing features.",
      },
      {
        question: "Can I keep a full change trail for OBJ assets?",
        answer: "Yes. Version history keeps revisions ordered and recoverable.",
      },
    ],
    ctaTitle: "Get OBJ projects under control",
    ctaDescription: "Use tags, preview, and versions to prevent lost asset history.",
  },
  versionControlForStlFiles: {
    id: "version-control-for-stl-files",
    path: "/version-control-for-stl-files",
    listTitle: "Version Control for STL Files",
    title: "Version Control for STL Files (No more final_final_final)",
    description:
      "Keep every STL iteration organized with version history, changelogs, and a private library workflow.",
    h1: "Version control for STL files",
    intro:
      "If your folder has names like final_v7_really_final, you need a versioned library instead of manual file juggling.",
    problem: [
      "Manual naming conventions break down once designs iterate quickly.",
      "Teams and solo makers both lose track of which STL is print-safe.",
      "Without history, reverting a broken change becomes guesswork.",
    ],
    steps: [
      {
        title: "Start from a stable base version",
        description: "Save your known-good STL once so all future revisions are linked.",
      },
      {
        title: "Add each change as a new version",
        description: "Keep a simple changelog note so every update has context.",
      },
      {
        title: "Preview before printing",
        description: "Use browser preview to confirm the right revision before slicing.",
      },
    ],
    isItems: defaultIsItems,
    isNotItems: defaultIsNotItems,
    faqs: [
      {
        question: "Can I see all STL revisions in order?",
        answer: "Yes. Each upload can be tracked in a clear version timeline.",
      },
      {
        question: "Do I need Git for STL version control?",
        answer: "No. STL Shelf provides a file-focused version workflow for makers.",
      },
      {
        question: "Can I annotate why a revision changed?",
        answer: "Yes. Version entries can capture notes for each iteration.",
      },
      {
        question: "Is version control public?",
        answer: "No. STL Shelf is private and built for personal file management.",
      },
    ],
    ctaTitle: "Stop naming files final_final_final",
    ctaDescription: "Track STL revisions with structured version history.",
  },
  taggingSystemFor3dModels: {
    id: "tagging-system-for-3d-models",
    path: "/tagging-system-for-3d-models",
    listTitle: "Tagging System for 3D Models",
    title: "A Tagging System for 3D Models (Projects, Parts, Kits)",
    description:
      "A practical tagging system for STL/3MF/OBJ libraries so you can find any model by project, part, or kit in seconds.",
    h1: "A tagging system for 3D models",
    intro:
      "Folders alone cannot express all the relationships in a real 3D model library. Tags give you flexible structure without duplication.",
    problem: [
      "A single model can belong to multiple projects, kits, or printer setups.",
      "Folder trees force one location and hide useful context.",
      "That leads to duplicate files and slow lookup during production work.",
    ],
    steps: [
      {
        title: "Define a small tag taxonomy",
        description: "Start with project, part, kit, status, and material-focused tags.",
      },
      {
        title: "Tag every upload once",
        description: "Apply tags at upload time so search stays reliable as the library grows.",
      },
      {
        title: "Filter by combinations",
        description: "Use multiple tags together to find exact models without browsing folders.",
      },
    ],
    isItems: defaultIsItems,
    isNotItems: defaultIsNotItems,
    faqs: [
      {
        question: "How many tags should each model have?",
        answer:
          "Keep it practical: enough tags to find files quickly, but not so many that tagging slows you down.",
      },
      {
        question: "Can tags replace deep folder trees?",
        answer: "Yes. Tags reduce the need for rigid nested folders and duplicate storage.",
      },
      {
        question: "Do tags work across STL, 3MF, and OBJ?",
        answer: "Yes. The same tag system can organize mixed-format libraries.",
      },
      {
        question: "Does STL Shelf auto-import tags from other apps?",
        answer: "No. STL Shelf does not import or sync from external services.",
      },
    ],
    ctaTitle: "Build a tag system that scales",
    ctaDescription: "Find any model by project, part, or kit in seconds.",
  },
  private3dModelLibrary: {
    id: "private-3d-model-library",
    path: "/private-3d-model-library",
    listTitle: "Private 3D Model Library",
    title: "Private 3D Model Library (No Marketplace, No Sharing)",
    description:
      "A private library for your 3D models: searchable, versioned, and previewable. Built for makers who want ownership and clarity.",
    h1: "Private 3D model library",
    intro:
      "STL Shelf is designed for makers who want complete control of their own model archive without social feeds or public distribution.",
    problem: [
      "Many model tools are built around discovery and sharing, not private organization.",
      "That makes personal libraries feel secondary and hard to maintain.",
      "When ownership and clarity matter, you need a focused private workflow.",
    ],
    steps: [
      {
        title: "Keep all files in one private space",
        description: "Store your models in a personal archive built for search and structure.",
      },
      {
        title: "Use tags and metadata",
        description: "Create practical organization by project, part type, and print status.",
      },
      {
        title: "Maintain versions and preview",
        description: "Track change history and inspect models before printing.",
      },
    ],
    isItems: defaultIsItems,
    isNotItems: defaultIsNotItems,
    faqs: [
      {
        question: "Is STL Shelf a marketplace?",
        answer: "No. STL Shelf is focused on private model organization.",
      },
      {
        question: "Can I share models publicly from STL Shelf?",
        answer: "No. Sharing and social features are intentionally excluded.",
      },
      {
        question: "What is the main benefit of a private library?",
        answer: "You keep ownership, structure, and version clarity as your archive grows.",
      },
      {
        question: "Can I migrate data in from other services automatically?",
        answer: "No. STL Shelf does not provide import or sync connectors.",
      },
    ],
    ctaTitle: "Own your 3D model library",
    ctaDescription: "Keep your files searchable, private, and versioned from day one.",
  },
  modelPreviewInBrowser: {
    id: "3d-model-preview-in-browser",
    path: "/3d-model-preview-in-browser",
    listTitle: "3D Model Preview in Browser",
    title: "3D Model Browser Preview for STL, 3MF, and OBJ Files | STL Shelf",
    description:
      "Preview 3D models in your browser to inspect files before printing and keep that inspection tied to a private versioned library.",
    h1: "3D model browser preview for STL, 3MF, and OBJ files",
    intro:
      "Browser preview helps you validate files before slicing, so you can catch mistakes early and keep the review process tied to the right model and version.",
    problem: [
      "When preview is separated from your file library, inspection gets skipped.",
      "That increases the chance of printing the wrong revision.",
      "Fragmented tools also make file handoff and review slower.",
    ],
    steps: [
      {
        title: "Open models directly in browser preview",
        description: "Check geometry quickly without downloading or switching tools.",
      },
      {
        title: "Tag and categorize while reviewing",
        description: "Add tags during inspection so files stay organized and searchable.",
      },
      {
        title: "Tie preview to version history",
        description: "Review the exact revision you plan to print, not a guess from folders.",
      },
    ],
    isItems: defaultIsItems,
    isNotItems: defaultIsNotItems,
    faqs: [
      {
        question: "Does preview support STL, 3MF, and OBJ?",
        answer: "Yes. STL Shelf supports browser preview across these core model formats.",
      },
      {
        question: "Can preview replace slicing?",
        answer: "No. Preview is for fast inspection before slicer preparation.",
      },
      {
        question: "Why connect preview and versions?",
        answer: "It ensures you inspect the same revision you intend to print.",
      },
      {
        question: "Is preview public?",
        answer: "No. STL Shelf is a private file library with no social sharing.",
      },
    ],
    ctaTitle: "Preview before you print",
    ctaDescription: "Inspect models in-browser and keep them organized in one private workflow.",
  },
  stopStlFolderChaos: {
    id: "stop-stl-folder-chaos",
    path: "/stop-stl-folder-chaos",
    listTitle: "Stop STL Folder Chaos",
    title: "Stop STL Folder Chaos — A Simple Workflow to Stay Organized",
    description:
      "Stop losing track of models across downloads and cloud folders. Use a simple workflow with tags, preview, and version history.",
    h1: "Stop STL folder chaos",
    intro:
      "A focused file workflow beats endless folder cleanups. Keep your model archive clear from the first upload.",
    problem: [
      "Makers often accumulate models from downloads, purchases, and custom design exports.",
      "Those sources create fragmented folders that are hard to search under pressure.",
      "As projects scale, chaos compounds and reliable print files get harder to identify.",
    ],
    steps: [
      {
        title: "Unify model storage",
        description: "Move scattered files into one private library.",
      },
      {
        title: "Apply consistent tags",
        description: "Use the same tag pattern across every project and part.",
      },
      {
        title: "Keep versions visible",
        description: "Track revisions so you always know which file is safe to print.",
      },
    ],
    isItems: defaultIsItems,
    isNotItems: defaultIsNotItems,
    faqs: [
      {
        question: "What causes STL folder chaos most often?",
        answer: "Unstructured downloads, inconsistent naming, and missing version history.",
      },
      {
        question: "How quickly can this workflow be adopted?",
        answer: "Most teams can start by centralizing files and applying a small tag set.",
      },
      {
        question: "Does STL Shelf sync all my existing cloud folders automatically?",
        answer: "No. STL Shelf does not import or sync from external services.",
      },
      {
        question: "Can I keep this private?",
        answer: "Yes. STL Shelf is a private archive with no sharing features.",
      },
    ],
    ctaTitle: "Replace chaos with a clear workflow",
    ctaDescription: "Start organizing STL files with tags, preview, and version history.",
  },
} as const satisfies Record<string, GuidePageData>;

export const guideList: readonly GuideIndexEntry[] = [
  guidePages.organizeStlFiles,
  guidePages.stlFileOrganizer,
  guidePages.organize3mfFiles,
  guidePages.organizeObjFiles,
  guidePages.versionControlForStlFiles,
  guidePages.taggingSystemFor3dModels,
  guidePages.private3dModelLibrary,
  {
    id: "self-hosted-3d-model-library",
    path: "/self-hosted-3d-model-library",
    listTitle: "Self-Hosted 3D Model Library",
    description:
      "Deployment prerequisites, required services, and self-hosted setup notes for STL Shelf.",
  },
  guidePages.modelPreviewInBrowser,
  guidePages.stopStlFolderChaos,
] as const;
