import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as deepl from 'deepl-node';

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const deeplClient = new deepl.DeepLClient(DEEPL_API_KEY);

// Import WritingStyle and WritingTone enums
const WritingStyle = deepl.WritingStyle;
const WritingTone = deepl.WritingTone;

// Cache for language lists
let sourceLanguagesCache = null;
let targetLanguagesCache = null;

async function getSourceLanguages() {
  if (!sourceLanguagesCache) {
    sourceLanguagesCache = await deeplClient.getSourceLanguages();
  }
  return sourceLanguagesCache;
}

async function getTargetLanguages() {
  if (!targetLanguagesCache) {
    targetLanguagesCache = await deeplClient.getTargetLanguages();
  }
  return targetLanguagesCache;
}

// Helper function to validate languages
async function validateLanguages(sourceLang, targetLang) {
  const sourceLanguages = await getSourceLanguages();
  const targetLanguages = await getTargetLanguages();
  
  if (sourceLang && !sourceLanguages.some(lang => lang.code === sourceLang)) {
    throw new Error(`Invalid source language: ${sourceLang}. Available languages: ${sourceLanguages.map(l => l.code).join(', ')}`);
  }
  if (!targetLanguages.some(lang => lang.code === targetLang)) {
    throw new Error(`Invalid target language: ${targetLang}. Available languages: ${targetLanguages.map(l => l.code).join(', ')}`);
  }
}


// Create server instance
const server = new McpServer({
  name: "deepl",
  version: "0.1.0-beta.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "get-source-languages",
  "Get list of available source languages for translation",
  {},
  async () => {
    try {
      const languages = await getSourceLanguages();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(languages.map(lang => ({
              code: lang.code,
              name: lang.name
            })), null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get source languages: ${error.message}`);
    }
  }
);

server.tool(
  "get-target-languages",
  "Get list of available target languages for translation",
  {},
  async () => {
    try {
      const languages = await getTargetLanguages();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(languages.map(lang => ({
              code: lang.code,
              name: lang.name,
              supportsFormality: lang.supportsFormality
            })), null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get target languages: ${error.message}`);
    }
  }
);

server.tool(
  "translate-text",
  "Translate text to a target language using DeepL API",
  {
    text: z.string().describe("Text to translate"),
    sourceLang: z.string().nullable().describe("Source language code (e.g. 'en', 'de', null for auto-detection)"),
    targetLang: z.string().describe("Target language code (e.g. 'en-US', 'de', 'fr')"),
    formality: z.enum(['less', 'more', 'default', 'prefer_less', 'prefer_more']).optional().describe("Controls whether translations should lean toward informal or formal language"),
  },
  async ({ text, sourceLang, targetLang, formality }) => {
    // Validate languages before translation
    await validateLanguages(sourceLang, targetLang);

    try {
      const result = await deeplClient.translateText(
        text, 
        /** @type {import('deepl-node').SourceLanguageCode} */ (sourceLang), 
        /** @type {import('deepl-node').TargetLanguageCode} */ (targetLang), 
        { formality }
      );
      return {
        content: [
          {
            type: "text",
            text: result.text,
          },
          {
            type: "text",
            text: `Detected source language: ${result.detectedSourceLang}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Translation failed: ${error.message}`);
    }
  }
);

server.tool(
  "get-writing-styles-and-tones",
  "Get list of available writing styles and tones for rephrasing",
  {},
  async () => {
    try {
      const writingStyles = Object.values(WritingStyle);
      const writingTones = Object.values(WritingTone);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              writingStyles,
              writingTones,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get writing styles and tones: ${error.message}`);
    }
  }
);

server.tool(
  "rephrase-text",
  "Rephrase text in the same language using DeepL API",
  {
    text: z.string().describe("Text to rephrase"),
    style: z.nativeEnum(WritingStyle).optional().describe("Writing style for rephrasing"),
    tone: z.nativeEnum(WritingTone).optional().describe("Writing tone for rephrasing")
  },
  async ({ text, style, tone }) => {
    try {
      const result = await deeplClient.rephraseText(
        text,
        null,
        style,
        tone
      );

      return {
        content: [
          {
            type: "text",
            text: result.text,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Rephrasing failed: ${error.message}`);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DeepL MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
