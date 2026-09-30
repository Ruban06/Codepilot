// Maximum number of text files fetched
const MAX_FILES = 500
// Maximum characters read from a single file
const MAX_FILE_CHARS = 100_000

// Extensions we skip (binary / generated / vendor)
const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.pdf', '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.mp3', '.mp4', '.wav', '.ogg', '.mov', '.avi', '.mkv',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.lock', '.map',
])

// Directories we skip
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', '.turbo', 'dist', 'build',
  'out', 'coverage', '__pycache__', '.venv', 'venv',
  '.idea', '.vscode',
])

interface GitHubTreeItem {
  path: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
  url: string
}

interface GitHubTreeResponse {
  tree: GitHubTreeItem[]
  truncated: boolean
}

function shouldSkip(filePath: string): boolean {
  const parts = filePath.split('/')

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

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Fetch all text files from a public (or token-accessible) GitHub repository.
 * Returns a map of { filePath → fileContent }.
 */
export async function fetchGitHubRepo(
  owner: string,
  repo: string
): Promise<Record<string, string>> {
  const headers = buildHeaders()

  // 1. Resolve the default branch
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers })
  if (!repoRes.ok) {
    throw new Error(`GitHub API error fetching repo metadata: ${repoRes.status} ${repoRes.statusText}`)
  }
  const repoData = await repoRes.json() as { default_branch: string }
  const branch = repoData.default_branch

  // 2. Fetch the full recursive tree for the default branch
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers }
  )
  if (!treeRes.ok) {
    throw new Error(`GitHub API error fetching tree: ${treeRes.status} ${treeRes.statusText}`)
  }
  const treeData = await treeRes.json() as GitHubTreeResponse

  // 3. Filter to text blobs within limits
  const blobs = treeData.tree.filter(
    (item) =>
      item.type === 'blob' &&
      !shouldSkip(item.path) &&
      // Skip files >500 KB at the tree level (size is in bytes)
      (item.size === undefined || item.size <= 500_000)
  )

  // 4. Fetch file contents (cap at MAX_FILES)
  const files: Record<string, string> = {}
  let count = 0

  for (const blob of blobs) {
    if (count >= MAX_FILES) break

    try {
      const contentRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${blob.path}`,
        { headers }
      )
      if (!contentRes.ok) continue

      const contentData = await contentRes.json() as {
        encoding: string
        content: string
      }

      if (contentData.encoding !== 'base64') continue

      // Decode base64 → utf-8
      const decoded = Buffer.from(
        contentData.content.replace(/\n/g, ''),
        'base64'
      ).toString('utf-8')

      // Skip files that look binary after decode (contain null bytes)
      if (decoded.includes('\u0000')) continue

      files[blob.path] = decoded.slice(0, MAX_FILE_CHARS)
      count++
    } catch {
      // Skip any individual file that fails — don't abort the whole ingestion
      continue
    }
  }

  return files
}
