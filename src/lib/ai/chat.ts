import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getSystemPrompt } from "./prompt";
import { allTools } from "./tools";
import { getChannelHistory } from "../message-history/store";
import { searchEmbeddings } from "../embeddings/search";

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

  // Always fetch relevant code snippets from embeddings
  const relevantCode = await searchEmbeddings(userMessage, 5, 0.6);

  // Format relevant code context
  let codeContext = "";
  if (relevantCode.length > 0) {
    codeContext = "\n\n## Relevant Code Context\n";
    relevantCode.forEach((result, idx) => {
      const lines =
        result.metadata.startLine && result.metadata.endLine
          ? `Lines ${result.metadata.startLine}-${result.metadata.endLine}`
          : "";
      codeContext += `\n### ${idx + 1}. ${result.filePath} ${lines}\n`;
      codeContext += `Similarity: ${(result.similarity * 100).toFixed(1)}%\n`;
      codeContext += "```" + (result.metadata.language || "") + "\n";
      codeContext += result.content + "\n";
      codeContext += "```\n";
    });
  }

  // Add current user message with code context
  messages.push({
    role: "user",
    content: userMessage + codeContext,
  });

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system: getSystemPrompt(),
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
