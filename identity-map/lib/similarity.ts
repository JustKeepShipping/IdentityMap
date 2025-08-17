/*
 * Similarity computation for Identity Map
 *
 * Implements weighted Jaccard similarity for tag items, unweighted
 * Jaccard for text, and combines them per lens. Also includes
 * utilities to explain overlaps and differences between two
 * participants.
 */

export type Lens = 'GIVEN' | 'CHOSEN' | 'CORE';

export interface TagItem {
  value: string;
  weight: number;
}

export interface Identity {
  tags: Record<Lens, TagItem[]>;
  texts: Record<Lens, string[]>;
}

export interface LensSimilarityResult {
  score: number;
  overlapTags: string[];
  uniqueToA: string[];
  uniqueToB: string[];
  topWeights: string[];
}

export interface SimilarityResult {
  scores: Record<Lens, number>;
  scoreOverall: number;
  explanations: Record<Lens, LensSimilarityResult>;
}

// Basic English stopword list for text Jaccard. This list is not
// exhaustive but covers common filler words.
const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'if',
  'on',
  'in',
  'with',
  'to',
  'for',
  'of',
  'by',
  'is',
  'are',
  'am',
  'be',
  'was',
  'were',
  'this',
  'that',
]);

/**
 * Apply a very simple stemming algorithm to a token. Removes common
 * suffixes such as 'ing', 'ed', and plural 's'. This is not meant
 * to replace full stemming algorithms but helps align obvious
 * variations.
 */
