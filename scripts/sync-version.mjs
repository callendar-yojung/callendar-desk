import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())

const getLatestTag = () => {
  try {
    const tag = execSync('git describe --tags --abbrev=0', {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
    return tag
  } catch {
    return null
  }
}

const tag = getLatestTag()
if (!tag) {
  console.error('❌ No git tag found. Create a tag like v0.1.1 before build.')
  process.exit(1)
}

const version = tag.startsWith('v') ? tag.slice(1) : tag
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`❌ Invalid version tag: ${tag}`)
  process.exit(1)
}

const updateJsonVersion = (filePath) => {
  const data = JSON.parse(readFileSync(filePath, 'utf8'))
  data.version = version
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

const updateCargoToml = (filePath) => {
  const content = readFileSync(filePath, 'utf8')
  const updated = content.replace(
    /version\s*=\s*"[^"]+"/, 
    `version = "${version}"`
  )
  if (updated === content) {
    console.error(`❌ Failed to update version in ${filePath}`)
    process.exit(1)
  }
  writeFileSync(filePath, updated, 'utf8')
}

try {
  updateJsonVersion(resolve(root, 'package.json'))
  updateJsonVersion(resolve(root, 'src-tauri', 'tauri.conf.json'))
  updateCargoToml(resolve(root, 'src-tauri', 'Cargo.toml'))
  console.log(`✅ Synced version to ${version} (from tag ${tag})`)
} catch (err) {
  console.error('❌ Failed to sync versions:', err)
  process.exit(1)
}
