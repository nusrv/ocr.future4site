"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const app_1 = require("./app");
const config_1 = require("./config");
promises_1.default.mkdir(config_1.config.STORAGE_PATH, { recursive: true }).then(() => {
    const app = (0, app_1.createApp)();
    app.listen(config_1.config.PORT, () => console.log(`Future OCR listening on port ${config_1.config.PORT}`));
}).catch((error) => { console.error('Unable to initialize storage', error); process.exitCode = 1; });