function simpleStem(token: string): string {
  if (token.endsWith('ing') && token.length > 4) {
    return token.slice(0, -3);
  }
  if (token.endsWith('ed') && token.length > 3) {
    return token.slice(0, -2);
  }
  if (token.endsWith('s') && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
}

/**
 * Tokenize free‑form text by lowercasing, removing non‑alphanumeric
 * characters, splitting on whitespace, dropping stopwords, and
 * applying simple stemming. Returns an array of tokens.
 */
export function tokenize(text: string): string[] {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const rawTokens = cleaned.split(/\s+/).filter((t) => t.length > 0);
  const processed = rawTokens
    .filter((t) => !STOP_WORDS.has(t))
    .map((t) => simpleStem(t));
  return processed;
}

/**
 * Compute the weighted Jaccard similarity between two sets of tag
 * items. The `value` property is normalised to lowercase for
 * comparison. Returns 0 if both sets are empty. See spec for formula.
 */
export function weightedJaccard(a: TagItem[], b: TagItem[]): number {
  const mapA = new Map<string, number>();
  const mapB = new Map<string, number>();
  for (const item of a) {
    const key = item.value.trim().toLowerCase();
    // If duplicate tag appears, keep the max weight
    mapA.set(key, Math.max(mapA.get(key) ?? 0, item.weight));
  }
  for (const item of b) {
    const key = item.value.trim().toLowerCase();
    mapB.set(key, Math.max(mapB.get(key) ?? 0, item.weight));
  }
  const allKeys = new Set<string>([...mapA.keys(), ...mapB.keys()]);
  if (allKeys.size === 0) return 0;
  let numerator = 0;
  let denominator = 0;
  for (const key of allKeys) {
    const wA = mapA.get(key) ?? 0;
    const wB = mapB.get(key) ?? 0;
    numerator += Math.min(wA, wB);
    denominator += Math.max(wA, wB);
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Compute the unweighted Jaccard similarity between two lists of
 * token arrays. The input arrays should already be tokenized and
 * stemmed. Returns 0 if both sets are empty.
 */
export function textJaccard(aTokens: string[], bTokens: string[]): number {
  const setA = new Set(aTokens);
  const setB = new Set(bTokens);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const unionSize = new Set([...setA, ...setB]).size;
  return unionSize === 0 ? 0 : intersection / unionSize;
}

/**
 * Compute the per‑lens similarity score combining weighted Jaccard
 * (tags) and text Jaccard (texts) according to the formula:
 * S_L = 0.7 * J_w + 0.3 * textJaccard.
 */
function computeLensSimilarity(a: TagItem[], aTexts: string[], b: TagItem[], bTexts: string[]): number {
  const jw = weightedJaccard(a, b);
  const tj = textJaccard(aTexts, bTexts);
  return 0.7 * jw + 0.3 * tj;
}

/**
 * Build an explanation object for a lens. It lists overlapping tags,
 * tags unique to each participant, and tags with the highest weights
 * across both participants (topWeights). Tag values are returned
 * lowercased and deduplicated.
 */
function explainLens(a: TagItem[], b: TagItem[]): {
  overlap: string[];
  uniqueA: string[];
  uniqueB: string[];
  topWeights: string[];
} {
  const mapA = new Map<string, number>();
  const mapB = new Map<string, number>();
  for (const item of a) {
    const key = item.value.trim().toLowerCase();
    mapA.set(key, Math.max(mapA.get(key) ?? 0, item.weight));
  }
  for (const item of b) {
    const key = item.value.trim().toLowerCase();
    mapB.set(key, Math.max(mapB.get(key) ?? 0, item.weight));
  }
  const allKeys = new Set<string>([...mapA.keys(), ...mapB.keys()]);
  const overlap: string[] = [];
  const uniqueA: string[] = [];
  const uniqueB: string[] = [];
  const weightMap = new Map<string, number>();
  for (const key of allKeys) {
    const wA = mapA.get(key) ?? 0;
    const wB = mapB.get(key) ?? 0;
    if (wA > 0 && wB > 0) overlap.push(key);
    else if (wA > 0) uniqueA.push(key);
    else uniqueB.push(key);
    weightMap.set(key, Math.max(wA, wB));
  }
  // Determine top weighted tags (max 3) by descending weight
  const topWeights = Array.from(weightMap.entries())
    .sort(([, w1], [, w2]) => w2 - w1)
    .slice(0, 3)
    .map(([k]) => k);
  return { overlap, uniqueA, uniqueB, topWeights };
}

/**
 * Compute similarity across all three lenses and an overall score.
 * Returns scores per lens, the aggregated overall score, and
 * explanations containing overlapping/unique tags and top weights.
 */
export function computeSimilarity(a: Identity, b: Identity): SimilarityResult {
  const scores: Record<Lens, number> = { GIVEN: 0, CHOSEN: 0, CORE: 0 } as Record<Lens, number>;
  const explanations: Record<Lens, LensSimilarityResult> = {
    GIVEN: { score: 0, overlapTags: [], uniqueToA: [], uniqueToB: [], topWeights: [] },
    CHOSEN: { score: 0, overlapTags: [], uniqueToA: [], uniqueToB: [], topWeights: [] },
    CORE: { score: 0, overlapTags: [], uniqueToA: [], uniqueToB: [], topWeights: [] },
  };
  const lensWeights: Record<Lens, number> = { GIVEN: 0.8, CHOSEN: 1.0, CORE: 1.2 };
  let weightedSum = 0;
  let weightTotal = 0;
  (['GIVEN', 'CHOSEN', 'CORE'] as Lens[]).forEach((lens) => {
    const aTags = a.tags[lens] ?? [];
    const bTags = b.tags[lens] ?? [];
    const aTexts = (a.texts[lens] ?? []).flatMap((t) => tokenize(t));
    const bTexts = (b.texts[lens] ?? []).flatMap((t) => tokenize(t));
    const score = computeLensSimilarity(aTags, aTexts, bTags, bTexts);
    scores[lens] = score;
    // Explanation: only for tags currently
    const exp = explainLens(aTags, bTags);
    explanations[lens] = {
      score,
      overlapTags: exp.overlap,
      uniqueToA: exp.uniqueA,
      uniqueToB: exp.uniqueB,
      topWeights: exp.topWeights,
    };
    weightedSum += score * lensWeights[lens];
    weightTotal += lensWeights[lens];
  });
  const scoreOverall = weightTotal === 0 ? 0 : weightedSum / weightTotal;
  return { scores, scoreOverall, explanations };
}