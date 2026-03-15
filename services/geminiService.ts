import { GoogleGenAI, SchemaType, Type } from "@google/genai";
import { GroundingSource, QuizData } from "../types";

const QUOTA_STORAGE_KEY = 'concepta.geminiUsageByKey';
const QUOTA_CURSOR_STORAGE_KEY = 'concepta.geminiKeyCursor';
const REQUEST_LIMIT_PER_MINUTE = 5;
const REQUEST_LIMIT_PER_DAY = 20;
const SAFETY_STOP_PER_MINUTE = REQUEST_LIMIT_PER_MINUTE - 1;
const SAFETY_STOP_PER_DAY = REQUEST_LIMIT_PER_DAY - 1;

const getConfiguredApiKeys = (): string[] => {
  const multi = (process.env.GEMINI_API_KEYS || '').split(',').map((key) => key.trim()).filter(Boolean);
  const primary = (process.env.API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (multi.length > 0) return multi;
  return primary ? [primary] : [];
};

const sanitizeTimestamps = (input: unknown): number[] => {
  if (!Array.isArray(input)) return [];
  return input.filter((value) => Number.isFinite(value));
};

const reserveGeminiRequest = (): GoogleGenAI => {
  const keys = getConfiguredApiKeys();
  if (keys.length === 0) {
    throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY or GEMINI_API_KEYS in .env.local.');
  }

  if (typeof window === 'undefined') {
    return new GoogleGenAI({ apiKey: keys[0] });
  }

  const now = Date.now();
  const minuteAgo = now - 60_000;
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();

  let usageByKey: Record<string, number[]> = {};
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        usageByKey = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, sanitizeTimestamps(v)])
        );
      }
    }
  } catch {
    usageByKey = {};
  }

  const rawCursor = Number(localStorage.getItem(QUOTA_CURSOR_STORAGE_KEY));
  const cursor = Number.isFinite(rawCursor) ? Math.abs(Math.floor(rawCursor)) % keys.length : 0;

  for (let i = 0; i < keys.length; i += 1) {
    const keyIndex = (cursor + i) % keys.length;
    const keyId = `k${keyIndex}`;
    const existing = usageByKey[keyId] || [];
    const todayTimestamps = existing.filter((ts) => ts >= dayStartMs);
    const minuteTimestamps = todayTimestamps.filter((ts) => ts >= minuteAgo);

    if (todayTimestamps.length >= SAFETY_STOP_PER_DAY) continue;
    if (minuteTimestamps.length >= SAFETY_STOP_PER_MINUTE) continue;

    const updatedTimestamps = [...todayTimestamps, now];
    usageByKey[keyId] = updatedTimestamps;
    localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(usageByKey));
    localStorage.setItem(QUOTA_CURSOR_STORAGE_KEY, String((keyIndex + 1) % keys.length));
    return new GoogleGenAI({ apiKey: keys[keyIndex] });
  }

  throw new Error(`All Gemini keys reached safety stop (${SAFETY_STOP_PER_MINUTE}/${REQUEST_LIMIT_PER_MINUTE} per minute or ${SAFETY_STOP_PER_DAY}/${REQUEST_LIMIT_PER_DAY} per day per key).`);
};

const isQuotaError = (error: any): boolean => {
  const status = error?.status || error?.error?.status;
  const message = String(error?.message || error?.error?.message || "").toLowerCase();
  return status === "RESOURCE_EXHAUSTED" || message.includes("quota") || message.includes("429");
};

const escapeXml = (input: string): string =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toBase64 = (value: string): string => {
  // Use UTF-8 safe conversion in the browser.
  return btoa(unescape(encodeURIComponent(value)));
};

