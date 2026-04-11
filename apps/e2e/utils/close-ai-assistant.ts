import type { Page } from "@playwright/test";

/**
 * Helper to close the AI Assistant sheet/dialog if it's open.
 * AI Assistant UI has been removed (story 17-01). This function is kept as a
 * no-op to avoid breaking the many E2E tests that import it.
 * TODO: Remove this utility and its imports in a future cleanup pass.
 */
export async function closeAIAssistantDialog(_page: Page) {
  // No-op: AI Assistant UI removed in story 17-01
}
