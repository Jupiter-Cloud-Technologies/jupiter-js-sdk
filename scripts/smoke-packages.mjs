import { createRequire } from 'node:module'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const rootDir = process.cwd()
const packagesDir = path.join(rootDir, 'packages')

const packageDirs = readdirSync(packagesDir, {
  withFileTypes: true
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(packagesDir, entry.name))
  .filter((packageDir) => existsSync(path.join(packageDir, 'package.json')))

for (const packageDir of packageDirs) {
  const packageJson = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8'))
  const esmPath = path.join(packageDir, 'dist', 'index.js')
  const cjsPath = path.join(packageDir, 'dist', 'index.cjs')

  if (!existsSync(esmPath) || !existsSync(cjsPath)) {
    throw new Error(`${packageJson.name} must be built before smoke checks run.`)
  }

  const esmModule = await import(pathToFileURL(esmPath).href)
  const cjsModule = require(cjsPath)

  if (esmModule.VERSION !== packageJson.version) {
    throw new Error(`${packageJson.name} ESM VERSION does not match package.json.`)
  }

  if (cjsModule.VERSION !== packageJson.version) {
    throw new Error(`${packageJson.name} CJS VERSION does not match package.json.`)
  }
}
