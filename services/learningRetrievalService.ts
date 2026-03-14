import { GroundingSource } from '../types';
import { misconceptionDataset, MisconceptionEntry } from '../data/misconceptionDataset';

export interface RetrievalResult {
  matchedEntries: MisconceptionEntry[];
  contextBlock: string;
  sources: GroundingSource[];
}

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const buildEntryText = (entry: MisconceptionEntry): string =>
  [entry.topic, entry.misconception, entry.whyItHappens, entry.diagnosticQuestion, entry.remediation, ...entry.keywords]
    .join(' ')
    .toLowerCase();

export const retrieveLearningEvidence = (query: string, maxEntries: number = 2): RetrievalResult => {
  const queryTokens = new Set(tokenize(query));

  const scored = misconceptionDataset
    .map((entry) => {
      const entryText = buildEntryText(entry);
      let score = 0;
      for (const token of queryTokens) {
        if (entryText.includes(token)) score += 1;
      }
      return { entry, score };
    })
    .sort((a, b) => b.score - a.score);

  const matchedEntries = scored
    .filter((item) => item.score > 0)
    .slice(0, maxEntries)
    .map((item) => item.entry);

  const fallback = matchedEntries.length > 0 ? matchedEntries : misconceptionDataset.slice(0, 1);

  const contextBlock = fallback
    .map(
      (entry) =>
        [
          `Topic: ${entry.topic}`,
          `Common Misconception: ${entry.misconception}`,
          `Why Learners Get Stuck: ${entry.whyItHappens}`,
          `Diagnostic Question: ${entry.diagnosticQuestion}`,
          `Targeted Remediation: ${entry.remediation}`
        ].join('\n')
    )
    .join('\n\n');

  const uniqueSources = Array.from(
    new Map(
      fallback
        .flatMap((entry) => entry.sources)
        .map((source) => [source.uri, source])
    ).values()
  );

  return {
    matchedEntries: fallback,
    contextBlock,
    sources: uniqueSources
  };
};
