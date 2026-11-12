/**
 * NLPulse — illustrative tokenizer.
 *
 * ---------------------------------------------------------------------------
 * THIS IS NOT A REAL TOKENIZER.
 *
 * Production language models use learned sub-word vocabularies (BPE,
 * WordPiece, SentencePiece and friends) built by training on a corpus. The
 * boundaries they choose are frequently counter-intuitive: a rare word may
 * split into four pieces while a common phrase stays whole, and the leading
 * space is usually part of the token.
 *
 * What follows is a deterministic heuristic that produces *plausible-looking*
 * boundaries so students can watch text become discrete units. Everywhere it
 * is displayed, the UI labels it "illustrative token boundaries".
 * ---------------------------------------------------------------------------
 */

/** Common English fragments that real sub-word vocabularies tend to isolate. */
const COMMON_SUFFIXES = [
  'ing',
  'tion',
  'sion',
  'ness',
  'ment',
  'able',
  'ible',
  'ance',
  'ence',
  'ive',
  'ual',
  'ous',
  'ify',
  'ize',
  'ise',
  'ed',
  'er',
  'ly',
  's',
]

/** Short, very frequent words that a real vocabulary would keep as one token. */
const WHOLE_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'in', 'on',
  'for', 'and', 'or', 'but', 'it', 'as', 'at', 'by', 'we', 'you', 'they',
  'this', 'that', 'what', 'how', 'why', 'can', 'may', 'not', 'from', 'with',
  'into', 'each', 'then', 'than', 'has', 'have', 'its', 'one', 'more', 'them',
])

/**
 * Split a single word into illustrative sub-word pieces.
 * Short and very common words stay whole; longer words shed a familiar suffix
 * and, if still long, break at a vowel boundary.
 */
function splitWord(word: string): string[] {
  const lower = word.toLowerCase()
  if (word.length <= 4 || WHOLE_WORDS.has(lower)) return [word]

  for (const suffix of COMMON_SUFFIXES) {
    if (lower.length > suffix.length + 3 && lower.endsWith(suffix)) {
      const stem = word.slice(0, word.length - suffix.length)
      const tail = word.slice(word.length - suffix.length)
      return stem.length > 7 ? [...breakLongStem(stem), tail] : [stem, tail]
    }
  }

  return word.length > 7 ? breakLongStem(word) : [word]
}

/** Break a long stem roughly in half, preferring a split just after a vowel. */
function breakLongStem(stem: string): string[] {
  const mid = Math.floor(stem.length / 2)
  for (let offset = 0; offset <= 2; offset += 1) {
    for (const index of [mid + offset, mid - offset]) {
      if (index > 1 && index < stem.length - 1 && /[aeiou]/i.test(stem[index - 1])) {
        return [stem.slice(0, index), stem.slice(index)]
      }
    }
  }
  return [stem.slice(0, mid), stem.slice(mid)]
}

export interface IllustrativeToken {
  /** The token text, including its leading space when it had one. */
  text: string
  /** Display form, with a visible marker for the leading space. */
  display: string
  index: number
}

/**
 * Convert text into illustrative tokens. A leading space is attached to the
 * token that follows it, mirroring how most real BPE vocabularies behave.
 */
export function tokenizeIllustrative(text: string): IllustrativeToken[] {
  const tokens: IllustrativeToken[] = []
  // Capture an optional leading space plus either a word or a single symbol.
  const pattern = /(\s*)([A-Za-z0-9]+|[^\sA-Za-z0-9])/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const [, whitespace, chunk] = match
    const isWord = /^[A-Za-z0-9]+$/.test(chunk)
    const pieces = isWord ? splitWord(chunk) : [chunk]

    pieces.forEach((piece, pieceIndex) => {
      // Only the first piece of a word inherits the preceding whitespace.
      const lead = pieceIndex === 0 && whitespace.length > 0 ? ' ' : ''
      tokens.push({
        text: lead + piece,
        display: lead ? `␣${piece}` : piece,
        index: tokens.length,
      })
    })
  }

  return tokens
}

/** How many illustrative tokens a piece of text produces. */
export function countIllustrativeTokens(text: string): number {
  return tokenizeIllustrative(text).length
}

/**
 * A rough characters-per-token ratio, used to translate a token-count slider
 * into a believable byte size for the request payload.
 */
export const APPROX_CHARS_PER_TOKEN = 4
