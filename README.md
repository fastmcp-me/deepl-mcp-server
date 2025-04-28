# deepl-mcp-server

A Model Context Protocol (MCP) server that provides translation capabilities using the DeepL API.

## Features

- Translate text between numerous languages
- Rephrase text using DeepL's capabilities

## Installation

Clone this repository and install dependencies:

```bash
git clone https://github.com/DeepLcom/deepl-mcp-server.git
cd deepl-mcp-server
npm install
```

## Configuration

### DeepL API Key

You'll need a DeepL API key to use this server. You can get one by signing up at [DeepL API](https://www.deepl.com/pro-api).

## Using with Claude Desktop

This MCP server integrates with Claude Desktop to provide translation capabilities directly in your conversations with Claude.

### Configuration Steps

1. Install Claude Desktop if you haven't already
2. Create or edit the Claude Desktop configuration file:
   - On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - On Windows: `%AppData%\Claude\claude_desktop_config.json`
   - On Linux: `~/.config/Claude/claude_desktop_config.json`

3. Add the DeepL MCP server configuration:

```json
{
    "mcpServers": {
        "deepl": {
            "command": "node",
            "args": [
                "/path/to/deepl-mcp-server/src/index.mjs"
            ],
            "env": {
                "DEEPL_API_KEY": "your-api-key-here"
            }
        }
    }
}
```

4. Replace `/path/to/deepl-mcp-server` with the actual path to your local copy of this repository
5. Replace `your-api-key-here` with your actual DeepL API key
6. Restart Claude Desktop

Once configured, Claude will be able to use the DeepL translation tools when needed. You can ask Claude to translate text between languages, and it will use the DeepL API behind the scenes.

## Debugging

For debugging information, visit the [MCP debugging documentation](https://modelcontextprotocol.io/docs/tools/debugging).

## Available Tools

This server provides the following tools:

- `get-source-languages`: Get list of available source languages for translation
- `get-target-languages`: Get list of available target languages for translation
- `translate-text`: Translate text to a target language
- `rephrase-text`: Rephrase text in the same or different language