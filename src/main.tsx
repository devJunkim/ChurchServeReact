import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './styles/global.css'
import { createAppRouter } from './router'
import { loadRuntimeConfig } from './core/config/runtimeConfig'

loadRuntimeConfig()
  .then((runtimeConfig) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <RouterProvider router={createAppRouter(runtimeConfig)} />
      </StrictMode>,
    )
  })
  .catch((error: unknown) => {
    console.error('ChurchServe could not start.', error)
    document.body.replaceChildren(createStartupError())
  })

function createStartupError() {
  const main = document.createElement('main')
  const heading = document.createElement('h1')
  const message = document.createElement('p')
  heading.textContent = 'ChurchServe is unavailable'
  message.textContent =
    'The application configuration could not be loaded. Try again later.'
  main.append(heading, message)
  return main
}
