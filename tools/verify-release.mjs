import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'

const repositoryRoot = process.cwd()
const publishDirectory = path.join(repositoryRoot, 'artifacts', 'publish')
const webRoot = path.join(publishDirectory, 'wwwroot')
const applicationDll = path.join(publishDirectory, 'ChurchServe.Api.dll')
const port = await findAvailablePort()
const baseUrl = `http://127.0.0.1:${port}`
const temporaryDirectory = await mkdtemp(
  path.join(tmpdir(), 'churchserve-react-release-'),
)
const databasePath = path.join(temporaryDirectory, 'churchserve.db')
let output = ''

const server = spawn('dotnet', [applicationDll, '--urls', baseUrl], {
  cwd: publishDirectory,
  env: {
    ...process.env,
    ASPNETCORE_ENVIRONMENT: 'Production',
    ConnectionStrings__ChurchServe: `Data Source=${databasePath}`,
    PublicRuntime__ApiBaseUrl: '/api',
    PublicRuntime__Release: 'part-25-verification',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.on('data', (chunk) => (output += chunk))
server.stderr.on('data', (chunk) => (output += chunk))

try {
  await waitUntilReady()

  const root = await fetch(`${baseUrl}/`)
  assert.equal(root.status, 200)
  assert.match(root.headers.get('content-type') ?? '', /^text\/html/)
  assert.match(root.headers.get('cache-control') ?? '', /no-cache/)
  assert.equal(root.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(root.headers.get('x-frame-options'), 'DENY')
  assert.match(
    root.headers.get('content-security-policy') ?? '',
    /frame-ancestors 'none'/,
  )
  assert.match(
    root.headers.get('content-security-policy') ?? '',
    /script-src 'self'/,
  )

  const deepLink = await fetch(
    `${baseUrl}/schedule/sunday-2026-11-01`,
  )
  assert.equal(deepLink.status, 200)
  assert.match(deepLink.headers.get('content-type') ?? '', /^text\/html/)

  const missingAsset = await fetch(`${baseUrl}/missing.12345678.js`)
  assert.equal(missingAsset.status, 404)
  assert.doesNotMatch(
    missingAsset.headers.get('content-type') ?? '',
    /^text\/html/,
  )

  const missingApi = await fetch(`${baseUrl}/api/not-a-real-route`)
  assert.equal(missingApi.status, 404)
  assert.doesNotMatch(
    missingApi.headers.get('content-type') ?? '',
    /^text\/html/,
  )

  const runtime = await fetch(`${baseUrl}/runtime-config.json`)
  assert.equal(runtime.status, 200)
  assert.match(runtime.headers.get('cache-control') ?? '', /no-store/)
  assert.deepEqual(await runtime.json(), {
    apiBaseUrl: '/api',
    release: 'part-25-verification',
  })

  for (const healthPath of ['/health/live', '/health/ready']) {
    const health = await fetch(`${baseUrl}${healthPath}`)
    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { status: 'healthy' })
  }

  const assetNames = await listFiles(webRoot)
  const fingerprintedScript = assetNames.find((name) =>
    /[-.][A-Za-z0-9_-]{8,}\.js$/i.test(name),
  )
  assert.ok(
    fingerprintedScript,
    'The release must contain a fingerprinted JavaScript asset.',
  )
  const asset = await fetch(`${baseUrl}/${fingerprintedScript}`)
  assert.equal(asset.status, 200)
  assert.match(asset.headers.get('cache-control') ?? '', /max-age=31536000/)
  assert.match(asset.headers.get('cache-control') ?? '', /immutable/)

  assert.equal(
    assetNames.some((name) => name.endsWith('.map')),
    false,
    'Source maps must not be public.',
  )
  await assertBuiltAssetsContainNoConfigurationSecrets(assetNames)

  console.log(
    'Release verification passed: configuration, probes, SPA fallback, headers, and assets.',
  )
} catch (error) {
  console.error(output)
  throw error
} finally {
  if (server.exitCode === null) {
    const exited = new Promise((resolve) => server.once('exit', resolve))
    server.kill()
    await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ])
  }
  await rm(temporaryDirectory, { recursive: true, force: true })
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      if (address === null || typeof address === 'string') {
        probe.close()
        reject(new Error('Could not reserve a release-verification port.'))
        return
      }
      probe.close((error) =>
        error ? reject(error) : resolve(address.port),
      )
    })
  })
}

async function waitUntilReady() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `Published application exited before becoming ready.\n${output}`,
      )
    }

    try {
      const response = await fetch(`${baseUrl}/health/ready`)
      if (response.ok) return
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Published application did not become ready.\n${output}`)
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name)
    if (entry.isDirectory()) {
      files.push(
        ...(await listFiles(path.join(directory, entry.name), relativePath)),
      )
    } else {
      files.push(relativePath)
    }
  }
  return files
}

async function assertBuiltAssetsContainNoConfigurationSecrets(assetNames) {
  const forbiddenMarkers = [
    'WP_APP_PASSWORD',
    'ConnectionStrings__ChurchServe',
    'ChurchServe-E2E-Only',
  ]
  for (const assetName of assetNames.filter((name) => name.endsWith('.js'))) {
    const contents = await readFile(path.join(webRoot, assetName), 'utf8')
    for (const marker of forbiddenMarkers) {
      assert.equal(
        contents.includes(marker),
        false,
        `${assetName} contains forbidden marker ${marker}.`,
      )
    }
  }
}
