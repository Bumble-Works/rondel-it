// Writes latest.json, the static manifest installed apps read through
// releases/latest/download/latest.json to find and verify an update (Tauri v2 updater).
// Usage: node scripts/updater-manifest.mjs VERSION OWNER/REPO ASSET_DIRECTORY
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// The universal Mac app serves both Mac architectures.
export const PLATFORM_ASSETS = {
  'darwin-aarch64': 'RondelIt-macos.app.tar.gz',
  'darwin-x86_64': 'RondelIt-macos.app.tar.gz',
  'windows-x86_64': 'RondelIt-windows-setup.exe',
}

function readSignature(directory, asset) {
  const path = join(directory, `${asset}.sig`)
  if (!existsSync(join(directory, asset))) throw new Error(`Missing release asset: ${asset}`)
  const signature = existsSync(path) ? readFileSync(path, 'utf8').trim() : ''
  if (!signature) throw new Error(`Missing or empty updater signature: ${asset}.sig`)
  return signature
}

export function createManifest({ version, repository, directory, pubDate = new Date() }) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Expected an x.y.z version, got "${version}"`)
  const download = `https://github.com/${repository}/releases/download/v${version}`
  return {
    version,
    notes: `See what's new: https://github.com/${repository}/releases/tag/v${version}`,
    pub_date: pubDate.toISOString(),
    platforms: Object.fromEntries(Object.entries(PLATFORM_ASSETS).map(([platform, asset]) => [
      platform,
      { signature: readSignature(directory, asset), url: `${download}/${asset}` },
    ])),
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [version, repository, directory] = process.argv.slice(2)
  try {
    if (!directory) throw new Error('Usage: updater-manifest.mjs VERSION OWNER/REPO ASSET_DIRECTORY')
    const manifest = createManifest({ version, repository, directory })
    writeFileSync(join(directory, 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    console.log(`Wrote latest.json for ${version}: ${Object.keys(manifest.platforms).join(', ')}`)
  } catch (error) {
    console.error(`Could not write the updater manifest: ${error.message}`)
    process.exitCode = 1
  }
}
