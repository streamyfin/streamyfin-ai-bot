import { Message, MessageReaction, User } from 'discord.js';
import { addMessageToHistory } from '../message-history/store';
import { generateChatResponse } from '../ai/chat';
import { getDiscordClient } from './client';
import { db } from '../db/client';
import { messageHistory, embeddings } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { searchEmbeddings } from '../embeddings/search';
import { getTopAIMessagesForQuery } from '../embeddings/search';
import { storeDiscordAIResponses } from '../embeddings/generator';

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
    const learningEmbed = await searchEmbeddings(content, 5, 0.1, true);
    const context = learningEmbed.map(c => c.content).join('\n---\n');

    const aiexamples = await getTopAIMessagesForQuery(content, 2);
    let examples = '';

    if (aiexamples.length > 0) {
      examples = 'Here are examples of strong replies:\n' + aiexamples.map(e => e.content).join('\n---\n') + '\n\n';
    }

    const prompt = `${examples}Based on the following context:\n${context}\nRespond to: ${content}`;

    // Generate AI response (this may take a few seconds)
    const response = await generateChatResponse(
      message.channelId,
      prompt,
      message.author.username
    );
    // Edit reply with actual response
    const msgReply = await reply.edit(response);
    await msgReply.react("👍");
    await msgReply.react("👎");

    if (response && response.length > 0) {
      storeDiscordAIResponses({ response: response || '', messageId: msgReply.id });
    }
    const filter = (reaction: MessageReaction, user: User) =>
      reaction.emoji.name !== null && ["👍", "👎"].includes(reaction.emoji.name) && user.id === message.author.id;

    const collector = msgReply.createReactionCollector({ filter, max: 1, time: 180_000 });

    collector.on("collect", async (reaction: MessageReaction) => {
      const feedbackType = reaction.emoji.name === "👍" ? 1 : -1;
      let updateFeedback = await updateRAGFeedback(message.channelId, msgReply.id, feedbackType)
      if (typeof updateFeedback === 'string') return msgReply.reply(updateFeedback);

    });

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
async function updateRAGFeedback(channelId: string, messageId: string, feedbackType: number): Promise<string | void> {
  try {

    const aiMessage = await db
      .select()
      .from(messageHistory)
      .where(and(eq(messageHistory.channelId, channelId), eq(messageHistory.messageId, messageId)))
      .limit(1);

    let aiResponse: any = aiMessage[0];
    if (!aiResponse) {
      const aiChats = db.select().from(messageHistory).where(eq(messageHistory.channelId, channelId)).limit(100);
      aiResponse = (await aiChats).find((msg) => msg.messageId === messageId && msg.isBot)
    }
    if (!aiResponse) {
      return;
    }

    const userChats = await db.select().from(messageHistory).where(eq(messageHistory.channelId, channelId)).limit(100);

    userChats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const userMsg = userChats.find((m) => !m.isBot && new Date(m.createdAt) <= new Date(aiResponse.createdAt));

    if (!userMsg) return;

    const query = userMsg.content;

    const results = await searchEmbeddings(query, 5);

    if (!results || results.length === 0) return;

    const updates: Array<{ id: number, meta: any }> = [];

    for (const r of results) {
      if (!r.id) continue;

      const rows = await db.select().from(embeddings).where(eq(embeddings.id, r.id)).limit(1);
      const row = rows[0];
      if (!row) continue;

      const meta: any = { ...(row.metadata || {}) };
      meta.upvotes = meta.upvotes || 0;
      meta.downvotes = meta.downvotes || 0;
      meta.feedbackScore = meta.feedbackScore || 0;
      //Maybe weight trustable users more (by .2-.5)
      if (feedbackType > 0) {
        meta.upvotes += 1;
        meta.feedbackScore += 1;
      } else {
        meta.downvotes += 1;
        meta.feedbackScore -= 1;
      }

      updates.push({ id: r.id, meta });
    }
    await db.transaction(async tx => {
      for (const u of updates) {
        await tx
          .update(embeddings)
          .set({ metadata: u.meta, updatedAt: new Date() })
          .where(eq(embeddings.id, u.id));
      }
    });
    return `Thanks for your feedback! Successfully updated!`
  } catch (error) {
    console.error('Feedback error:', error);
    return 'Sorry, I encountered an error while processing your feedback.';
  }
}