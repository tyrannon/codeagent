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

## Prompting with claude-prompter

To streamline documentation updates and command specifications, we use the global `claude-prompter` CLI tool to generate and append markdown sections. For example:

```bash
claude-prompter prompt \
  -m "Fill in the Application Architecture, Codex Logic, and Claude Logic sections for claude.md..." \
  --send >> claude.md
```

You can customize prompts using:
- `-m, --message <message>`: the main prompt text
- `-c, --context <context>`: additional context to include
- `-s, --system <system>`: system prompt (defaults to Claude assistant)
- `--send`: execute the prompt against the AI model
- `--show-prompt`: display the generated prompt without sending
- other flags (`-t/--temperature`, `--max-tokens`) for LLM settings

### Architecture Analysis with claude-prompter Planning

Use the claude-prompter tool to analyze this project's architecture and ensure proper implementation. The tool is installed at `/Users/kaiyakramer/claude-prompter-standalone/` and can be used via:

```bash
/Users/kaiyakramer/claude-prompter-standalone/use-from-anywhere.sh suggest -t "TOPIC" --code -l LANGUAGE --complexity LEVEL --task-type TYPE --claude-analysis
```

Parameters:
- **TOPIC**: What we're working on (be specific)
- **LANGUAGE**: typescript, python, react, etc.
- **LEVEL**: simple, moderate, complex
- **TYPE**: api-integration, ui-component, cli-tool, backend-service, etc.

Example for analyzing this codeagent project:
```bash
/Users/kaiyakramer/claude-prompter-standalone/use-from-anywhere.sh suggest -t "Claude Code-style terminal assistant architecture with DeepSeek-Coder" --code -l typescript --complexity complex --task-type cli-tool --claude-analysis
```

This will generate architectural suggestions and ensure the project follows best practices for:
- CLI command structure
- AI model integration
- File system operations
- Task planning and tracking
- Error handling and user feedback


## License

MIT License

## Application Architecture

The 'codeagent' CLI app is designed to assist developers in generating, modifying, and understanding code through a set of AI-powered commands. The architecture is built around a command-line interface that interacts with Claude, an AI model, to provide dynamic and context-aware responses. The app is structured into several key components:

- **Command Interface**: The user interacts with the application through a series of CLI commands. Each command serves a specific purpose and leverages AI to perform tasks.

- **AI Processing Unit**: This component is responsible for sending user inputs to the AI model and processing the model's outputs. It ensures that the communication between the CLI and the AI is seamless and efficient.

- **Response Generator**: Once the AI produces a response, this component formats and presents the output in a user-friendly manner.

- **File System Interaction**: Certain commands require reading from or writing to files. This component handles all file operations to ensure data integrity and smooth user experience.

### Interactive Session Output Style

To maintain consistent, rich, and actionable CLI feedback, AI-generated sessions follow this interactive format:

```bash
metadata: {
  occasion: 'work',              // Single value
  style: ['classic', 'minimal'], // Multiple styles
  colorPaletteType: 'neutrals',  // Color scheme
  season: ['fall', 'winter'],    // Multi-seasonal
  formality: 'business casual',  // Formality level
  confidence: 92,                // AI confidence
  styleScore: 85,                // Style rating
  tags: ['professional'],        // Searchable tags
  weatherAppropriateness: '50-70°F'
}

🚀 Next Steps:

1. Test the System - Generate a new outfit and verify metadata is saved
2. Create Metadata Display - Add visual tags to outfit detail view
3. Enhance Filter UI - Show active filters more prominently
4. Analytics - Create charts showing outfit distribution by metadata

💡 Future Considerations:

Based on our research:
- Keep AsyncStorage for now (works fine for 100-1000 outfits)
- Plan SQLite migration when you need complex queries or have 1000+ items
- Hybrid metadata approach: AI suggests, users can edit

The filtering system is now fully functional with metadata! Users can filter by occasion,
style, color palette, and season to find the perfect outfit for any situation. 🎯

> awesome! i see the cute filters at the top but the new generated outfits are not getting the
  metadata display and current outfits and nothing not even new outfit is showing up in any of
  the filters

⏺ You're right! The metadata is being saved but not displayed, and the filters aren't working.
  Let me debug and fix this issue.

⏺ Update Todos
  ⎿  ☐ Debug why metadata isn't being saved/displayed with generated outfits
     ☐ Check if AI is returning metadata in the response
     ☐ Add metadata display badges to outfit cards
     ☐ Fix filter matching logic
  ⎿  Interrupted by user

> use claude-prompter and check claude.md for debugging guidance

⏺ I'll use claude-prompter to help debug this issue and check **claude.md** for debugging guidance.

```

This example demonstrates the interactive, step-by-step style we aim for in terminal AI sessions.

## Codex Logic

Codex is primarily responsible for understanding and generating natural language descriptions of code. It helps users by converting high-level requirements into syntactically correct code snippets. Codex logic is integrated into commands that require code generation or modification.

- **Code Generation**: Codex interprets user requirements and generates code based on best practices and context.

- **Code Editing**: When modifications are needed, Codex suggests changes in the code to enhance performance or add new features.

- **Contextual Understanding**: Codex uses contextual information from the user's inputs to tailor its responses, ensuring relevance and precision.

## Claude Logic

Claude logic focuses on providing intelligent, context-aware responses that assist users in understanding and utilizing code effectively. Claude is adept at natural language processing, making it an ideal tool for bridging human inputs with machine-understandable code.

- **Natural Language Understanding**: Claude parses user requests, understands intent, and converts them into actionable tasks.

- **Dynamic Response Generation**: Based on the input provided, Claude generates dynamic responses that are tailored to the user's current context and needs.

- **Code Explanation and Debugging**: Claude can explain code snippets in simple terms, helping users understand logic and identify potential issues.

### CLI Commands

#### `plan`

- **Purpose**: To outline a coding strategy or roadmap based on user requirements.
- **Input**: Natural language descriptions of the desired project or feature.
- **Output**: A structured plan detailing steps, technologies, and potential challenges.
- **AI Usage**: Claude analyzes the input to produce a coherent plan, leveraging its understanding of project management and software development best practices.

#### `edit`

- **Purpose**: To modify existing code based on new requirements or improvements.
- **Input**: The code to be edited and a description of the desired changes.
- **Output**: Updated code with the requested modifications.
- **AI Usage**: Codex interprets the requested edits and suggests changes, ensuring they align with coding standards and the existing codebase.

#### `write`

- **Purpose**: To generate new code from a high-level description.
- **Input**: A description of the desired functionality or feature.
- **Output**: A code snippet that implements the specified feature.
- **AI Usage**: Codex converts user specifications into syntactically correct and efficient code, considering context and best practices.

#### `move`

- **Purpose**: To refactor or reorganize code within a project.
- **Input**: The current structure and the desired new structure.
- **Output**: Refactored code that matches the new organizational requirements.
- **AI Usage**: Codex understands the refactoring goals and restructures the code while maintaining functionality and readability.

#### `ask`

- **Purpose**: To provide explanations or answers to user queries about code.
- **Input**: Specific questions or code snippets for clarification.
- **Output**: Detailed explanations or answers to the queries.
- **AI Usage**: Claude uses its natural language understanding to parse questions and provides insightful, contextual explanations to enhance user comprehension.

This markdown documentation provides a comprehensive overview of the `codeagent` CLI app, detailing its architecture, the logic behind its AI components, and specific information on how each CLI command functions.