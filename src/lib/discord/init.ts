import { loginDiscordBot } from './client';

// Initialize Discord bot on server startup
let initialized = false;

export async function initializeDiscordBot(): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    await loginDiscordBot();
    initialized = true;
    console.log('✓ Discord bot initialized');
  } catch (error) {
    console.error('Failed to initialize Discord bot:', error);
    throw error;
  }
}

