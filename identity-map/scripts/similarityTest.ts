import { strict as assert } from 'assert';
import {
  weightedJaccard,
  tokenize,
  textJaccard,
  computeSimilarity,
  Identity,
  TagItem,
} from '../lib/similarity';

function nearlyEqual(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps;
}

function testWeightedJaccard() {
  // Identical sets with weights -> 1
  const set1: TagItem[] = [
    { value: 'music', weight: 3 },
    { value: 'sports', weight: 2 },
  ];
  const set2: TagItem[] = [
    { value: 'music', weight: 3 },
    { value: 'sports', weight: 2 },
  ];
  assert.ok(nearlyEqual(weightedJaccard(set1, set2), 1), 'Identical sets should have similarity 1');
  // No overlap -> 0
  const set3: TagItem[] = [{ value: 'art', weight: 1 }];
  assert.ok(nearlyEqual(weightedJaccard(set1, set3), 0), 'No overlap should be 0');
  // Partial overlap with different weights
  const set4: TagItem[] = [
    { value: 'music', weight: 1 },
    { value: 'travel', weight: 2 },
  ];
  // music: min(3,1)=1; max(3,1)=3; sports: max=2; travel: max=2; numerator=1; denominator=7 => ~0.142857
  assert.ok(nearlyEqual(weightedJaccard(set1, set4), 1 / 7), 'Weighted Jaccard with partial overlap');
}

function testTextJaccard() {
  const tokensA = tokenize('Loves hiking and swimming in the ocean');
  const tokensB = tokenize('Hiking is my favorite activity by the sea');
  // tokensA: ['love', 'hik', 'swim', 'ocean']; tokensB: ['hik', 'my', 'favorit', 'activ', 'sea'] (approx)
  const intersect = new Set(tokensA.filter((t) => new Set(tokensB).has(t))).size;
  const union = new Set([...tokensA, ...tokensB]).size;
  assert.ok(nearlyEqual(textJaccard(tokensA, tokensB), intersect / union), 'Text Jaccard computed correctly');
}

function testSymmetry() {
  const identityA: Identity = {
    tags: {
      GIVEN: [
        { value: 'music', weight: 2 },
        { value: 'art', weight: 1 },
      ],
      CHOSEN: [
        { value: 'runner', weight: 3 },
      ],
      CORE: [],
    },
    texts: {
      GIVEN: ['Loves jazz and painting'],
      CHOSEN: ['Runs marathons every year'],
      CORE: [],
    },
  };
  const identityB: Identity = {
    tags: {
      GIVEN: [
        { value: 'music', weight: 1 },
        { value: 'sports', weight: 2 },
      ],
      CHOSEN: [
        { value: 'reader', weight: 2 },
      ],
      CORE: [],
    },
    texts: {
      GIVEN: ['Enjoys music and painting'],
      CHOSEN: ['Reading fiction'],
      CORE: [],
    },
  };
  const resAB = computeSimilarity(identityA, identityB);
  const resBA = computeSimilarity(identityB, identityA);
  assert.ok(nearlyEqual(resAB.scoreOverall, resBA.scoreOverall), 'Overall similarity should be symmetric');
  (['GIVEN', 'CHOSEN', 'CORE'] as const).forEach((lens) => {
    assert.ok(
      nearlyEqual(resAB.scores[lens], resBA.scores[lens]),
      `Lens ${lens} score should be symmetric`
    );
  });
}

function testBounds() {
  // Build random identities to ensure scores are between 0 and 1
  const a: Identity = {
    tags: { GIVEN: [], CHOSEN: [], CORE: [] },
    texts: { GIVEN: [], CHOSEN: [], CORE: [] },
  };
  const b: Identity = {
    tags: { GIVEN: [], CHOSEN: [], CORE: [] },
    texts: { GIVEN: [], CHOSEN: [], CORE: [] },
  };
  const res = computeSimilarity(a, b);
  (['GIVEN', 'CHOSEN', 'CORE'] as const).forEach((lens) => {
    assert.ok(res.scores[lens] >= 0 && res.scores[lens] <= 1, 'Lens score within bounds');
  });
  assert.ok(res.scoreOverall >= 0 && res.scoreOverall <= 1, 'Overall score within bounds');
}

function runTests() {
  testWeightedJaccard();
  testTextJaccard();
  testSymmetry();
  testBounds();
  console.log('All similarity tests passed');
}

runTests();