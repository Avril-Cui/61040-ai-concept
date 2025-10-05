import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Configuration for API access
 */
export interface Config {
    apiKey: string;
}

export class GeminiLLM {
    private apiKey: string;

    constructor(config: Config) {
        this.apiKey = config.apiKey;
    }

    async executeLLM (prompt: string): Promise<string> {
        try {
            // Initialize Gemini AI
            const genAI = new GoogleGenerativeAI(this.apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash-lite",
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.1, // Low temperature for more predictable, deterministic output
                }
            });
            // Execute the LLM
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return text;            
        } catch (error) {
            console.error('❌ Error calling Gemini API:', (error as Error).message);
            throw error;
        }    }
}
