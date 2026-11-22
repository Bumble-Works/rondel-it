// Run with: node --test scripts/updater-manifest.test.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, test } from 'node:test'
import { createManifest, PLATFORM_ASSETS } from './updater-manifest.mjs'

const version = '1.2.3'
const repository = 'Bumble-Works/rondel-it'
const mac = 'RondelIt-macos.app.tar.gz'
const windows = 'RondelIt-windows-setup.exe'
const signatures = { [mac]: 'bWFjIHNpZ25hdHVyZQ==', [windows]: 'd2luZG93cyBzaWduYXR1cmU=' }
const pubDate = new Date('2026-11-22T12:00:00Z')
const cli = fileURLToPath(new URL('./updater-manifest.mjs', import.meta.url))
let directory

const write = (name, content) => writeFileSync(join(directory, name), content)
const generate = () => createManifest({ version, repository, directory, pubDate })

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'updater-manifest-'))
  for (const [asset, signature] of Object.entries(signatures)) {
    write(asset, 'artifact')
    write(`${asset}.sig`, `${signature}\n`)
  }
})
afterEach(() => rmSync(directory, { recursive: true, force: true }))

test('lists every Mac and Windows platform with its versioned release URL', () => {
  const manifest = generate()
  assert.deepEqual(Object.keys(manifest.platforms), Object.keys(PLATFORM_ASSETS))
  assert.deepEqual(Object.keys(manifest.platforms), ['darwin-aarch64', 'darwin-x86_64', 'windows-x86_64'])
  for (const [platform, asset] of Object.entries(PLATFORM_ASSETS)) {
    assert.equal(manifest.platforms[platform].url, `https://github.com/${repository}/releases/download/v${version}/${asset}`)
  }
  assert.equal(manifest.version, version)
  assert.equal(manifest.pub_date, '2026-11-22T12:00:00.000Z')
  assert.match(manifest.notes, /releases\/tag\/v1\.2\.3$/)
})

test('copies each signature verbatim from its .sig file', () => {
  const { platforms } = generate()
  assert.equal(platforms['darwin-aarch64'].signature, signatures[mac])
  assert.equal(platforms['darwin-x86_64'].signature, signatures[mac])
  assert.equal(platforms['windows-x86_64'].signature, signatures[windows])
})

for (const asset of [mac, windows]) {
  test(`fails when ${asset}.sig is missing`, () => {
    rmSync(join(directory, `${asset}.sig`))
    assert.throws(generate, new RegExp(`${asset}\\.sig`))
  })
  test(`fails when ${asset}.sig is empty`, () => {
    write(`${asset}.sig`, '\n')
    assert.throws(generate, new RegExp(`${asset}\\.sig`))
  })
  test(`fails when ${asset} itself is missing`, () => {
    rmSync(join(directory, asset))
    assert.throws(generate, /Missing release asset/)
  })
}

test('rejects a version that is not x.y.z', () => {
  assert.throws(() => createManifest({ version: 'v1.2.3', repository, directory }), /x\.y\.z/)
})

test('CLI writes latest.json next to the assets', () => {
  const result = spawnSync(process.execPath, [cli, version, repository, directory], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const manifest = JSON.parse(readFileSync(join(directory, 'latest.json'), 'utf8'))
  assert.equal(manifest.platforms['windows-x86_64'].signature, signatures[windows])
})

test('CLI fails without writing latest.json when a signature is missing', () => {
  rmSync(join(directory, `${windows}.sig`))
  const result = spawnSync(process.execPath, [cli, version, repository, directory], { encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Could not write the updater manifest/)
  assert.equal(existsSync(join(directory, 'latest.json')), false)
})
