# Project Documentation: Claude and Codex Logic

This file documents the design and logic of the various components involved in this project, including Codex integration, Claude integration, and the application architecture.

## Project Overview

A fully local Claude Code-style terminal assistant for your codebase, powered by DeepSeek-Coder 6.7B via Ollama.

## Features

- Natural language codebase interaction (read, edit, move, write files)
- Task planning and tracking (Claude-style Markdown memory)
- Local LLM (no cloud)
- CLI-first, fast, and private

## Usage

```
bun run cli.ts <command> [...args]
# or
npx tsx cli.ts <command> [...args]
```

## Commands

- `plan`   – Create or load Claude-style task plans
- `edit`   – Edit a code file with the model
- `write`  – Create a new file
- `move`   – Move/rename files
- `ask`    – Ask questions about the codebase

## Setup

- Requires [Ollama](https://ollama.com/) and DeepSeek-Coder 6.7B model
- Node.js 18+ or Bun

## License

MIT License

## Codex Logic

Describe here the logic, modules, and workflows related to Codex.

## Claude Logic

Describe here the logic, modules, and workflows related to Claude.

## Application Architecture

Describe here the overall application structure, components, and data flow.