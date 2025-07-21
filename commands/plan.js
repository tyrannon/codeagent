"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planCommand = planCommand;
// plan.ts - Create or load Claude-style task plans
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const planPath = path_1.default.join(__dirname, '../memory/CLAUDE.md');
function planCommand() {
    if (!fs_1.default.existsSync(planPath)) {
        fs_1.default.writeFileSync(planPath, '# CodeAgent Plan Memory\n\n---\n');
    }
    const plan = fs_1.default.readFileSync(planPath, 'utf-8');
    console.log('\n--- Current Plan Memory ---\n');
    console.log(plan);
}
