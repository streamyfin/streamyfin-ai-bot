import { loginDiscordBot } from '../src/lib/discord/client';

async function main() {
  console.log('Starting Discord bot...\n');
  
  try {
    await loginDiscordBot();
    console.log('\n✓ Bot is now running!');
    console.log('✓ Ready to receive messages');
    console.log('\nTest the bot by:');
    console.log('  1. Mentioning it in a channel: @BotName hello');
    console.log('  2. Sending it a DM\n');
    console.log('Press Ctrl+C to stop\n');
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

main();

