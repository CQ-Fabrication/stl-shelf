export type TestimonialAccent = "orange" | "amber" | "slate";

export type TestimonialItem = {
  id: string;
  quote: string;
  author: string;
  role: string;
  initials: string;
  accent: TestimonialAccent;
};

export const testimonials = [
  {
    id: "benchy-unsettled",
    quote: "The benchy was exactly where you said it was. I'm unsettled.",
    author: "Siri",
    role: "Slightly Less Confused",
    initials: "SI",
    accent: "orange",
  },
  {
    id: "naming-morale",
    quote: "We stopped naming files 'new_new_new' and morale improved.",
    author: "Print Farm Ops",
    role: "Unreasonably Calm",
    initials: "PF",
    accent: "amber",
  },
  {
    id: "no-more-zips",
    quote: "Please stop emailing me giant zips.",
    author: "IT Support",
    role: "Still Traumatized",
    initials: "IT",
    accent: "slate",
  },
  {
    id: "no-sharing-privacy",
    quote: "No sharing? Finally, a product that respects my privacy.",
    author: "Legal",
    role: "Mildly Impressed",
    initials: "LE",
    accent: "slate",
  },
  {
    id: "downloads-shelf",
    quote: "I used to live in Downloads. Now I have a shelf.",
    author: "Downloads Folder",
    role: "Reformed",
    initials: "DF",
    accent: "amber",
  },
  {
    id: "preview-fast",
    quote: "3D preview opened before I remembered why I clicked.",
    author: "Your Brain",
    role: "Easily Distracted",
    initials: "YB",
    accent: "orange",
  },
  {
    id: "tags-versions-notes",
    quote: "Tags. Versions. Notes. This is dangerously close to having a process.",
    author: "Makerspace",
    role: "Accidentally Professional",
    initials: "MK",
    accent: "slate",
  },
  {
    id: "docker-break-it",
    quote:
      "Self-hostable with Docker Compose. I can break it on my own hardware, like God intended.",
    author: "DevOps",
    role: "Proudly Unsupported",
    initials: "DO",
    accent: "orange",
  },
] as const satisfies readonly TestimonialItem[];
