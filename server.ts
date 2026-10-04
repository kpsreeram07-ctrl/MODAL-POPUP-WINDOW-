import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize GoogleGenAI SDK server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * POST /api/gemini/assistant
 * Handles multi-turn or single-turn chat with the Gemini AI Assistant
 */
app.post('/api/gemini/assistant', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemInstruction =
      'You are a friendly, knowledgeable, and helpful AI Web Development Assistant embedded in an interactive Modal / Popup Window web application. ' +
      'You can explain how HTML5, CSS3, and vanilla JavaScript work together to build accessible, animated modals (scale + fade transitions, backdrop filtering, overlay dismiss, escape key handling, body scroll locking, and form validation). ' +
      'You can also answer any web development or general programming questions, review ideas, help draft messages, and explain best practices. ' +
      'Format your responses cleanly using Markdown (use bolding, bullet points, and code snippets when helpful). Keep answers clear, engaging, and easy to read.';

    // Construct conversation payload
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      for (const item of history) {
        if (
          (item.role === 'user' || item.role === 'model') &&
          typeof item.text === 'string' &&
          item.text.trim().length > 0
        ) {
          contents.push({
            role: item.role,
            parts: [{ text: item.text }],
          });
        }
      }
    }

    // Append the current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I'm sorry, I couldn't generate a response at this time.";
    return res.json({ reply });
  } catch (error: any) {
    console.error('Gemini Assistant API Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to communicate with Gemini AI. Please check server configuration.',
    });
  }
});

/**
 * POST /api/gemini/draft
 * Generates or polishes messages for the contact modal form
 */
app.post('/api/gemini/draft', async (req, res) => {
  try {
    const { action, topic, existingMessage, senderName } = req.body;

    let prompt = '';
    if (action === 'polish' && existingMessage) {
      prompt = `Polish and improve the following message to sound professional, clear, and well-written while preserving the original intent:
"${existingMessage}"
Return ONLY the polished message text without quotation marks or conversational commentary.`;
    } else {
      prompt = `Draft a concise, professional message (2-3 sentences) suitable for a web contact form inquiry about: "${topic || 'General project inquiry'}". 
Sender name is "${senderName || 'Visitor'}".
Return ONLY the drafted message text without quotation marks or conversational commentary.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    const draft = response.text?.trim() || '';
    return res.json({ draft });
  } catch (error: any) {
    console.error('Gemini Draft Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to draft message with Gemini AI.',
    });
  }
});

/**
 * Mount Vite middlewares in development or serve static assets in production
 */
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
