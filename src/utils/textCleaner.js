export function cleanPDFText(rawText) {
  let text = rawText
  // Remove "Page X of Y" patterns
  text = text.replace(/page\s+\d+\s+(of|\/)\s+\d+/gi, '')
  // Remove standalone numbers at line boundaries (page numbers)
  text = text.replace(/^\s*\d{1,4}\s*$/gm, '')
  // Remove common header/footer markers
  text = text.replace(/^(chapter|section)\s+\d+/gim, '')
  // Remove repeated dashes or underscores (separators)
  text = text.replace(/[-_]{5,}/g, '')
  // Collapse excessive whitespace
  text = text.replace(/\s{3,}/g, ' ')
  // Collapse multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}
