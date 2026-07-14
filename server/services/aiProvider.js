const { GoogleGenAI, Type } = require('@google/genai');

/**
 * 🧠 AI PROVIDER — Google Gemini
 *
 * The single place the whole app talks to an LLM. One key (GEMINI_API_KEY),
 * one model list, three capabilities: text, JSON, and vision (images / PDFs).
 *
 * Two things here are load-bearing, both learned the hard way:
 *
 *  1. JSON needs a `schema`. `responseMimeType: 'application/json'` alone does
 *     NOT stop Gemini 3 from leaking its reasoning into the response or
 *     stopping mid-string. A responseSchema constrains the output grammar, so
 *     malformed JSON becomes impossible rather than merely unlikely.
 *
 *  2. `maxOutputTokens` is shared with the model's internal thinking. A low cap
 *     plus deep thinking = a truncated answer with finishReason MAX_TOKENS. We
 *     keep thinking shallow for extraction work and surface truncation loudly
 *     instead of handing callers a half-written object.
 */

// Newest first. We only fall through when a model is missing/retired, so a
// deleted preview model degrades instead of taking a feature down. (Every AI
// feature was previously pinned to gemini-2.0-flash-exp, which Google deleted.)
//
// Flash: chat-shaped work — interview questions, answer analysis, resume
// feedback, question generation. Fast and reliable there.
const MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.5-flash',
  'gemini-2.5-flash',
].filter(Boolean);

// Pro: reading documents (grade cards, question papers, handwritten answer
// sheets) into a strict schema. Flash measurably falls apart on this — it drops
// subject rows and occasionally degenerates into a token loop — so parsing pays
// for the stronger model. Callers opt in with `tier: 'parsing'`.
const PARSING_MODELS = [
  process.env.GEMINI_PARSING_MODEL,
  'gemini-3.1-pro-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-pro',
].filter(Boolean);

const isPlaceholder = (k) => !k || /^(your-|YOUR_|<|changeme)/i.test(k);

class AIProvider {
  constructor() {
    const key = process.env.GEMINI_API_KEY;

    if (isPlaceholder(key)) {
      console.warn('⚠️  GEMINI_API_KEY is not set — every AI feature will be unavailable');
      this.genai = null;
      return;
    }

    this.genai = new GoogleGenAI({ apiKey: key });
    console.log(`🧠 Gemini ready — model: ${MODELS[0]}`);
  }

  isAvailable() {
    return !!this.genai;
  }

  /**
   * Plain prose out.
   * @param {string} prompt
   * @param {object} [opts] system, temperature, maxTokens
   * @returns {Promise<string>}
   */
  async generateText(prompt, opts = {}) {
    return this.call(prompt, opts);
  }

  /**
   * Structured output.
   * @param {string|Array} prompt
   * @param {object} [opts] schema (strongly recommended), system, temperature, maxTokens
   * @returns {Promise<object|Array>}
   */
  async generateJSON(prompt, opts = {}) {
    return this.callJSON(prompt, opts);
  }

  /**
   * Images and PDFs. Gemini reads PDFs natively — pass the raw bytes rather
   * than extracting text first; it keeps tables and layout intact.
   * @param {Array} parts e.g. [{ inlineData: { mimeType, data } }, { text: '…' }]
   */
  async generateVision(parts, opts = {}) {
    return opts.json ? this.callJSON(parts, opts) : this.call(parts, opts);
  }

  /** Convenience: wrap a file buffer as an inlineData part. */
  static filePart(buffer, mimeType) {
    return { inlineData: { data: buffer.toString('base64'), mimeType } };
  }

  /* ------------------------------------------------------------------ */

  /**
   * JSON with one repair attempt. A schema makes failure essentially
   * impossible; without one we still retry rather than throwing on a fluke.
   */
  async callJSON(contents, opts) {
    try {
      return parseJSON(await this.call(contents, { ...opts, json: true }));
    } catch (error) {
      if (!/malformed JSON/.test(error.message)) throw error;

      console.warn('⚠️  Gemini returned unparseable JSON — retrying once');
      return parseJSON(await this.call(contents, { ...opts, json: true, temperature: 0 }));
    }
  }

  async call(contents, opts) {
    if (!this.genai) {
      throw new Error('The AI is not configured on the server — GEMINI_API_KEY is missing.');
    }

    const {
      system,
      temperature = 0.7,
      // Generous by default: this budget is shared with the model's thinking,
      // so a tight cap truncates the actual answer.
      maxTokens = 16384,
      json,
      schema,
      thinkingLevel = 'low',
      // 'parsing' routes to the pro chain — use it for reading documents.
      tier = 'default',
    } = opts;

    const models = tier === 'parsing' ? PARSING_MODELS : MODELS;
    let lastError;

    for (const model of models) {
      try {
        const res = await this.genai.models.generateContent({
          model,
          contents,
          config: {
            ...(system ? { systemInstruction: system } : {}),
            temperature,
            maxOutputTokens: maxTokens,
            thinkingConfig: { thinkingLevel },
            ...(json ? { responseMimeType: 'application/json' } : {}),
            ...(json && schema ? { responseSchema: schema } : {}),
          },
        });

        const finishReason = res.candidates?.[0]?.finishReason;
        if (finishReason === 'MAX_TOKENS') {
          throw new Error(
            `Gemini hit the ${maxTokens}-token limit and the answer was cut off. ` +
            'Ask for fewer items, or raise maxTokens.'
          );
        }

        const text = res.text;
        if (!text) throw new Error(`Gemini returned nothing (finishReason: ${finishReason || 'unknown'})`);
        return text;
      } catch (error) {
        lastError = error;

        // Only walk the chain when the model itself is gone. Any other error
        // would fail identically on the next model, so surface it now.
        const modelMissing =
          error.status === 404 || /not found|not supported|unsupported/i.test(error.message || '');

        if (!modelMissing) throw error;
        console.warn(`⚠️  Gemini model ${model} unavailable — falling back`);
      }
    }

    throw lastError || new Error('No usable Gemini model');
  }
}

/** Belt and braces: models still occasionally fence or pad their JSON. */
function parseJSON(text) {
  if (typeof text !== 'string') return text;

  const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch { /* fall through to extraction */ }

  const candidates = [cleaned.indexOf('{'), cleaned.indexOf('[')].filter((i) => i !== -1);
  if (candidates.length) {
    const start = Math.min(...candidates);
    const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch { /* fall through to throw */ }
    }
  }

  throw new Error(`Gemini returned malformed JSON: ${cleaned.slice(0, 160)}`);
}

const provider = new AIProvider();
provider.parseJSON = parseJSON;
provider.filePart = AIProvider.filePart;
provider.Type = Type; // so callers can build schemas without importing the SDK

module.exports = provider;
