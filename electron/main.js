"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const dpi_1 = require("./dpi");
const PORT = 5231;
const BACKEND_ORIGIN = `http://127.0.0.1:${PORT}`;
const HEALTH_URL = `${BACKEND_ORIGIN}/health`;
const DEFAULT_HUB_URL = `http://127.0.0.1:${PORT}/hubs/dashboard`;
const BACKEND_START_TIMEOUT_MS = 30_000;
let mainWindow = null;
let backendProcess = null;
let backendFailure = null;
let isQuitting = false;
function appIconPath() {
    return path_1.default.join(__dirname, "assets", "favicon.ico");
}
function resolveHubUrl() {
    const configPath = path_1.default.join(electron_1.app.getPath("userData"), "config.json");
    try {
        if (fs_1.default.existsSync(configPath)) {
            const config = JSON.parse(fs_1.default.readFileSync(configPath, "utf8"));
            if (typeof config.hubUrl === "string" && config.hubUrl.trim())
                return config.hubUrl.trim();
        }
    }
    catch (error) {
        console.error("Falha ao ler userData/config.json:", error);
    }
    return process.env.HUB_URL?.trim() || DEFAULT_HUB_URL;
}
function backendExePath() {
    const root = electron_1.app.isPackaged ? process.resourcesPath : path_1.default.join(__dirname, "resources");
    return path_1.default.join(root, "backend", "backend.exe");
}
function ensureExternalBackendConfig() {
    const configDirectory = electron_1.app.getPath("userData");
    const configPath = path_1.default.join(configDirectory, "appsettings.json");
    const bundledConfigPath = path_1.default.join(path_1.default.dirname(backendExePath()), "appsettings.json");
    fs_1.default.mkdirSync(configDirectory, { recursive: true });
    if (!fs_1.default.existsSync(configPath)) {
        fs_1.default.copyFileSync(bundledConfigPath, configPath);
    }
    return configDirectory;
}
function frontendIndexPath() {
    const root = electron_1.app.isPackaged ? process.resourcesPath : path_1.default.join(__dirname, "resources");
    return path_1.default.join(root, "frontend", "index.html");
}
function startBackend() {
    const exePath = backendExePath();
    const configDirectory = ensureExternalBackendConfig();
    const logPath = path_1.default.join(electron_1.app.getPath("userData"), "backend.log");
    const logStream = fs_1.default.createWriteStream(logPath, { flags: "a" });
    logStream.write(`\n[${new Date().toISOString()}] Iniciando backend em ${BACKEND_ORIGIN}\n`);
    backendFailure = null;
    backendProcess = (0, child_process_1.spawn)(exePath, ["--contentRoot", configDirectory], {
        cwd: path_1.default.dirname(exePath),
        env: { ...process.env, ASPNETCORE_URLS: `http://127.0.0.1:${PORT}`, ASPNETCORE_ENVIRONMENT: "Production" },
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
    });
    backendProcess.stdout?.pipe(logStream, { end: false });
    backendProcess.stderr?.pipe(logStream, { end: false });
    backendProcess.once("error", (error) => {
        backendFailure = error;
        logStream.write(`Falha ao iniciar o backend: ${error.stack ?? error.message}\n`);
    });
    backendProcess.once("exit", (code, signal) => {
        if (!isQuitting && code !== 0) {
            backendFailure = new Error(`O backend encerrou antes de ficar pronto (código ${code ?? "desconhecido"}, sinal ${signal ?? "nenhum"}).`);
        }
        logStream.write(`Backend encerrado (código ${code ?? "desconhecido"}, sinal ${signal ?? "nenhum"}).\n`);
        logStream.end();
    });
}
function isBackendHealthy() {
    return new Promise((resolve) => {
        const request = (0, http_1.get)(HEALTH_URL, (response) => {
            response.resume();
            resolve(response.statusCode === 200);
        });
        request.setTimeout(1_000, () => request.destroy());
        request.once("error", () => resolve(false));
    });
}
async function waitForBackend() {
    const deadline = Date.now() + BACKEND_START_TIMEOUT_MS;
    while (Date.now() < deadline) {
        if (await isBackendHealthy())
            return;
        if (backendFailure)
            throw backendFailure;
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`O backend não respondeu em ${HEALTH_URL} dentro de 30 segundos.`);
}
function stopBackend() {
    if (!backendProcess || backendProcess.killed)
        return;
    if (process.platform === "win32" && backendProcess.pid) {
        (0, child_process_1.spawn)("taskkill", ["/pid", String(backendProcess.pid), "/f", "/t"], { windowsHide: true });
    }
    else {
        backendProcess.kill();
    }
    backendProcess = null;
}
(0, dpi_1.getDpiSwitches)(process.platform).forEach(([name, value]) => electron_1.app.commandLine.appendSwitch(name, value));
function createWindow(hubUrl) {
    const icon = electron_1.nativeImage.createFromPath(appIconPath());
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        show: false,
        icon: icon.isEmpty() ? undefined : icon,
        useContentSize: true,
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            additionalArguments: [`--app-hub-url=${encodeURIComponent(hubUrl)}`],
        },
    });
    void mainWindow.loadFile(frontendIndexPath());
    mainWindow.webContents.on("did-finish-load", () => {
        mainWindow?.webContents.setZoomFactor(1);
        mainWindow?.webContents.setVisualZoomLevelLimits(1, 1);
    });
    mainWindow.once("ready-to-show", () => mainWindow?.show());
    mainWindow.on("closed", () => { mainWindow = null; });
}
electron_1.app.whenReady().then(async () => {
    if (process.platform === "win32")
        electron_1.app.setAppUserModelId("com.estoque.app");
    const hubUrl = resolveHubUrl();
    try {
        startBackend();
        await waitForBackend();
        createWindow(hubUrl);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const logPath = path_1.default.join(electron_1.app.getPath("userData"), "backend.log");
        electron_1.dialog.showErrorBox("Não foi possível iniciar o aplicativo", `${message}\n\nDetalhes: ${logPath}`);
        electron_1.app.quit();
    }
});
electron_1.app.on("before-quit", () => {
    isQuitting = true;
    stopBackend();
});
electron_1.app.on("window-all-closed", () => {
    stopBackend();
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
