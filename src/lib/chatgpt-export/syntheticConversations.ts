export type SyntheticConversationOptions = { conversationCount: number; messagesPerConversation?: number };

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer.`);
}

/** Creates fictional, deterministic ChatGPT-export-shaped data for tests only. */
export function createSyntheticConversations({ conversationCount, messagesPerConversation = 2 }: SyntheticConversationOptions): unknown[] {
  assertPositiveInteger(conversationCount, "conversationCount");
  assertPositiveInteger(messagesPerConversation, "messagesPerConversation");
  const startTime = Date.UTC(2024, 0, 1);
  return Array.from({ length: conversationCount }, (_, conversationIndex) => {
    const conversationId = `synthetic-conversation-${String(conversationIndex + 1).padStart(5, "0")}`;
    const mapping: Record<string, unknown> = { root: { parent: null, message: null } };
    let parentId = "root";
    for (let messageIndex = 0; messageIndex < messagesPerConversation; messageIndex += 1) {
      const messageId = `${conversationId}-message-${String(messageIndex + 1).padStart(2, "0")}`;
      const role = messageIndex % 2 === 0 ? "user" : "assistant";
      mapping[messageId] = { parent: parentId, message: { id: messageId, author: { role }, content: { parts: [`synthetic ${role} message ${messageIndex + 1}`] }, create_time: startTime + ((conversationIndex * messagesPerConversation) + messageIndex) * 60 } };
      parentId = messageId;
    }
    return { id: conversationId, title: `Synthetic conversation ${String(conversationIndex + 1).padStart(5, "0")}`, create_time: startTime + conversationIndex * messagesPerConversation * 60, update_time: startTime + ((conversationIndex + 1) * messagesPerConversation - 1) * 60, current_node: parentId, mapping };
  });
}
