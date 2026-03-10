type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonLdValue | undefined }
  | JsonLdValue[];

type JsonLdObject = { [key: string]: JsonLdValue | undefined };

export function createJsonLdHeadScript(jsonLd: JsonLdObject) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(jsonLd),
  };
}