const wrapText = (text: string, maxCharsPerLine: number, maxLines: number): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines - 1) break;
  }

  if (lines.length < maxLines && current) lines.push(current);

  const joined = words.join(' ');
  const rendered = lines.join(' ');
  if (joined.length > rendered.length && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(0, maxCharsPerLine - 3))}...`;
  }

  return lines.slice(0, maxLines);
};

const buildFallbackSvg = (title: string, bullets: string[]): string => {
  const safeTitle = escapeXml(title.slice(0, 70));
  const bulletLines: string[] = [];
  let y = 200;
  bullets.slice(0, 6).forEach((bullet, idx) => {
    const lines = wrapText(bullet, 70, 2).map((line) => escapeXml(line));
    if (lines.length === 0) return;

    bulletLines.push(`<circle cx="74" cy="${y - 8}" r="8" fill="${idx % 2 === 0 ? "#06b6d4" : "#fb923c"}"/>`);
    lines.forEach((line) => {
      bulletLines.push(`<text x="94" y="${y}" fill="#0f172a" font-size="24" font-family="Quicksand, Arial">${line}</text>`);
      y += 34;
    });
    y += 20;
  });

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ecfeff"/>
      <stop offset="100%" stop-color="#fff7ed"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect x="50" y="50" width="1100" height="800" rx="28" fill="#ffffff" stroke="#bae6fd" stroke-width="4"/>
  <rect x="78" y="84" width="12" height="44" rx="6" fill="#06b6d4"/>
  <text x="108" y="118" fill="#0f172a" font-size="42" font-weight="700" font-family="Quicksand, Arial">${safeTitle}</text>
  <text x="84" y="156" fill="#475569" font-size="21" font-family="Quicksand, Arial">Generated via fallback mode when image quota is temporarily exhausted.</text>
  ${bulletLines.join('')}
  <text x="84" y="812" fill="#64748b" font-size="18" font-family="Quicksand, Arial">Tip: retry image generation later or use a billed Gemini project for higher image quotas.</text>
</svg>`;
};

const generateFallbackVisual = async (text: string): Promise<string> => {
  try {
    const ai = reserveGeminiRequest();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extract up to 6 concise learning points from the topic below. Return each point on a new line only.\n\nTopic:\n${text.substring(0, 2500)}`
    });

    const lines = (response.text || "")
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 6);

    const svg = buildFallbackSvg("Concepta Visual Summary", lines.length > 0 ? lines : ["Key concept summary unavailable", "Please retry visual generation shortly"]);
    return `data:image/svg+xml;base64,${toBase64(svg)}`;
  } catch {
    const svg = buildFallbackSvg("Concepta Visual Summary", [
      "Image quota is currently exhausted",
      "Use explanation and verification tabs meanwhile",
      "Retry visual generation in a short while"
    ]);
    return `data:image/svg+xml;base64,${toBase64(svg)}`;
  }
};

/**
 * Generates a text explanation using Gemini Pro for complex reasoning.
 */
