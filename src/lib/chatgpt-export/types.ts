export type MessageRole = "user" | "assistant" | "system" | "tool" | "unknown";

export type NormalizedMessage = {
  conversationId: string;
  messageId: string;
  title: string;
  role: MessageRole;
  text: string;
  createdAt: number | null;
  updatedAt?: number | null;
};

export type NormalizedConversation = {
  conversationId: string;
  title: string;
  createdAt: number | null;
  updatedAt: number | null;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
};

export type BasicStats = { conversationCount: number; messageCount: number; userMessageCount: number; assistantMessageCount: number };
export type ParsedExport = { conversations: NormalizedConversation[]; messages: NormalizedMessage[]; stats: BasicStats };

export type AnalysisProgress = {
  processedConversations: number;
  totalConversations: number;
  extractedMessageCount: number;
  percentage: number;
};

export type AsyncParseOptions = {
  batchSize?: number;
  signal?: AbortSignal;
  onProgress?: (progress: AnalysisProgress) => void;
};

export type AsyncParseResult = {
  result: ParsedExport;
  aborted: boolean;
};

export class ChatGptExportParseError extends Error {
  constructor(public readonly code: "TOP_LEVEL_NOT_ARRAY" | "NO_VALID_CONVERSATIONS", message: string) {
    super(message);
    this.name = "ChatGptExportParseError";
  }
}
