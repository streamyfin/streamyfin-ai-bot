import { Message } from 'discord.js';
import { addMessageToHistory } from '../message-history/store';
import { generateChatResponse } from '../ai/chat';
import { getDiscordClient } from './client';

export async function handleMessage(message: Message): Promise<void> {
  let reply;
  
  try {
    // Store user message in history
    await addMessageToHistory({
      channelId: message.channelId,
      messageId: message.id,
      content: message.content,
      authorId: message.author.id,
      authorName: message.author.username,
      isBot: false,
    });

    // Send typing indicator
    await message.channel.sendTyping();

    // Remove bot mention from content
    const content = message.content
      .replace(/<@!?\d+>/g, '')
      .trim();

    // Send initial response
    reply = await message.reply('Thinking...');

    // Generate AI response (this may take a few seconds)
    const response = await generateChatResponse(
      message.channelId,
      content,
      message.author.username
    );

    // Edit reply with actual response
    await reply.edit(response);

    // Store bot response in history
    const client = getDiscordClient();
    await addMessageToHistory({
      channelId: message.channelId,
      messageId: reply.id,
      content: response,
      authorId: client.user!.id,
      authorName: client.user!.username,
      isBot: true,
    });

  } catch (error) {
    console.error('Error handling message:', error);
    const errorMsg = 'Sorry, I encountered an error processing your message.';
    
    if (reply) {
      await reply.edit(errorMsg);
    } else {
      await message.reply(errorMsg);
    }
  }
}

