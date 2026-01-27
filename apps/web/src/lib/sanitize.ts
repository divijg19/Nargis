// Minimal, dependency-free sanitizer for user/AI provided text.
// This does not attempt to be an HTML sanitizer (we do not render HTML),
// instead it normalizes and strips problematic control characters and
// enforces a maximum length to avoid UI/DOM blowups from huge model outputs.
export function sanitizeText(
  input: unknown,
  maxLen = 20000,
  // When true, remove JSON punctuation (braces, brackets, quotes) from
  // outputs that were derived from raw model objects so the UI doesn't
  // display raw JSON-like blobs to end users.
  stripJson = false,
): string {
  if (input === null || input === undefined) return "";
  let s = String(input);
  // Remove NULL bytes and most ASCII control chars except tab/newline/carriage return
  // Use a character-by-character filter to avoid embedding control sequences in a regex literal.
  s = Array.from(s)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      // allow tab(9), LF(10), CR(13)
      if (code === 9 || code === 10 || code === 13) return true;
      // printable ASCII and above (except DEL 127)
      if (code >= 32 && code !== 127) return true;
      return false;
    })
    .join("");
  // Normalize unusual whitespace sequences to single spaces, but keep newlines
  s = s.replace(/[\t\f\v\u00A0]+/g, " ");
  // Trim long runs of spaces
  s = s.replace(/ {2,}/g, " ");
  // Trim very long outputs to a safe max and annotate truncation
  if (s.length > maxLen) {
    s = `${s.slice(0, maxLen)}\n\n[output truncated]`;
  }
  // As a final safety, strip any lone surrogate halves
  s = s.replace(
    /(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF])/g,
    "",
  );
  // Optionally remove common JSON punctuation to avoid rendering raw
  // model objects (e.g. '{', '}', '"choices"') directly in the UI.
  if (stripJson) {
    s = s.replace(/["{}[\]]/g, "");
  }
  return s;
}
