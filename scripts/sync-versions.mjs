import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const packagesDir = path.join(rootDir, 'packages')
const rootPackageJsonPath = path.join(rootDir, 'package.json')
const rootChangelogPath = path.join(rootDir, 'CHANGELOG.md')
const checkOnly = process.argv.includes('--check')

const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'))

const packageDirs = readdirSync(packagesDir, {
  withFileTypes: true
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(packagesDir, entry.name))
  .filter((packageDir) => existsSync(path.join(packageDir, 'package.json')))
  .sort((a, b) => a.localeCompare(b))

const staleFiles = []

const writeSyncedFile = (filePath, content) => {
  const currentContent = existsSync(filePath) ? readFileSync(filePath, 'utf8') : undefined

  if (currentContent === content) {
    return
  }

  if (checkOnly) {
    staleFiles.push(path.relative(rootDir, filePath))
  } else {
    writeFileSync(filePath, content)
  }
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getVersionSectionBody = (changelog, version) => {
  const pattern = new RegExp(`(?:^|\\n)## ${escapeRegExp(version)}\\n([\\s\\S]*?)(?=\\n## |$)`)
  const match = changelog.match(pattern)

  return match ? match[1].trim() : undefined
}

const removeVersionSection = (changelog, version) => {
  const pattern = new RegExp(`\\n## ${escapeRegExp(version)}\\n[\\s\\S]*?(?=\\n## |$)`)

  return changelog.replace(pattern, '').trimEnd()
}

const demoteChangelogHeadings = (content) => content.replace(/^(#{3,6}) /gm, '#$1 ')

const syncPackageChangelogTitle = (packageDir, packageJson) => {
  const changelogPath = path.join(packageDir, 'CHANGELOG.md')

  if (!existsSync(changelogPath)) {
    return
  }

  const changelog = readFileSync(changelogPath, 'utf8')
  const expectedTitle = `# ${packageJson.name}`
  const nextChangelog = changelog.startsWith('# ')
    ? changelog.replace(/^# .*/, expectedTitle)
    : `${expectedTitle}\n\n${changelog}`

  writeSyncedFile(changelogPath, nextChangelog)
}

for (const packageDir of packageDirs) {
  const packageJsonPath = path.join(packageDir, 'package.json')
  const sourceDir = path.join(packageDir, 'src')
  const versionPath = path.join(sourceDir, 'version.ts')
  const packageJson = readJson(packageJsonPath)

  syncPackageChangelogTitle(packageDir, packageJson)

  if (!existsSync(sourceDir)) {
    continue
  }

  const content = `export const VERSION = '${packageJson.version}'\n`
  writeSyncedFile(versionPath, content)
}

const rootPackageJson = readJson(rootPackageJsonPath)
const sdkPackages = packageDirs
  .map((packageDir) => ({
    dir: packageDir,
    packageJson: readJson(path.join(packageDir, 'package.json'))
  }))
  .filter(({ packageJson }) => packageJson.name.startsWith('@jupiter-cloud/'))
  .sort((a, b) => a.packageJson.name.localeCompare(b.packageJson.name))

const buildRootChangelog = () => {
  const currentChangelog = existsSync(rootChangelogPath)
    ? readFileSync(rootChangelogPath, 'utf8')
    : `# ${rootPackageJson.name}\n`

  const title = currentChangelog.startsWith('# ')
    ? currentChangelog.split('\n', 1)[0]
    : `# ${rootPackageJson.name}`
  const history = removeVersionSection(currentChangelog, rootPackageJson.version)
    .replace(/^# .*\n*/, '')
    .trim()

  const packageSections = []

  for (const { dir, packageJson } of sdkPackages) {
    const changelogPath = path.join(dir, 'CHANGELOG.md')

    if (packageJson.version !== rootPackageJson.version) {
      staleFiles.push(path.relative(rootDir, path.join(dir, 'package.json')))
      continue
    }

    if (!existsSync(changelogPath)) {
      staleFiles.push(path.relative(rootDir, changelogPath))
      continue
    }

    const packageChangelog = readFileSync(changelogPath, 'utf8')
    const packageSectionBody = getVersionSectionBody(packageChangelog, rootPackageJson.version)

    if (packageSectionBody === undefined) {
      staleFiles.push(`${path.relative(rootDir, changelogPath)}#${rootPackageJson.version}`)
      continue
    }

    if (packageSectionBody === '') {
      continue
    }

    packageSections.push(
      `### ${packageJson.name}\n\n${demoteChangelogHeadings(packageSectionBody)}`
    )
  }

  const currentVersionSection = [`## ${rootPackageJson.version}`, ...packageSections].join('\n\n')
  const nextChangelog = `${title}\n\n${currentVersionSection}${history ? `\n\n${history}` : ''}\n`

  return nextChangelog
}

writeSyncedFile(rootChangelogPath, buildRootChangelog())

if (staleFiles.length > 0) {
  console.error(`Version files are stale:\n${staleFiles.map((file) => `- ${file}`).join('\n')}`)
  process.exit(1)
}