export const generateExplanation = async (text: string): Promise<string> => {
  if (!text) return "";
  
  try {
    const ai = reserveGeminiRequest();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an expert tutor. Analyze the following text and provide a comprehensive yet easy-to-understand explanation. 
      
      IMPORTANT: You must output the response in strictly segmented Markdown sections. 
      Start every new section with a Header 1 (#) or Header 2 (##). 
      Do NOT include a preamble before the first header.

      Required Structure:
      # Executive Summary
      (A brief 2-3 sentence high-level overview of the content)

      ## Key Concepts
      (A bulleted list of the most important terms and ideas)

      ## Detailed Analysis
      (A deeper dive into the mechanics, context, or details)

      ## Conclusion
      (A final wrapping thought or takeaway)
      
      Text to analyze:
      ${text}`,
      config: {
        thinkingConfig: { thinkingBudget: 1024 } 
      }
    });
    return response.text || "No explanation generated.";
  } catch (error) {
    console.error("Explanation error:", error);
    try {
      const ai = reserveGeminiRequest();
      const fallback = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an expert tutor. Explain this clearly in markdown with sections: Executive Summary, Key Concepts, Detailed Analysis, Conclusion.\n\nText:\n${text.substring(0, 6000)}`
      });
      return fallback.text || "No explanation generated.";
    } catch (fallbackError) {
      console.error("Explanation fallback error:", fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Generates an initial infographic/visual using Gemini Flash Image.
 */
export const generateVisual = async (text: string): Promise<string> => {
  if (!text) return "";
  
  try {
    // First, ask for a prompt optimized for image generation
    const promptAi = reserveGeminiRequest();
    const promptResponse = await promptAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a detailed image generation prompt for an educational infographic that visualizes the following text. 
      The prompt should describe a clean, modern, flat-design infographic.
      Text: ${text.substring(0, 2000)}` // Limit text length for prompt generation
    });
    
    const imagePrompt = promptResponse.text || "An educational infographic summarizing the text.";

    // Generate the image
    const imageAi = reserveGeminiRequest();
    const response = await imageAi.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: imagePrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "4:3",
        }
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Visual generation error:", error);
    if (isQuotaError(error)) {
      return generateFallbackVisual(text);
    }
    throw error;
  }
};

/**
 * Edits an existing image based on user prompt using Gemini Flash Image (Nano banana).
 */
export const editVisual = async (imageBase64: string, instruction: string): Promise<string> => {
  // Strip prefix if present for API call
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  try {
    const ai = reserveGeminiRequest();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/png' 
            }
          },
          { text: instruction }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited image returned");
  } catch (error) {
    console.error("Image edit error:", error);
    // Keep previous visual when edit can't run (e.g., quota exhausted).
    if (isQuotaError(error)) {
      return imageBase64;
    }
    throw error;
  }
};

/**
 * Generates an interactive simulation code using Gemini Pro.
 */
export const generateSimulation = async (text: string): Promise<string> => {
  if (!text) return "";
  try {
    const ai = reserveGeminiRequest();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an expert frontend developer. Create a single-file HTML/JS interactive simulation or visualization to explain the concepts in the following text.
      
      Requirements:
      - Use HTML5, CSS3, and Vanilla JavaScript.
      - The code must be completely self-contained (no external CSS/JS links, no external images).
      - Make it visually appealing, modern, and educational.
      - Add interactivity (buttons, sliders, hover effects, or inputs) to help the user understand the concept dynamically.
      - Ensure the layout is responsive and fits in a small container.
      - Use a light background color (white or very light gray) for the simulation canvas.
      - Do not include any markdown formatting or backticks in the response. Return ONLY the raw HTML code.
      
      Text to visualize:
      ${text.substring(0, 3000)}`
    });
    
    let code = response.text || "";
    // Clean up markdown formatting if present despite instructions
    code = code.replace(/```html/g, '').replace(/```/g, '');
    return code;
  } catch (error) {
    console.error("Simulation generation error:", error);
    try {
      const ai = reserveGeminiRequest();
      const fallback = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a self-contained single-file HTML + JS simulation (no markdown fences) for this topic:\n${text.substring(0, 3000)}`
      });
      let code = fallback.text || "";
      code = code.replace(/```html/g, '').replace(/```/g, '');
      return code;
    } catch (fallbackError) {
      console.error("Simulation fallback error:", fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Edits/Updates an existing simulation code based on user instruction.
 */
export const editSimulation = async (currentCode: string, instruction: string): Promise<string> => {
  if (!currentCode || !instruction) return currentCode;
  try {
    const ai = reserveGeminiRequest();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an expert frontend developer. You are given an existing HTML/JS simulation code and a user instruction to modify it.
      
      User Instruction: ${instruction}
      
      Existing Code:
      ${currentCode.substring(0, 10000)}

      Requirements:
      - Apply the user's requested changes to the code.
      - Maintain the self-contained single-file HTML/JS structure.
      - Ensure the code remains functional and error-free.
      - Do not include any markdown formatting or backticks. Return ONLY the raw HTML code.
      `
    });
    
    let code = response.text || "";
    code = code.replace(/```html/g, '').replace(/```/g, '');
    return code;
  } catch (error) {
    console.error("Simulation edit error:", error);
    throw error;
  }
};

/**
 * Verifies facts using Google Search Grounding.
 */
