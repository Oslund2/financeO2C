interface RateLimitConfig {
  requestsPerMinute: number;
  minDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface RateLimitState {
  lastRequestTime: number;
  requestCount: number;
  windowStartTime: number;
  consecutiveErrors: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  requestsPerMinute: 10,
  minDelayMs: 3000,
  maxDelayMs: 30000,
  backoffMultiplier: 2
};

const state: RateLimitState = {
  lastRequestTime: 0,
  requestCount: 0,
  windowStartTime: Date.now(),
  consecutiveErrors: 0
};

export function resetRateLimitState(): void {
  state.lastRequestTime = 0;
  state.requestCount = 0;
  state.windowStartTime = Date.now();
  state.consecutiveErrors = 0;
}

export function recordSuccessfulRequest(): void {
  state.consecutiveErrors = 0;
  state.lastRequestTime = Date.now();
  state.requestCount++;
}

export function recordFailedRequest(): void {
  state.consecutiveErrors++;
  state.lastRequestTime = Date.now();
}

export function getDelayBeforeNextRequest(config: Partial<RateLimitConfig> = {}): number {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  if (now - state.windowStartTime > 60000) {
    state.windowStartTime = now;
    state.requestCount = 0;
  }

  let delay = mergedConfig.minDelayMs;

  if (state.requestCount >= mergedConfig.requestsPerMinute) {
    const timeUntilWindowReset = 60000 - (now - state.windowStartTime);
    delay = Math.max(delay, timeUntilWindowReset + 1000);
  }

  if (state.consecutiveErrors > 0) {
    const backoffDelay = mergedConfig.minDelayMs * Math.pow(mergedConfig.backoffMultiplier, state.consecutiveErrors);
    delay = Math.min(backoffDelay, mergedConfig.maxDelayMs);
  }

  const timeSinceLastRequest = now - state.lastRequestTime;
  if (timeSinceLastRequest < delay) {
    return delay - timeSinceLastRequest;
  }

  return 0;
}

export async function waitForRateLimit(config: Partial<RateLimitConfig> = {}): Promise<void> {
  const delay = getDelayBeforeNextRequest(config);
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('quota') ||
      message.includes('resource_exhausted') ||
      message.includes('too many requests')
    );
  }
  return false;
}

export function getRateLimitStatus(): {
  requestsInWindow: number;
  windowResetIn: number;
  consecutiveErrors: number;
  isThrottled: boolean;
} {
  const now = Date.now();
  const windowResetIn = Math.max(0, 60000 - (now - state.windowStartTime));

  return {
    requestsInWindow: state.requestCount,
    windowResetIn,
    consecutiveErrors: state.consecutiveErrors,
    isThrottled: state.requestCount >= DEFAULT_CONFIG.requestsPerMinute || state.consecutiveErrors > 2
  };
}

export type GenerationMode = 'sequential' | 'batch' | 'manual';

export interface GenerationSettings {
  mode: GenerationMode;
  delayBetweenRequests: number;
  batchSize: number;
  autoRetryOnRateLimit: boolean;
  maxRetries: number;
}

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  mode: 'sequential',
  delayBetweenRequests: 4000,
  batchSize: 3,
  autoRetryOnRateLimit: true,
  maxRetries: 3
};

export function loadGenerationSettings(): GenerationSettings {
  try {
    const saved = localStorage.getItem('storyboard_generation_settings');
    if (saved) {
      return { ...DEFAULT_GENERATION_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load generation settings:', e);
  }
  return DEFAULT_GENERATION_SETTINGS;
}

export function saveGenerationSettings(settings: GenerationSettings): void {
  try {
    localStorage.setItem('storyboard_generation_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save generation settings:', e);
  }
}
