import { describe, expect, it, vi } from 'vitest'
import { HttpSessionClient } from './httpSessionClient'

const currentUser = {
  id: 'coordinator-1',
  email: 'coordinator@churchserve.local',
  displayName: 'Demo Coordinator',
  roles: ['scheduler'],
  permissions: [
    'schedule.read',
    'schedule.manage',
    'volunteer.read',
    'volunteer.manage',
  ],
}

describe('HttpSessionClient', () => {
  it('restores an authenticated user through same-origin credentials', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(currentUser),
    )
    const client = new HttpSessionClient('/api/session/', fetcher)

    await expect(client.restore()).resolves.toEqual(currentUser)
    expect(fetcher).toHaveBeenCalledWith('/api/session', {
      credentials: 'same-origin',
      signal: undefined,
    })
  })

  it('represents a 401 restore as an anonymous session', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 401 }),
    )
    const client = new HttpSessionClient('/api/session', fetcher)

    await expect(client.restore()).resolves.toBeUndefined()
  })

  it('keeps a 401 sign-in as an unauthenticated application problem', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 401 }),
    )
    const client = new HttpSessionClient(
      '/api/session',
      fetcher,
      () => 'XSRF-TOKEN=token',
    )

    await expect(
      client.signIn({ email: currentUser.email, password: 'wrong' }),
    ).rejects.toMatchObject({ problem: { kind: 'unauthenticated' } })
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('rejects a successful response with an invalid user contract', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ id: 'incomplete' }),
    )
    const client = new HttpSessionClient('/api/session', fetcher)

    await expect(client.restore()).rejects.toMatchObject({
      name: 'InvalidSessionResponseError',
    })
  })

  it('rejects an absent or unknown permission', async () => {
    const withoutPermissions = { ...currentUser, permissions: undefined }
    const unknownPermission = {
      ...currentUser,
      permissions: [...currentUser.permissions, 'billing.read'],
    }
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(withoutPermissions))
      .mockResolvedValueOnce(Response.json(unknownPermission))
    const client = new HttpSessionClient('/api/session', fetcher)

    await expect(client.restore()).rejects.toMatchObject({
      name: 'InvalidSessionResponseError',
    })
    await expect(client.restore()).rejects.toMatchObject({
      name: 'InvalidSessionResponseError',
    })
  })

  it('signs in with JSON, cookies, and the decoded antiforgery token', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(currentUser),
    )
    const client = new HttpSessionClient(
      '/api/session',
      fetcher,
      () => 'other=value; XSRF-TOKEN=test%2Btoken',
    )
    const command = {
      email: currentUser.email,
      password: 'local-password',
    }

    await expect(client.signIn(command)).resolves.toEqual(currentUser)
    expect(fetcher).toHaveBeenCalledWith('/api/session/sign-in', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': 'test+token',
      },
      body: JSON.stringify(command),
      signal: undefined,
    })
  })

  it('signs out only with the antiforgery header', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 204 }),
    )
    const client = new HttpSessionClient(
      '/api/session',
      fetcher,
      () => 'XSRF-TOKEN=sign-out-token',
    )

    await expect(client.signOut()).resolves.toBeUndefined()
    expect(fetcher).toHaveBeenCalledWith('/api/session', {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'X-XSRF-TOKEN': 'sign-out-token' },
      signal: undefined,
    })
  })

  it('does not send a mutation when the antiforgery cookie is absent', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const client = new HttpSessionClient(
      '/api/session',
      fetcher,
      () => 'another-cookie=value',
    )

    await expect(
      client.signIn({ email: currentUser.email, password: 'local-password' }),
    ).rejects.toMatchObject({ name: 'MissingAntiforgeryTokenError' })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
