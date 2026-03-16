export type MarketingFaq = {
  id: string;
  question: string;
  answer: string;
};

export const marketingFaqs: MarketingFaq[] = [
  {
    id: "organize-files-without-folder-chaos",
    question: "How do I organize STL files?",
    answer:
      "Use a private 3D model library with searchable tags, version history, and browser preview so the archive scales beyond folders and filenames.",
  },
  {
    id: "best-way-to-manage-large-stl-library",
    question: "What is the best way to manage a large STL library?",
    answer:
      "The best approach is a versioned private library workflow with tags, model-level grouping, and preview. Large archives usually outgrow folders and cloud-drive-only organization.",
  },
  {
    id: "is-stl-shelf-a-marketplace-or-social-platform",
    question: "Is STL Shelf a marketplace?",
    answer:
      "No. STL Shelf is not a marketplace and not a social platform. It is software for managing private 3D printing model libraries.",
  },
  {
    id: "can-i-self-host-stl-shelf",
    question: "Can I self-host STL Shelf?",
    answer:
      "Yes. STL Shelf is open source and can be self-hosted. The hosted version managed by us is the simpler path for most users.",
  },
  {
    id: "does-stl-shelf-support-stl-only",
    question: "Does STL Shelf support STL only?",
    answer:
      "No. STL Shelf supports STL, 3MF, OBJ, and PLY files in the same private library workflow.",
  },
  {
    id: "keep-multiple-versions",
    question: "How do I keep multiple versions of the same 3D model?",
    answer:
      "Use one stable model record and attach revisions as version history with notes. That keeps earlier iterations traceable without relying on filename chaos.",
  },
  {
    id: "difference-between-folders-and-library",
    question: "What is the difference between folders and a 3D model library?",
    answer:
      "Folders organize storage locations. A 3D model library organizes models, tags, versions, preview, and retrieval context.",
  },
  {
    id: "replace-google-drive",
    question: "Can STL Shelf replace Google Drive for STL file organization?",
    answer:
      "For private library organization, yes. Google Drive remains a general-purpose sync tool, while STL Shelf is designed for archive structure, tags, versions, and preview.",
  },
  {
    id: "is-stl-shelf-open-source",
    question: "Is STL Shelf open source?",
    answer:
      "Yes. STL Shelf is open-source software for managing private 3D printing model libraries.",
  },
  {
    id: "hosted-vs-self-hosted",
    question: "Should I self-host STL Shelf or use the hosted version?",
    answer:
      "Use the hosted version managed by us if you want the workflow with minimal operational work. Self-host when infrastructure control is an actual requirement.",
  },
];
