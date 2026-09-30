import JSZip from 'jszip'

// Maximum number of text files extracted
const MAX_FILES = 500
// Maximum characters read from a single file
const MAX_FILE_CHARS = 100_000

// Extensions we skip entirely (binary / generated / vendor)
const SKIP_EXTENSIONS = new Set([
  // binary / media
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.pdf', '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.mp3', '.mp4', '.wav', '.ogg', '.mov', '.avi', '.mkv',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  // lock files / generated
  '.lock', '.map',
])

// Directories we skip
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', '.turbo', 'dist', 'build',
  'out', 'coverage', '.cache', '__pycache__', '.venv', 'venv',
  '.idea', '.vscode',
])

function isBinary(buffer: Uint8Array): boolean {
  // Sniff the first 8 KB for null bytes — reliable binary detector
  const sample = buffer.slice(0, 8_192)
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return true
  }
  return false
}

function shouldSkip(filePath: string): boolean {
  const parts = filePath.split('/')

  // Skip any file inside a skipped directory
  for (const part of parts.slice(0, -1)) {
    if (SKIP_DIRS.has(part)) return true
  }

  const filename = parts[parts.length - 1]
  const dotIdx = filename.lastIndexOf('.')
  if (dotIdx !== -1) {
    const ext = filename.slice(dotIdx).toLowerCase()
    if (SKIP_EXTENSIONS.has(ext)) return true
  }

  return false
}

/**
 * Extract text files from a ZIP ArrayBuffer.
 * Returns a map of { relativePath → fileContent }.
 */
export async function extractZip(
  buffer: ArrayBuffer
): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(buffer)
  const files: Record<string, string> = {}
  let count = 0

  // Collect file entries (not directories)
  const entries = Object.values(zip.files).filter((f) => !f.dir)

  for (const entry of entries) {
    if (count >= MAX_FILES) break

    // Normalise path — strip leading component if the ZIP has a single root dir
    let path = entry.name
    if (shouldSkip(path)) continue

    // Read as binary first to detect non-text files
    const raw = await entry.async('uint8array')
    if (isBinary(raw)) continue

    // Decode as UTF-8
    const text = new TextDecoder('utf-8', { fatal: false }).decode(raw)
    files[path] = text.slice(0, MAX_FILE_CHARS)
    count++
  }

  return files
}