export const verifyText = async (text: string): Promise<{ explanation: string; sources: GroundingSource[] }> => {
  try {
    const ai = reserveGeminiRequest();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Verify the key claims in the following text using Google Search. Provide a report on accuracy and add up-to-date context if needed.
      
      Text: ${text.substring(0, 3000)}`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const explanation = response.text || "No verification info returned.";
    
    // Parse grounding chunks
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .map((chunk: any) => chunk.web)
      .filter((web: any) => web && web.uri && web.title)
      .map((web: any) => ({ uri: web.uri, title: web.title }));

    // Deduplicate sources
    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

    return { explanation, sources: uniqueSources };
  } catch (error) {
    console.error("Verification error:", error);
    throw error;
  }
};

/**
 * Generates a comprehensive quiz with 4 types of questions.
 */
export const generateQuiz = async (text: string, difficulty: string = 'Medium', count: number = 5): Promise<QuizData> => {
  if (!text) throw new Error("No context provided for quiz generation");

  // Distribute questions roughly evenly among types, or simplify for demo
  const countPerType = Math.max(1, Math.floor(count / 4));

  try {
    const ai = reserveGeminiRequest();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a structured quiz based on the following text.
      Difficulty Level: ${difficulty}.
      The quiz MUST have 4 sections: 'choose' (Multiple Choice), 'fillBlank' (Fill in the blank), 'match' (Matching pairs), and 'answer' (Short Answer).
      Generate approximately ${countPerType} questions per section, totaling roughly ${count} questions.
      
      Text context: ${text.substring(0, 4000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING, description: "A short 2-3 word topic title" },
            choose: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING }
                },
                required: ["id", "question", "options", "correctAnswer"]
              }
            },
            fillBlank: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING, description: "Instruction like 'Fill in the blank'" },
                  sentence: { type: Type.STRING, description: "Sentence with '___' as placeholder" },
                  correctAnswer: { type: Type.STRING }
                },
                required: ["id", "question", "sentence", "correctAnswer"]
              }
            },
            match: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING, description: "Instruction e.g. 'Match the terms'" },
                  pairs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        left: { type: Type.STRING },
                        right: { type: Type.STRING }
                      },
                      required: ["left", "right"]
                    }
                  }
                },
                required: ["id", "question", "pairs"]
              }
            },
            answer: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  sampleAnswer: { type: Type.STRING }
                },
                required: ["id", "question", "sampleAnswer"]
              }
            }
          },
          required: ["topic", "choose", "fillBlank", "match", "answer"]
        }
      }
    });

    const jsonStr = response.text || "{}";
    return JSON.parse(jsonStr) as QuizData;
  } catch (error) {
    console.error("Quiz generation error:", error);
    throw error;
  }
};

/**
 * Creates a specialized Chat session for the Feynman Student Mode.
 */
export const createStudentSession = (topic: string) => {
  const apiKey = getConfiguredApiKeys()[0];
  if (!apiKey) throw new Error("Gemini API key is not configured");
  const ai = new GoogleGenAI({ apiKey });
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `You are a curious, university-level student named "Alex". The user is your teacher who is explaining the topic "${topic}" to you.
      
      Your Goal: Completely understand the topic "${topic}" by asking questions.

      Behavior Guidelines:
      1.  **Be inquisitive**: Listen carefully. If the user explains something, ask a follow-up question to clarify or deepen your understanding.
      2.  **Be honest about confusion**: If the user uses jargon or complex terms without defining them, ask "What does that mean?" or "Can you give me an analogy?".
      3.  **Active Listening**: Periodically summarize what you've heard to check if you got it right (e.g., "So, if I understand correctly...").
      4.  **Student Persona**: You are polite, eager to learn, but strictly a student. Do NOT lecture the user. Do NOT act as an expert. Do NOT start explaining the topic yourself unless summarizing.
      5.  **Brevity**: Keep your responses conversational and short (under 50 words) to allow the user to keep teaching.
      6.  **Initiation**: Start the conversation by confirming you are ready to learn about ${topic}.
      
      Tone: Friendly, casual, attentive.`
    }
  });
  return chat;
};

/**
 * Sends a message (text or audio) to the student chat session.
 */
export const sendMessageToStudent = async (chat: any, text: string | null, audioBase64: string | null): Promise<string> => {
  if (!chat) throw new Error("Chat session not initialized");

  const parts = [];
  
  if (audioBase64) {
      // Clean base64 if needed (remove data URL prefix)
      const cleanAudio = audioBase64.replace(/^data:audio\/\w+;base64,/, "");
      parts.push({ 
          inlineData: { 
              mimeType: 'audio/webm', // WebM is standard for browser MediaRecorder
              data: cleanAudio 
          } 
      });
  }
  
  if (text) {
      parts.push({ text });
  }

  if (parts.length === 0) return "";

  try {
      reserveGeminiRequest();
      // Pass the parts array directly as the message
      const response = await chat.sendMessage({ message: parts });
      return response.text || "";
  } catch (error) {
      console.error("Student Chat Error:", error);
      throw error;
  }
};