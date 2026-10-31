import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const sourceRoot = path.resolve('src')
const sourceFiles = await findSourceFiles(sourceRoot)
const violations = []

for (const importer of sourceFiles) {
  const source = await readFile(importer, 'utf8')

  for (const specifier of staticRelativeImports(source)) {
    const imported = path.resolve(path.dirname(importer), specifier)
    const from = classify(importer)
    const to = classify(imported)
    const reason = forbiddenDependency(from, to)

    if (reason) {
      violations.push(`${relative(importer)} imports ${specifier}: ${reason}`)
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture boundary violations:')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exitCode = 1
} else {
  console.log(
    `Architecture boundaries passed for ${sourceFiles.length} source files.`,
  )
}

async function findSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      if (entry.name !== 'testing') {
        files.push(...(await findSourceFiles(fullPath)))
      }
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.(test|spec)\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith('.d.ts')
    ) {
      files.push(fullPath)
    }
  }

  return files
}

function staticRelativeImports(source) {
  const imports = []
  const pattern =
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"](\.[^'"]+)['"]/g

  for (const match of source.matchAll(pattern)) imports.push(match[1])
  return imports
}

function classify(filePath) {
  const parts = relative(filePath).split('/')

  if (parts[0] === 'core') return { kind: 'core' }
  if (parts[0] === 'shared') return { kind: 'shared' }
  if (parts[0] === 'features') return { kind: 'feature', name: parts[1] }
  return { kind: 'shell' }
}

function forbiddenDependency(from, to) {
  if (from.kind === 'shell' && to.kind === 'feature') {
    return 'the application shell may load features only through dynamic imports'
  }
  if (from.kind === 'core' && (to.kind === 'feature' || to.kind === 'shell')) {
    return 'core can depend only on core or shared code'
  }
  if (from.kind === 'shared' && to.kind !== 'shared') {
    return 'shared code can depend only on shared code'
  }
  if (from.kind === 'feature' && to.kind === 'shell') {
    return 'a feature cannot depend on the application shell'
  }
  if (
    from.kind === 'feature' &&
    to.kind === 'feature' &&
    from.name !== to.name
  ) {
    return `feature ${from.name} cannot depend on feature ${to.name}`
  }
}

function relative(filePath) {
  return path.relative(sourceRoot, filePath).replaceAll('\\', '/')
}
