"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const DEFAULT_HUB_URL = "http://127.0.0.1:5231/hubs/dashboard";
function readHubUrl() {
    const prefix = "--app-hub-url=";
    const argument = process.argv.find((entry) => entry.startsWith(prefix));
    if (argument) {
        try {
            return decodeURIComponent(argument.slice(prefix.length));
        }
        catch {
            // Usa o endereço local quando o argumento for inválido.
        }
    }
    return DEFAULT_HUB_URL;
}
electron_1.contextBridge.exposeInMainWorld("appConfig", { hubUrl: readHubUrl() });
