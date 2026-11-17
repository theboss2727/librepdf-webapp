/**
 * Lightweight LCS Word & Line Diff Engine
 * 100% Client-Side for PDF Comparison
 */

export interface DiffToken {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export interface ComparisonResult {
  docAName: string;
  docBName: string;
  docAPages: number;
  docBPages: number;
  docASize: number;
  docBSize: number;
  isIdentical: boolean;
  totalWordsA: number;
  totalWordsB: number;
  addedCount: number;
  removedCount: number;
  pagesComparison: {
    pageNumber: number;
    tokens: DiffToken[];
    hasChanges: boolean;
    textA: string;
    textB: string;
  }[];
}

/**
 * Tokenize string into words preserving whitespace/punctuation
 */
function tokenizeWords(text: string): string[] {
  if (!text) return [];
  // Match words or sequences of whitespace/newlines
  return text.match(/\S+|\s+/g) || [];
}

/**
 * Computes Longest Common Subsequence (LCS) matrix
 */
export function computeWordDiff(textA: string, textB: string): DiffToken[] {
  const tokensA = tokenizeWords(textA);
  const tokensB = tokenizeWords(textB);

  const n = tokensA.length;
  const m = tokensB.length;

  // Optimize for exact matches
  if (textA === textB) {
    return [{ type: 'unchanged', value: textA }];
  }

  // Cap max tokens to prevent huge matrix computation on massive 500-page dumps
  const maxTokens = 2500;
  const subA = tokensA.slice(0, maxTokens);
  const subB = tokensB.slice(0, maxTokens);

  const dp: number[][] = Array.from({ length: subA.length + 1 }, () =>
    new Uint16Array(subB.length + 1) as unknown as number[]
  );

  for (let i = 0; i < subA.length; i++) {
    for (let j = 0; j < subB.length; j++) {
      if (subA[i] === subB[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: DiffToken[] = [];
  let i = subA.length;
  let j = subB.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && subA[i - 1] === subB[j - 1]) {
      result.unshift({ type: 'unchanged', value: subA[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', value: subB[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ type: 'removed', value: subA[i - 1] });
      i--;
    }
  }

  if (tokensA.length > maxTokens || tokensB.length > maxTokens) {
    result.push({
      type: 'unchanged',
      value: '\n... [Confronto troncato: pagina con densità di testo eccezionale]',
    });
  }

  // Merge adjacent tokens of the same type for performance & rendering
  const merged: DiffToken[] = [];
  for (const tok of result) {
    if (merged.length > 0 && merged[merged.length - 1].type === tok.type) {
      merged[merged.length - 1].value += tok.value;
    } else {
      merged.push({ ...tok });
    }
  }

  return merged;
}
