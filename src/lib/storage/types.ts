import type {
  BasicStats,
  NormalizedConversation,
  NormalizedMessage,
} from "@/lib/chatgpt-export/types";

export const STORAGE_DB_NAME = "conversation-heatmap-db" as const;
export const STORAGE_DB_VERSION = 1 as const;
export const CONVERSATIONS_STORE_NAME = "conversations" as const;
export const METADATA_STORE_NAME = "metadata" as const;
export const STORAGE_SUMMARY_KEY = "summary" as const;

export type StoredMessage = Pick<NormalizedMessage, "messageId" | "conversationId" | "role" | "text" | "createdAt">;

export type StoredConversation = NormalizedConversation & {
  messages: StoredMessage[];
};

export type StorageDataset = {
  conversations: StoredConversation[];
};

export type SaveResult = {
  importedConversationCount: number;
  addedConversationCount: number;
  updatedConversationCount: number;
  unchangedConversationCount: number;
  totalStoredConversationCount: number;
  totalStoredMessageCount: number;
  savedAt: string;
};

export type StorageSummary = {
  storedConversationCount: number;
  storedMessageCount: number;
  lastSavedAt: string | null;
  lastSave: SaveResult | null;
};

export type StorageErrorCode = "UNAVAILABLE" | "OPEN_FAILED" | "SAVE_FAILED" | "LOAD_FAILED" | "DELETE_FAILED" | "EMPTY";

export class IndexedDbStorageError extends Error {
  constructor(public readonly code: StorageErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "IndexedDbStorageError";
  }
}

export type StorageConversationInput = {
  conversations: NormalizedConversation[];
  messages: NormalizedMessage[];
  stats?: BasicStats;
};
