import { GoogleGenerativeAI } from '@google/generative-ai';
import env from './env';
import logger from '../utils/logger';

if (!env.GEMINI_API_KEY) {
  logger.error('Missing GEMINI_API_KEY environment variable.');
}

// Initialize the Google GenAI client using the correct legacy SDK imported
export const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// We use the specified "gemini-2.5-flash" or fall back to "gemini-1.5-flash" if the library version is picky,
// but the prompt explicitly requires "Google Gemini 2.5 Flash API".
export const GEMINI_MODEL_NAME = 'gemini-2.5-flash';

export const getGeminiModel = (options?: { responseMimeType?: string }) => {
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL_NAME,
    generationConfig: options ? { responseMimeType: options.responseMimeType } : undefined,
  });
};

export default genAI;
