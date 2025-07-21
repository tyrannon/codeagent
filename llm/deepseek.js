"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callDeepSeek = callDeepSeek;
// deepseek.ts - LLM wrapper for DeepSeek-Coder via Ollama
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
function loadConfig() {
    const raw = fs_1.default.readFileSync('codeagent/llm.json', 'utf-8');
    return JSON.parse(raw);
}
function callDeepSeek(prompt_1) {
    return __awaiter(this, arguments, void 0, function* (prompt, options = {}) {
        var _a, _b;
        const config = loadConfig();
        try {
            const response = yield axios_1.default.post(`${config.ollama_url}/api/generate`, {
                model: config.model,
                prompt,
                options: Object.assign({ temperature: config.temperature, max_tokens: config.max_tokens }, options),
            }, { headers: { 'Content-Type': 'application/json' } });
            // Ollama streams responses, but for simplicity, expect a .data.response
            return response.data.response || response.data;
        }
        catch (err) {
            throw new Error('Ollama API error: ' + (((_b = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || err.message));
        }
    });
}
