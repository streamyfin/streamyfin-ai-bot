import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getSystemPrompt } from "./prompt";
import { allTools } from "./tools";
import { getChannelHistory } from "../message-history/store";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function generateChatResponse(
  channelId: string,
  userMessage: string,
  userName: string
): Promise<string> {
  // Get conversation history
  const history = await getChannelHistory(channelId, 10);

  // Convert history to messages format
  const messages: ChatMessage[] = history.map((msg) => ({
    role: msg.isBot ? "assistant" : "user",
    content: msg.content,
  }));

  // Add current user message
  messages.push({
    role: "user",
    content: userMessage,
  });

  try {
    const result = await generateText({
      model: openai("gpt-4o"),
      system: `${getSystemPrompt()}\n\nMisc:\nYou're talking to ${userName}`,  
      messages,
      tools: allTools,
      maxSteps: 5, // Allow multiple tool calls
      temperature: 0.7,
    });

    return result.text;
  } catch (error) {
    console.error("Error generating chat response:", error);
    throw error;
  }
}
