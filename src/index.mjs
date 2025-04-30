import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as deepl from 'deepl-node';

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const translator = new deepl.Translator(DEEPL_API_KEY);

// Cache for language lists
let sourceLanguagesCache = null;
let targetLanguagesCache = null;

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

// Helper functions to get languages
async function getSourceLanguages() {
  if (!sourceLanguagesCache) {
    sourceLanguagesCache = await translator.getSourceLanguages();
  }
  return sourceLanguagesCache;
}

async function getTargetLanguages() {
  if (!targetLanguagesCache) {
    targetLanguagesCache = await translator.getTargetLanguages();
  }
  return targetLanguagesCache;
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
    try {
      // Validate languages before translation
      await validateLanguages(sourceLang, targetLang);

      const result = await translator.translateText(
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
  "rephrase-text",
  "Rephrase text in the same or different language using DeepL API",
  {
    text: z.string().describe("Text to rephrase"),
    targetLang: z.string().nullable().describe("Target language code (e.g. 'en', 'de', null for auto-detection)"),
  },
  async ({ text, targetLang }) => {
    try {
      // First detect the language if not provided
      const detectedResult = await translator.translateText(text, null, /** @type {import('deepl-node').TargetLanguageCode} */ ('en'));
      const lang = /** @type {import('deepl-node').TargetLanguageCode} */ (targetLang || detectedResult.detectedSourceLang);
      
      // Validate the target language
      if (targetLang) {
        await validateLanguages(null, targetLang);
      }

      const result = await translator.translateText(
        text,
        /** @type {import('deepl-node').SourceLanguageCode} */ (lang),
        lang,
        { formality: 'more' } // Using formal language for rephrasing
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
