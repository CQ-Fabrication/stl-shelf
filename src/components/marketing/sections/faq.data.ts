export type MarketingFaq = {
  id: string;
  question: string;
  answer: string;
};

export const marketingFaqs: MarketingFaq[] = [
  {
    id: "organize-files-without-folder-chaos",
    question: "How do I organize STL, 3MF, and OBJ files without folder chaos?",
    answer:
      "Use STL Shelf as a searchable personal archive with tags, previews, and version history.",
  },
  {
    id: "can-i-self-host-stl-shelf",
    question: "Can I self-host STL Shelf?",
    answer:
      "Yes. Self-hosted deployments require PostgreSQL, S3-compatible storage, Resend, Cloudflare Turnstile, OpenPanel, and Polar. The self-hosted guide documents those prerequisites.",
  },
  {
    id: "does-the-10-model-limit-apply-to-self-hosted",
    question: "Does the 10-model limit apply to self-hosted?",
    answer:
      "No. The 10-model cap applies only to the Cloud Free plan on stl-shelf.com, not to self-hosted deployments.",
  },
  {
    id: "is-stl-shelf-a-marketplace-or-social-platform",
    question: "Is STL Shelf a marketplace or social platform?",
    answer:
      "No. STL Shelf focuses on organizing your own 3D models, not importing, selling, or social sharing.",
  },
];
