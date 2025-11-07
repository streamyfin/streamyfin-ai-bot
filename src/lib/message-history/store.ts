import { db } from "../db/client";
import {
  messageHistory,
  type NewMessageHistory,
  type MessageHistory,
} from "../db/schema";
import { eq, desc } from "drizzle-orm";

export interface MessageRecord {
  channelId: string;
  messageId: string;
  content: string;
  authorId: string;
  authorName: string;
  isBot: boolean;
}

export async function addMessageToHistory(
  message: MessageRecord
): Promise<void> {
  await db
    .insert(messageHistory)
    .values({
      channelId: message.channelId,
      messageId: message.messageId,
      content: message.content,
      authorId: message.authorId,
      authorName: message.authorName,
      isBot: message.isBot,
    })
    .onConflictDoNothing();

  // Cleanup old messages - keep only last 100 per channel
  const allMessages = await db
    .select({ id: messageHistory.id })
    .from(messageHistory)
    .where(eq(messageHistory.channelId, message.channelId))
    .orderBy(desc(messageHistory.createdAt));

  if (allMessages.length > 100) {
    const idsToDelete = allMessages.slice(100).map((m) => m.id);
    await db
      .delete(messageHistory)
      .where(eq(messageHistory.id, idsToDelete[0])); // Simplified for now
  }
}

export async function getChannelHistory(
  channelId: string,
  limit: number = 100
): Promise<MessageRecord[]> {
  const messages = await db
    .select()
    .from(messageHistory)
    .where(eq(messageHistory.channelId, channelId))
    .orderBy(desc(messageHistory.createdAt))
    .limit(limit);

  // Reverse to get chronological order
  return messages.reverse().map((msg) => ({
    channelId: msg.channelId,
    messageId: msg.messageId,
    content: msg.content,
    authorId: msg.authorId,
    authorName: msg.authorName,
    isBot: msg.isBot,
  }));
}

export async function clearChannelHistory(channelId: string): Promise<void> {
  await db
    .delete(messageHistory)
    .where(eq(messageHistory.channelId, channelId));
}
