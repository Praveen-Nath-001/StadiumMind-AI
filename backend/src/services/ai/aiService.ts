import { getGeminiModel } from '../../config/gemini';
import { z } from 'zod';
import logger from '../../utils/logger';
import prisma from '../../config/db';

export class AIService {
  private static MAX_RETRIES = 3;

  /**
   * Cleans text to prevent system prompts from leaking and sanitizes input.
   */
  private static cleanInput(text: string): string {
    return text.replace(/(system prompt|instructions|override|ignore)/gi, '[FILTERED]');
  }

  /**
   * Helper to execute Gemini with retry logic
   */
  private static async executeWithRetry(
    prompt: string,
    systemPrompt: string,
    isJson = false
  ): Promise<string> {
    let attempts = 0;
    const model = getGeminiModel(isJson ? { responseMimeType: 'application/json' } : undefined);

    while (attempts < this.MAX_RETRIES) {
      try {
        attempts++;
        logger.debug(`Gemini request attempt ${attempts}/${this.MAX_RETRIES}`);

        // Set the system instruction. Depending on the SDK structure, systemInstructions can be passed as contents or parameter.
        // For standard @google/generative-ai, we can include system instructions directly inside the content prompt wrapper.
        const combinedPrompt = `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\nUSER INPUT / CONTEXT:\n${prompt}\n\nGenerate the response conforming exactly to the instruction and schema:`;

        const result = await model.generateContent(combinedPrompt);
        const responseText = result.response.text();

        if (!responseText) {
          throw new Error('Empty response received from Gemini');
        }

        return responseText;
      } catch (err: any) {
        logger.error(`Gemini request failure on attempt ${attempts}: ${err.message}`);
        if (attempts >= this.MAX_RETRIES) {
          throw new Error(`AI service failed after ${this.MAX_RETRIES} attempts. Error: ${err.message}`);
        }
        // Small delay before retrying
        await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
      }
    }

    throw new Error('AI execution completed without response');
  }

