export type TagDiff = {
  added: string[];
  removed: string[];
};

// Diffs two tag-name selections into the tags added and removed. Order-independent.
export function diffTags(oldTags: string[], newTags: string[]): TagDiff {
  const oldSet = new Set(oldTags);
  const newSet = new Set(newTags);

  return {
    added: newTags.filter((tag) => !oldSet.has(tag)),
    removed: oldTags.filter((tag) => !newSet.has(tag)),
  };
}
