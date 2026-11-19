import { app, BrowserWindow, dialog, nativeImage } from "electron"
import { spawn, type ChildProcess } from "child_process"
import fs from "fs"
import { get as httpGet } from "http"
import path from "path"
import { getDpiSwitches } from "./dpi"

const PORT = 5231
const BACKEND_ORIGIN = `http://127.0.0.1:${PORT}`
const HEALTH_URL = `${BACKEND_ORIGIN}/health`
const DEFAULT_HUB_URL = `http://127.0.0.1:${PORT}/hubs/dashboard`
const BACKEND_START_TIMEOUT_MS = 30_000

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null
let backendFailure: Error | null = null
let isQuitting = false

function appIconPath(): string {
  return path.join(__dirname, "assets", "favicon.ico")
}

function resolveHubUrl(): string {
  const configPath = path.join(app.getPath("userData"), "config.json")

  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as { hubUrl?: string }
      if (typeof config.hubUrl === "string" && config.hubUrl.trim()) return config.hubUrl.trim()
    }
  } catch (error) {
    console.error("Falha ao ler userData/config.json:", error)
  }

  return process.env.HUB_URL?.trim() || DEFAULT_HUB_URL
}

function backendExePath(): string {
  const root = app.isPackaged ? process.resourcesPath : path.join(__dirname, "resources")
  return path.join(root, "backend", "backend.exe")
}

function ensureExternalBackendConfig(): string {
  const configDirectory = app.getPath("userData")
  const configPath = path.join(configDirectory, "appsettings.json")
  const bundledConfigPath = path.join(path.dirname(backendExePath()), "appsettings.json")

  fs.mkdirSync(configDirectory, { recursive: true })
  if (!fs.existsSync(configPath)) {
    fs.copyFileSync(bundledConfigPath, configPath)
  }

  return configDirectory
}

function frontendIndexPath(): string {
  const root = app.isPackaged ? process.resourcesPath : path.join(__dirname, "resources")
  return path.join(root, "frontend", "index.html")
}

function startBackend(): void {
  const exePath = backendExePath()
  const configDirectory = ensureExternalBackendConfig()
  const logPath = path.join(app.getPath("userData"), "backend.log")
  const logStream = fs.createWriteStream(logPath, { flags: "a" })

  logStream.write(`\n[${new Date().toISOString()}] Iniciando backend em ${BACKEND_ORIGIN}\n`)
  backendFailure = null
  backendProcess = spawn(exePath, ["--contentRoot", configDirectory], {
    cwd: path.dirname(exePath),
    env: { ...process.env, ASPNETCORE_URLS: `http://127.0.0.1:${PORT}`, ASPNETCORE_ENVIRONMENT: "Production" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  })
  backendProcess.stdout?.pipe(logStream, { end: false })
  backendProcess.stderr?.pipe(logStream, { end: false })
  backendProcess.once("error", (error) => {
    backendFailure = error
    logStream.write(`Falha ao iniciar o backend: ${error.stack ?? error.message}\n`)
  })
  backendProcess.once("exit", (code, signal) => {
    if (!isQuitting && code !== 0) {
      backendFailure = new Error(
        `O backend encerrou antes de ficar pronto (código ${code ?? "desconhecido"}, sinal ${signal ?? "nenhum"}).`,
      )
    }
    logStream.write(`Backend encerrado (código ${code ?? "desconhecido"}, sinal ${signal ?? "nenhum"}).\n`)
    logStream.end()
  })
}

function isBackendHealthy(): Promise<boolean> {
  return new Promise((resolve) => {
    const request = httpGet(HEALTH_URL, (response) => {
      response.resume()
      resolve(response.statusCode === 200)
    })
    request.setTimeout(1_000, () => request.destroy())
    request.once("error", () => resolve(false))
  })
}

async function waitForBackend(): Promise<void> {
  const deadline = Date.now() + BACKEND_START_TIMEOUT_MS

  while (Date.now() < deadline) {
    if (await isBackendHealthy()) return
    if (backendFailure) throw backendFailure
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`O backend não respondeu em ${HEALTH_URL} dentro de 30 segundos.`)
}

function stopBackend(): void {
  if (!backendProcess || backendProcess.killed) return
  if (process.platform === "win32" && backendProcess.pid) {
    spawn("taskkill", ["/pid", String(backendProcess.pid), "/f", "/t"], { windowsHide: true })
  } else {
    backendProcess.kill()
  }
  backendProcess = null
}

getDpiSwitches(process.platform).forEach(([name, value]) => app.commandLine.appendSwitch(name, value))

function createWindow(hubUrl: string): void {
  const icon = nativeImage.createFromPath(appIconPath())
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    icon: icon.isEmpty() ? undefined : icon,
    useContentSize: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--app-hub-url=${encodeURIComponent(hubUrl)}`],
    },
  })
  void mainWindow.loadFile(frontendIndexPath())
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow?.webContents.setZoomFactor(1)
    mainWindow?.webContents.setVisualZoomLevelLimits(1, 1)
  })
  mainWindow.once("ready-to-show", () => mainWindow?.show())
  mainWindow.on("closed", () => { mainWindow = null })
}

app.whenReady().then(async () => {
  if (process.platform === "win32") app.setAppUserModelId("com.estoque.app")
  const hubUrl = resolveHubUrl()
  try {
    startBackend()
    await waitForBackend()
    createWindow(hubUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const logPath = path.join(app.getPath("userData"), "backend.log")
    dialog.showErrorBox(
      "Não foi possível iniciar o aplicativo",
      `${message}\n\nDetalhes: ${logPath}`,
    )
    app.quit()
  }
})

app.on("before-quit", () => {
  isQuitting = true
  stopBackend()
})
app.on("window-all-closed", () => {
  stopBackend()
  if (process.platform !== "darwin") app.quit()
})
