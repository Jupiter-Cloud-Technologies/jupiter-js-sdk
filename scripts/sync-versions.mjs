import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const packagesDir = path.join(rootDir, 'packages')
const checkOnly = process.argv.includes('--check')

const packageDirs = readdirSync(packagesDir, {
  withFileTypes: true
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(packagesDir, entry.name))
  .filter((packageDir) => existsSync(path.join(packageDir, 'package.json')))

const staleFiles = []

for (const packageDir of packageDirs) {
  const packageJsonPath = path.join(packageDir, 'package.json')
  const sourceDir = path.join(packageDir, 'src')
  const versionPath = path.join(sourceDir, 'version.ts')

  if (!existsSync(sourceDir)) {
    continue
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const content = `export const VERSION = '${packageJson.version}'\n`
  const currentContent = existsSync(versionPath) ? readFileSync(versionPath, 'utf8') : undefined

  if (currentContent === content) {
    continue
  }

  if (checkOnly) {
    staleFiles.push(path.relative(rootDir, versionPath))
  } else {
    writeFileSync(versionPath, content)
  }
}

if (staleFiles.length > 0) {
  console.error(`Version files are stale:\n${staleFiles.map((file) => `- ${file}`).join('\n')}`)
  process.exit(1)
}
