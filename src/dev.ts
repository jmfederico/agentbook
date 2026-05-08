#!/usr/bin/env bun

import net from "node:net"

type ManagedProcess = {
  name: string
  process: Bun.Subprocess
}

function parsePort(value: string | undefined): number | null {
  if (!value) return null
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : null
}

function envPort(name: string): number | null {
  const parsed = parsePort(process.env[name])
  if (process.env[name] && parsed === null) {
    throw new Error(`Invalid ${name} value: ${process.env[name]}`)
  }
  return parsed
}

function envHost(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback
}

function publicHost(host: string): string {
  return host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host
}

function proxyTargetHost(host: string): string {
  return host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host
}

async function canBind(host: string, port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.once("error", () => resolve(false))
    server.listen({ host, port }, () => {
      server.close(() => resolve(true))
    })
  })
}

async function selectPort(preferred: number, host: string, reserved: Set<number>): Promise<number> {
  const tryPort = async (port: number) => (reserved.has(port) ? false : await canBind(host, port))

  if (await tryPort(preferred)) return preferred

  for (let port = preferred + 1; port < 65536; port += 1) {
    if (reserved.has(port)) continue
    if (await canBind(host, port)) return port
  }

  throw new Error(`Unable to find a free port at or above ${preferred} on ${host}`)
}

async function selectDevPorts() {
  const backendHost = envHost("HOST", "127.0.0.1")
  const uiHost = envHost("AGENTBOOK_UI_HOST", "0.0.0.0")
  const explicitApiPort = envPort("PORT")
  const explicitWsPort = envPort("WS_PORT")
  const explicitUiPort = envPort("AGENTBOOK_UI_PORT")

  const wsPreferred = explicitWsPort ?? (explicitApiPort && explicitApiPort < 65535 ? explicitApiPort + 1 : 3001)
  const wsPort = explicitWsPort ?? await selectPort(wsPreferred, backendHost, new Set([explicitApiPort ?? -1, explicitUiPort ?? -1]))

  const apiPreferred = explicitApiPort ?? 3000
  const apiPort = explicitApiPort ?? await selectPort(apiPreferred, backendHost, new Set([wsPort, explicitUiPort ?? -1]))

  const uiPort = explicitUiPort ?? await selectPort(5173, uiHost, new Set([apiPort, wsPort]))

  return { backendHost, uiHost, apiPort, wsPort, uiPort }
}

function spawnManagedProcess(name: string, cmd: string[], env: Record<string, string>) {
  return {
    name,
    process: Bun.spawn({
      cmd,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env, ...env } as Record<string, string>,
    }),
  }
}

async function main() {
  const { backendHost, uiHost, apiPort, wsPort, uiPort } = await selectDevPorts()
  const backendTargetHost = proxyTargetHost(backendHost)
  const uiDisplayHost = publicHost(uiHost)
  const apiDisplayHost = publicHost(backendHost)

  console.log(
    [
      `agentbook dev`,
      `API: http://${apiDisplayHost}:${apiPort}`,
      `WS: ws://${apiDisplayHost}:${wsPort}/ws`,
      `UI: http://${uiDisplayHost}:${uiPort} (bound on ${uiHost})`,
    ].join("\n"),
  )

  const backend = spawnManagedProcess("backend", ["bun", "--watch", "src/server.ts"], {
    HOST: backendHost,
    PORT: String(apiPort),
    WS_PORT: String(wsPort),
  })
  const ui = spawnManagedProcess("ui", ["bunx", "vite", "--config", "vite.config.ts", "--host", uiHost, "--port", String(uiPort), "--strictPort"], {
    AGENTBOOK_API_TARGET: `http://${backendTargetHost}:${apiPort}`,
    AGENTBOOK_WS_TARGET: `ws://${backendTargetHost}:${wsPort}`,
  })

  let stopping = false

  const stop = async (code: number) => {
    if (stopping) return
    stopping = true
    backend.process.kill()
    ui.process.kill()
    await Promise.allSettled([backend.process.exited, ui.process.exited])
    process.exit(code)
  }

  process.once("SIGINT", () => void stop(0))
  process.once("SIGTERM", () => void stop(0))

  const firstExit = await Promise.race([
    backend.process.exited.then((code) => ({ ...backend, code })),
    ui.process.exited.then((code) => ({ ...ui, code })),
  ])

  if ((firstExit.code ?? 0) !== 0) {
    console.error(`agentbook ${firstExit.name} exited with code ${firstExit.code}`)
  }

  await stop(firstExit.code ?? 0)
}

await main()