  /**
   * Feature 1: Universal Fan Assistant
   */
  public static async answerFanQuery(
    userId: string,
    userQuery: string,
    conversationId?: string
  ): Promise<{ response: string; detectedLanguage: string }> {
    const sanitizedQuery = this.cleanInput(userQuery);

    const systemPrompt = `You are "StadiumMind AI Companion", an official virtual representative for the FIFA World Cup 2026 stadium operations.
Your job is to answer the user's questions about: Seat guidance, Gate directions, Parking, Food courts, Restrooms, Medical assistance, Emergency exits, Transport, Accessibility, Venue policies, Lost and Found, Weather, and general Tournament information.

RULES:
1. First, automatically detect the language of the user's query. The supported languages are: English, Spanish, French, Portuguese, Arabic, Hindi. If the query is in another language, respond in English explaining that you support these 6 languages.
2. Formulate your answer in the detected language.
3. Be professional, clear, helpful, and concise. Never fabricate answers. If details are not provided or simulated API state is missing, state it honestly and guide them to nearest stadium staff.
4. Output your response as a valid JSON object matching this schema:
{
  "detectedLanguage": "string (en | es | fr | pt | ar | hi)",
  "answer": "string (the actual response translated/written in the detected language)"
}`;

    try {
      const jsonResponse = await this.executeWithRetry(sanitizedQuery, systemPrompt, true);
      const parsed = JSON.parse(jsonResponse);

      const responseSchema = z.object({
        detectedLanguage: z.enum(['en', 'es', 'fr', 'pt', 'ar', 'hi']),
        answer: z.string().min(1),
      });

      const validated = responseSchema.parse(parsed);

      // Record to audit/analytics logs
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'AI_FAN_ASSISTANCE',
          details: { query: sanitizedQuery.substring(0, 100), detectedLanguage: validated.detectedLanguage },
        },
      });

      return {
        response: validated.answer,
        detectedLanguage: validated.detectedLanguage,
      };
    } catch (e: any) {
      logger.error(`AI Fan Assistance error: ${e.message}. Falling back to default response.`);
      return {
        response: "Welcome to FIFA World Cup 2026. I am currently experiencing connection difficulties. Please consult our on-site volunteers at the nearest info kiosk.",
        detectedLanguage: 'en',
      };
    }
  }

  /**
   * Universal Fan Assistant Streaming version
   */
  public static async answerFanQueryStream(
    userQuery: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const sanitizedQuery = this.cleanInput(userQuery);
    const systemPrompt = `You are "StadiumMind AI Companion", an official virtual representative for the FIFA World Cup 2026.
Answer the user's questions about seat guidance, gates, parking, food, restrooms, medical aid, transport, or venue policies.
Be clear, helpful, and write in the language matching the user query.`;

    const combinedPrompt = `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\nUSER INPUT:\n${sanitizedQuery}\n\nGenerate the response:`;
    const model = getGeminiModel();

    try {
      const result = await model.generateContentStream(combinedPrompt);
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          onChunk(text);
        }
      }
    } catch (err: any) {
      logger.error(`AI Fan Assistance streaming error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Feature 2: Route Describer
   */
  public static async explainRoute(
    routeNodes: string[],
    accessibilityMode: string
  ): Promise<string> {
    const systemPrompt = `You are a Stadium Mind AI Navigation Assistant. 
You are given a list of sequential locations (nodes) representing a calculated navigation path.
Describe the route naturally, highlighting accessibility conditions if applicable.

MODE CONTEXT: ${accessibilityMode}
- FASTEST: Emphasize speed and direct paths.
- LEAST_CROWDED: Warn about congested sections.
- WHEELCHAIR_ACCESSIBLE: Emphasize lifts, ramps, flat surfaces, and mention if stairs are avoided.
- FAMILY_FRIENDLY: Emphasize low stress, seating zones, and safety.

Explain the route step-by-step in natural, clean, friendly language.`;

    const context = `Calculated Path Nodes: ${routeNodes.join(' -> ')}\nMode: ${accessibilityMode}`;

    try {
      const response = await this.executeWithRetry(context, systemPrompt, false);
      return response.trim();
    } catch (e: any) {
      logger.error(`AI Route explainer failure: ${e.message}`);
      return `Follow the route path: ${routeNodes.join(' to ')}. This path is estimated at 5 minutes walking distance.`;
    }
  }

  /**
   * Feature 3: Smart Crowd / Operations Briefing
   */
  public static async generateOperationsBriefing(
    zonesData: any[],
    incidentsData: any[]
  ): Promise<{ briefing: string; actions: string[] }> {
    const systemPrompt = `You are StadiumMind Chief Operational Intelligence AI for the FIFA World Cup 2026.
Synthesize the provided telemetry data of crowd densities, gate queues, and active incidents into an operational intelligence briefing.

RULES:
1. Provide a succinct overview summary under "briefing".
2. Recommend a prioritized list of actionable steps (e.g. "Open Gate B to relieve queue", "Redeploy medical volunteers to Section 102").
3. Format output as a JSON object matching this schema:
{
  "briefing": "string summary",
  "actions": ["string action 1", "string action 2"]
}`;

    const context = `Zones Data: ${JSON.stringify(zonesData)}\nActive Incidents: ${JSON.stringify(incidentsData)}`;

    try {
      const jsonResponse = await this.executeWithRetry(context, systemPrompt, true);
      const parsed = JSON.parse(jsonResponse);

      const schema = z.object({
        briefing: z.string(),
        actions: z.array(z.string()),
      });

      return schema.parse(parsed);
    } catch (e: any) {
      logger.error(`AI Operations Briefing failure: ${e.message}`);
      return {
        briefing: 'Unable to analyze real-time telemetry safely. Monitor standard zone maps and incident feeds.',
        actions: ['Verify network connectivity to crowd density sensors', 'Check status of active incidents manually'],
      };
    }
  }

  /**
   * Feature 4: Emergency Incident Advisor
   */
  public static async analyzeEmergency(
    type: string,
    severity: string,
    zone: string,
    description: string
  ): Promise<{
    summary: string;
    volunteerInstructions: string;
    publicAnnouncement: string;
    nearestExit: string;
  }> {
    const systemPrompt = `You are a certified StadiumMind DevSecOps Crisis AI. 
Analyze the reported emergency incident and output operational strategies to safeguard lives.

RULES:
1. Provide a concise crisis summary.
2. Provide critical directions for volunteers in the zone.
3. Provide a public announcement script to read over speakers (multilingual, friendly but serious, instructions to evacuate or stay calm).
4. Identify the nearest exits or safety procedures.
5. Output output as a JSON object matching this schema:
{
  "summary": "string summary",
  "volunteerInstructions": "string instructions",
  "publicAnnouncement": "string announcement script",
  "nearestExit": "string location/exit details"
}`;

    const context = `Incident Type: ${type}\nSeverity: ${severity}\nZone: ${zone}\nDetails: ${description}`;

    try {
      const jsonResponse = await this.executeWithRetry(context, systemPrompt, true);
      const parsed = JSON.parse(jsonResponse);

      const schema = z.object({
        summary: z.string(),
        volunteerInstructions: z.string(),
        publicAnnouncement: z.string(),
        nearestExit: z.string(),
      });

      return schema.parse(parsed);
    } catch (e: any) {
      logger.error(`AI Emergency Advisor failure: ${e.message}`);
      return {
        summary: `Emergency: ${type} reported at ${zone}.`,
        volunteerInstructions: 'Proceed to coordinates immediately and secure exits.',
        publicAnnouncement: `Attention fans in ${zone}: Please proceed to the nearest exit calmly. Follow volunteer instructions.`,
        nearestExit: 'Main gate / emergency doors',
      };
    }
  }

  /**
   * Feature 6: Sustainability Audit Advisor
   */
  public static async auditSustainability(
    metrics: any
  ): Promise<{ carbonAudit: string; optimizationRecommendations: string[] }> {
    const systemPrompt = `You are the StadiumMind Sustainability Auditor.
Examine the energy, water, waste, and food waste metrics and generate concrete recommendations.

RULES:
1. Draft a sustainability progress statement under "carbonAudit".
2. Propose concrete operational actions under "optimizationRecommendations" (e.g. "Divert food waste to bio-bins in Food Plaza A").
3. Output a JSON object matching this schema:
{
  "carbonAudit": "string analysis of emission footprint",
  "optimizationRecommendations": ["string recommendation 1", "string recommendation 2"]
}`;

    const context = `Utility Metrics: ${JSON.stringify(metrics)}`;

    try {
      const jsonResponse = await this.executeWithRetry(context, systemPrompt, true);
      const parsed = JSON.parse(jsonResponse);

      const schema = z.object({
        carbonAudit: z.string(),
        optimizationRecommendations: z.array(z.string()),
      });

      return schema.parse(parsed);
    } catch (e: any) {
      logger.error(`AI Sustainability Advisor failure: ${e.message}`);
      return {
        carbonAudit: 'Unable to compile carbon audit footprint automatically.',
        optimizationRecommendations: ['Initiate manual cleaning and trash audit', 'Check energy grid logging status'],
      };
    }
  }
}
export default AIService;
