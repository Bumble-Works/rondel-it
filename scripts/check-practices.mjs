// Enforces the mechanical parts of PRACTICES.md in CI (`npm run check:practices`).
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'src'
const MAX_COMPONENT_LINES = 250
// Known exceptions, with the limit they must not grow past. Shrink, then remove.
const LINE_LIMIT_EXCEPTIONS = {
  'src/App.tsx': 900, // to be split into per-feature hooks (Plan1.md)
}
// Components with no visual styles of their own (they take a className).
const NO_STYLESHEET_NEEDED = new Set([
  'src/main.tsx',
  'src/shared/ui/Icon.tsx',
  'src/shared/ui/InlineEditInput.tsx',
  'src/features/settings/TagColorInput.tsx',
  'src/features/task/TaskTitleField.tsx', // styled by TaskDetailPanel.css (.detail-title)
  'src/features/reminders/ReminderModal.tsx', // a Modal around ReminderList
])
const DUPLICATE_BLOCK_LINES = 20

const isTest = (file) => /\.test\.tsx?$/.test(file)

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

function lineCount(file) {
  const text = readFileSync(file, 'utf8')
  return text === '' ? 0 : text.split('\n').length
}

/** "One stylesheet per component": Foo.tsx comes with Foo.css. */
function checkStylesheets(components, failures) {
  for (const file of components) {
    if (NO_STYLESHEET_NEEDED.has(file)) continue
    if (!existsSync(file.replace(/\.tsx$/, '.css'))) failures.push(`Missing stylesheet for component: ${file}`)
  }
}

/** "Short functions and files". */
function checkFileSizes(components, failures) {
  for (const file of components) {
    const limit = LINE_LIMIT_EXCEPTIONS[file] ?? MAX_COMPONENT_LINES
    const lines = lineCount(file)
    if (lines > limit) failures.push(`File too large (${lines} lines > ${limit}): ${file}`)
  }
}

/** "DRY": the same block of code shouldn't appear twice. */
function checkDuplicateBlocks(files, failures) {
  const seen = new Map()
  const reported = new Set()
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n').map((l) => l.trim().replace(/\s+/g, ' '))
    for (let start = 0; start + DUPLICATE_BLOCK_LINES <= lines.length; start++) {
      const block = lines.slice(start, start + DUPLICATE_BLOCK_LINES)
      if (block.some((l) => l === '')) continue
      const key = block.join('\n')
      const first = seen.get(key)
      if (!first) {
        seen.set(key, `${file}:${start + 1}`)
        continue
      }
      const firstFile = first.slice(0, first.lastIndexOf(':'))
      const firstLine = Number(first.slice(first.lastIndexOf(':') + 1))
      // A run of identical lines matching itself one line later isn't a copy.
      if (firstFile === file && start + 1 - firstLine < DUPLICATE_BLOCK_LINES) continue
      const pair = `${first} and ${file}:${start + 1}`
      // Overlapping windows of one long duplicate: report it once per file pair.
      if (![...reported].some((r) => r.startsWith(`${firstFile}:`) && r.includes(` and ${file}:`))) {
        reported.add(pair)
        failures.push(`Duplicate ${DUPLICATE_BLOCK_LINES}-line block: ${pair}`)
      }
    }
  }
}

const sourceFiles = listFiles(SRC).filter((f) => /\.tsx?$/.test(f) && !isTest(f))
const components = sourceFiles.filter((f) => f.endsWith('.tsx'))
const failures = []
checkStylesheets(components, failures)
checkFileSizes(components, failures)
checkDuplicateBlocks(sourceFiles, failures)

if (failures.length) {
  console.error('Practice checks failed (see PRACTICES.md):')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Practice checks passed.')
