import { getNextJob, completeJob, failJob, retryJob } from './queue';
import { generateChatResponse } from '../ai/chat';
import { generateEmbeddings } from '../embeddings/generator';
import { getDiscordClient } from '../discord/client';
import { addMessageToHistory } from '../message-history/store';

export async function processNextJob(): Promise<boolean> {
  const job = await getNextJob();
  
  if (!job) {
    return false;
  }

  console.log(`Processing job ${job.id}: ${job.type}`);

  try {
    switch (job.type) {
      case 'chat_response':
        await processChatResponse(job);
        break;
      case 'generate_embeddings':
        await processEmbeddingGeneration(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await completeJob(job.id);
    console.log(`✓ Job ${job.id} completed`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error processing job ${job.id}:`, errorMessage);

    if (job.retry_count + 1 < job.max_retries) {
      await retryJob(job.id, errorMessage);
      console.log(`Job ${job.id} will be retried`);
    } else {
      await failJob(job.id, errorMessage);
      console.log(`Job ${job.id} failed permanently`);
    }

    return true;
  }
}

async function processChatResponse(job: any): Promise<void> {
  const { channelId, messageId, replyMessageId, content, authorName } = job.payload;

  // Generate AI response
  const response = await generateChatResponse(channelId, content, authorName);

  // Send response via Discord
  const client = getDiscordClient();
  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    throw new Error('Invalid channel');
  }

  let botMessage;
  if (replyMessageId) {
    // Edit existing reply
    botMessage = await channel.messages.fetch(replyMessageId);
    await botMessage.edit(response);
  } else {
    // Send new message
    const originalMessage = await channel.messages.fetch(messageId);
    botMessage = await originalMessage.reply(response);
  }

  // Store bot response in history
  await addMessageToHistory({
    channelId,
    messageId: botMessage.id,
    content: response,
    authorId: client.user!.id,
    authorName: client.user!.username,
    isBot: true,
  });
}

async function processEmbeddingGeneration(job: any): Promise<void> {
  const { codebasePath, forceRegenerate } = job.payload;
  await generateEmbeddings(codebasePath, forceRegenerate);
}

export async function processJobs(maxJobs: number = 10): Promise<number> {
  let processed = 0;

  for (let i = 0; i < maxJobs; i++) {
    const hasJob = await processNextJob();
    if (!hasJob) {
      break;
    }
    processed++;
  }

  return processed;
}

