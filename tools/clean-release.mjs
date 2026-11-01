import { rm } from 'node:fs/promises'

await rm('artifacts/publish', { recursive: true, force: true })
