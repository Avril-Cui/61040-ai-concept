import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Configuration for API access
 */
export interface Config {
    apiKey: string;
    maxRetries?: number;
    timeoutMs?: number;
    initialBackoffMs?: number;
}

export class GeminiLLM {
    private apiKey: string;
    private maxRetries: number;
    private timeoutMs: number;
    private initialBackoffMs: number;
    private requestCache: Map<string, string> = new Map(); // For idempotency

    constructor(config: Config) {
        this.apiKey = config.apiKey;
        this.maxRetries = config.maxRetries ?? 3;
        this.timeoutMs = config.timeoutMs ?? 30000; // 30 seconds default
        this.initialBackoffMs = config.initialBackoffMs ?? 1000; // 1 second initial backoff
    }

    /**
     * Execute LLM with timeout, retries with exponential backoff, and idempotency
     */
    async executeLLM(prompt: string): Promise<string> {
        // Check cache for idempotency (same prompt = same response)
        const cachedResponse = this.requestCache.get(prompt);
        if (cachedResponse) {
            console.log('✅ Using cached LLM response (idempotent request)');
            return cachedResponse;
        }

        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const backoffMs = this.initialBackoffMs * Math.pow(2, attempt - 1);
                    console.log(`⏳ Retrying LLM request (attempt ${attempt + 1}/${this.maxRetries + 1}) after ${backoffMs}ms backoff...`);
                    await this.sleep(backoffMs);
                }

                const result = await this.executeWithTimeout(prompt);

                // Cache successful response for idempotency
                this.requestCache.set(prompt, result);

                return result;
            } catch (error) {
                lastError = error as Error;

                if (this.isRetryableError(error)) {
                    console.warn(`⚠️ Retryable error on attempt ${attempt + 1}: ${(error as Error).message}`);
                    continue;
                } else {
                    // Non-retryable error, fail immediately
                    throw this.enhanceErrorMessage(error);
                }
            }
        }

        // All retries exhausted
        throw new Error(
            `❌ LLM request failed after ${this.maxRetries + 1} attempts. Last error: ${lastError?.message || 'Unknown error'}`
        );
    }

    /**
     * Execute LLM call with timeout
     */
    private async executeWithTimeout(prompt: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Request timed out after ${this.timeoutMs}ms`));
            }, this.timeoutMs);

            try {
                const genAI = new GoogleGenerativeAI(this.apiKey);
                const model = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash-lite",
                    generationConfig: {
                        maxOutputTokens: 1000,
                        temperature: 0.1, // Low temperature for more predictable, deterministic output
                    }
                });

                const result = await model.generateContent(prompt);
                const response = result.response;
                const text = response.text();

                clearTimeout(timeoutId);
                resolve(text);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Determine if error is retryable (network issues, rate limits, etc.)
     */
    private isRetryableError(error: unknown): boolean {
        const errorMessage = (error as Error).message?.toLowerCase() || '';

        // Retryable errors: network issues, rate limits, timeouts, server errors
        const retryablePatterns = [
            'timeout',
            'network',
            'econnreset',
            'enotfound',
            'rate limit',
            'quota exceeded',
            '429',
            '500',
            '502',
            '503',
            '504'
        ];

        return retryablePatterns.some(pattern => errorMessage.includes(pattern));
    }

    /**
     * Enhance error messages with context
     */
    private enhanceErrorMessage(error: unknown): Error {
        const originalError = error as Error;
        const errorMessage = originalError.message || 'Unknown error';

        if (errorMessage.includes('API key')) {
            return new Error('❌ API Authentication Error: Invalid or missing API key. Please check your Gemini API key configuration.');
        }
        if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            return new Error('❌ API Quota Error: Rate limit or quota exceeded. Please wait before retrying or upgrade your API plan.');
        }
        if (errorMessage.includes('timeout')) {
            return new Error(`❌ Timeout Error: Request exceeded ${this.timeoutMs}ms timeout. The LLM may be overloaded or network is slow.`);
        }
        if (errorMessage.includes('network') || errorMessage.includes('ECONNRESET')) {
            return new Error('❌ Network Error: Failed to connect to Gemini API. Please check your internet connection.');
        }

        return new Error(`❌ LLM Error: ${errorMessage}`);
    }

    /**
     * Sleep utility for backoff
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear cache (useful for testing or forcing fresh responses)
     */
    clearCache(): void {
        this.requestCache.clear();
    }
}
