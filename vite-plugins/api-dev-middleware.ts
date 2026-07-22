import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin, ViteDevServer } from 'vite'

type ApiHandler = (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => Promise<void>

const API_ROUTES: Record<string, string> = {
  '/api/geocode': '/api/geocode.ts',
  '/api/route': '/api/route.ts',
}

class InvalidJsonBodyError extends Error {}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf-8')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    // Surfaced as a 400 below rather than silently treated as an empty body,
    // which would mask malformed requests behind unrelated field-validation
    // errors from the handler (e.g. "query_too_short" instead of a parse error).
    throw new InvalidJsonBodyError('Request body is not valid JSON')
  }
}

/**
 * Mounts api/*.ts Vercel-style handlers as middleware for `vite dev`, so the
 * same handler code runs locally (including under Playwright's webServer,
 * which runs `vite dev`) without needing `vercel dev`, which requires
 * project linking and login.
 */
export function apiDevMiddleware(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server: ViteDevServer) {
      const middleware: Connect.NextHandleFunction = async (req, res, next) => {
        const url = req.url?.split('?')[0]
        const modulePath = url ? API_ROUTES[url] : undefined
        if (!modulePath) {
          next()
          return
        }
        try {
          const reqWithBody = req as IncomingMessage & { body?: unknown }
          reqWithBody.body = await readJsonBody(req)
          const mod = await server.ssrLoadModule(modulePath)
          const handler = mod.default as ApiHandler
          await handler(reqWithBody, res)
        } catch (err) {
          if (err instanceof InvalidJsonBodyError) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'invalid_json' }))
            return
          }
          next(err instanceof Error ? err : new Error(String(err)))
        }
      }
      server.middlewares.use(middleware)
    },
  }
}
