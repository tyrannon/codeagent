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
exports.askCommand = askCommand;
// ask.ts - Ask questions about the codebase
const deepseek_1 = require("../llm/deepseek");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function askCommand(question) {
    return __awaiter(this, void 0, void 0, function* () {
        // Load system prompt
        const systemPrompt = fs_1.default.readFileSync(path_1.default.join(__dirname, '../models/systemPrompt.txt'), 'utf-8');
        const prompt = `${systemPrompt}\n\nUser: ${question}\nAssistant:`;
        try {
            const response = yield (0, deepseek_1.callDeepSeek)(prompt);
            console.log(response);
        }
        catch (err) {
            console.error('Error:', err.message);
        }
    });
}
