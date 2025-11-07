import { Client, GatewayIntentBits, Message, Events } from 'discord.js';
import { handleMessage } from './handlers';

let client: Client | null = null;

export function getDiscordClient(): Client {
  if (!client) {
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    client.once(Events.ClientReady, (c) => {
      console.log(`✓ Discord bot ready as ${c.user.tag}`);
      console.log(`Bot ID: ${c.user.id}`);
      console.log(`Servers: ${c.guilds.cache.size}`);
      c.guilds.cache.forEach(guild => {
        console.log(`  - ${guild.name} (${guild.id})`);
      });
    });

    client.on(Events.MessageCreate, async (message: Message) => {
      // Log all messages for debugging
      console.log(`[MESSAGE] ${message.author.tag}: ${message.content.substring(0, 50)}...`);
      
      if (message.author.bot) {
        console.log('  ↳ Ignored (bot message)');
        return;
      }
      
      // Only respond to mentions or DMs
      const botMentioned = message.mentions.has(client!.user!.id);
      const isDM = message.channel.isDMBased();
      
      if (botMentioned || isDM) {
        console.log(`  ↳ Processing (${isDM ? 'DM' : 'mention'})`);
        await handleMessage(message);
      } else {
        console.log('  ↳ Ignored (not mentioned)');
      }
    });

    client.on(Events.Error, (error) => {
      console.error('Discord client error:', error);
    });

    client.on(Events.Warn, (warning) => {
      console.warn('Discord client warning:', warning);
    });
  }

  return client;
}

export async function loginDiscordBot(): Promise<void> {
  const client = getDiscordClient();
  
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is required');
  }

  if (!client.isReady()) {
    console.log('Logging in to Discord...');
    await client.login(process.env.DISCORD_TOKEN);
  }
}

export async function logoutDiscordBot(): Promise<void> {
  if (client) {
    await client.destroy();
    client = null;
  }
}
