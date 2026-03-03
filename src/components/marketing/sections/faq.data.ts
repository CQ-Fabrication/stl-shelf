export type MarketingFaq = {
  question: string;
  answer: string;
  href: string;
  cta: string;
};

export const marketingFaqs: MarketingFaq[] = [
  {
    question: "How do I organize STL, 3MF, and OBJ files without folder chaos?",
    answer:
      "Use STL Shelf as a searchable personal archive with tags, previews, and version history.",
    href: "/organize-stl-files",
    cta: "Read the organize guide",
  },
  {
    question: "Can I self-host STL Shelf with Docker?",
    answer:
      "Yes. STL Shelf can run in your own infrastructure with PostgreSQL and Docker for full data control.",
    href: "/self-hosted-3d-model-library",
    cta: "Read the self-hosted guide",
  },
  {
    question: "Should I choose cloud or self-hosted setup?",
    answer:
      "You can start in the cloud for speed or deploy self-hosted for maximum ownership and internal workflows.",
    href: "/pricing",
    cta: "Compare plans and setups",
  },
  {
    question: "Does the 10-model limit apply to self-hosted?",
    answer:
      "No. The 10-model cap applies only to the Cloud Free plan on stl-shelf.com, not to self-hosted deployments.",
    href: "/pricing",
    cta: "See cloud plan limits",
  },
  {
    question: "Is STL Shelf a marketplace or social platform?",
    answer:
      "No. STL Shelf focuses on organizing your own 3D models, not importing, selling, or social sharing.",
    href: "/organize-stl-files",
    cta: "See how the library works",
  },
];
