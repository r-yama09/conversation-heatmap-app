import { ChatGptExportParseError, type MessageRole, type NormalizedConversation, type NormalizedMessage, type ParsedExport } from "./types";

type UnknownRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is UnknownRecord => typeof value === "object" && value !== null && !Array.isArray(value);
const nonEmptyString = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const finiteNumber = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;

function normalizeRole(value: unknown): MessageRole {
  return value === "user" || value === "assistant" || value === "system" || value === "tool" ? value : "unknown";
}

function extractText(content: unknown): string {
  if (!isRecord(content) || !Array.isArray(content.parts)) return "";
  return content.parts.filter((part): part is string => typeof part === "string").join("").trim();
}

function compareMessages(left: NormalizedMessage, right: NormalizedMessage): number {
  if (left.createdAt === null && right.createdAt === null) return 0;
  if (left.createdAt === null) return 1;
  if (right.createdAt === null) return -1;
  return left.createdAt - right.createdAt;
}

function currentConversationPath(mapping: UnknownRecord, currentNode: unknown): [string, unknown][] | null {
  const currentNodeId = nonEmptyString(currentNode);
  if (!currentNodeId || !Object.hasOwn(mapping, currentNodeId)) return null;

  const path: [string, unknown][] = [];
  const visitedNodeIds = new Set<string>();
  let nodeId: string | null = currentNodeId;

  while (nodeId && Object.hasOwn(mapping, nodeId) && !visitedNodeIds.has(nodeId)) {
    visitedNodeIds.add(nodeId);
    const rawNode: unknown = mapping[nodeId];
    path.push([nodeId, rawNode]);
    nodeId = isRecord(rawNode) ? nonEmptyString(rawNode.parent) : null;
  }

  return path.reverse();
}

export function parseChatGptExport(input: unknown): ParsedExport {
  if (!Array.isArray(input)) {
    throw new ChatGptExportParseError("TOP_LEVEL_NOT_ARRAY", "JSONのトップレベルは配列である必要があります。");
  }
  const conversations: NormalizedConversation[] = [];
  const messages: NormalizedMessage[] = [];

  input.forEach((rawConversation, conversationIndex) => {
    if (!isRecord(rawConversation) || !isRecord(rawConversation.mapping)) return;
    const conversationId = nonEmptyString(rawConversation.id) ?? `conversation-${conversationIndex + 1}`;
    const title = nonEmptyString(rawConversation.title) ?? "無題の会話";
    const conversationMessages: NormalizedMessage[] = [];

    const activePath = currentConversationPath(rawConversation.mapping, rawConversation.current_node);
    const nodesToParse = activePath ?? Object.entries(rawConversation.mapping);

    nodesToParse.forEach(([nodeId, rawNode], nodeIndex) => {
      if (!isRecord(rawNode) || !isRecord(rawNode.message)) return;
      const rawMessage = rawNode.message;
      const text = extractText(rawMessage.content);
      if (!text) return;
      const author = isRecord(rawMessage.author) ? rawMessage.author : null;
      conversationMessages.push({
        conversationId,
        messageId: nonEmptyString(rawMessage.id) ?? nonEmptyString(nodeId) ?? `${conversationId}-message-${nodeIndex + 1}`,
        title,
        role: normalizeRole(author?.role),
        text,
        createdAt: finiteNumber(rawMessage.create_time),
        updatedAt: finiteNumber(rawMessage.update_time),
      });
    });

    // A current_node path is already ordered from the root toward the active node.
    // Legacy exports have no active path, so retain their timestamp-based ordering.
    if (!activePath) conversationMessages.sort(compareMessages);
    const userMessageCount = conversationMessages.filter((message) => message.role === "user").length;
    const assistantMessageCount = conversationMessages.filter((message) => message.role === "assistant").length;
    messages.push(...conversationMessages);
    conversations.push({
      conversationId,
      title,
      createdAt: finiteNumber(rawConversation.create_time),
      updatedAt: finiteNumber(rawConversation.update_time),
      messageCount: userMessageCount + assistantMessageCount,
      userMessageCount,
      assistantMessageCount,
    });
  });

  if (!conversations.length) {
    throw new ChatGptExportParseError("NO_VALID_CONVERSATIONS", "有効な会話を取得できませんでした。mappingを含むChatGPTエクスポート形式か確認してください。");
  }
  const userMessageCount = messages.filter((message) => message.role === "user").length;
  const assistantMessageCount = messages.filter((message) => message.role === "assistant").length;
  return {
    conversations,
    messages,
    stats: { conversationCount: conversations.length, messageCount: userMessageCount + assistantMessageCount, userMessageCount, assistantMessageCount },
  };
}
