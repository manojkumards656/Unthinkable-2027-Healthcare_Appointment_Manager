export interface LLMResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function withLLMErrorHandling<T>(
  llmCall: () => Promise<T>,
  maxRetries: number = 2,
  timeoutMs: number = 12000
): Promise<LLMResult<T>> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        llmCall(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('LLM_TIMEOUT')), timeoutMs)
        ),
      ]);
      return { success: true, data: result };
    } catch (error: any) {
      console.error(`LLM inference attempt ${attempt + 1} failed:`, error.message || error);

      if (attempt === maxRetries) {
        return {
          success: false,
          error: error.message || 'LLM processing failed after retries',
        };
      }

      // Exponential backoff: 1s, 2s
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }

  return { success: false, error: 'LLM processing failed' };
}
