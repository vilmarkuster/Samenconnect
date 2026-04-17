/**
 * Server-side Anthropic API key (vacature-/intake-AI, Match Agent, enz.).
 * Ondersteunt meerdere env-namen zodat live (Vercel) niet stil faalt op een typo.
 */
export function getAnthropicServerApiKey(): string | undefined {
  const k =
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.ANTHROPIC_SECRET_KEY?.trim() ||
    process.env.CLAUDE_API_KEY?.trim();
  return k || undefined;
}
