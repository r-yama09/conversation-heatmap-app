import type {
  BasicStats,
  NormalizedConversation,
  NormalizedMessage,
  ParsedExport,
} from "@/lib/chatgpt-export/types";
import {
  CONVERSATIONS_STORE_NAME,
  IndexedDbStorageError,
  METADATA_STORE_NAME,
  STORAGE_DB_NAME,
  STORAGE_DB_VERSION,
  STORAGE_SUMMARY_KEY,
  type SaveResult,
  type StorageConversationInput,
  type StorageDataset,
  type StorageSummary,
  type StoredConversation,
  type StoredMessage,
} from "./types";

type StorageSummaryRecord = StorageSummary & {
  key: typeof STORAGE_SUMMARY_KEY;
  schemaVersion: typeof STORAGE_DB_VERSION;
};

type MergeResult = {
  dataset: StorageDataset;
  importedConversationCount: number;
  addedConversationCount: number;
  updatedConversationCount: number;
  unchangedConversationCount: number;
};

const EMPTY_SUMMARY: StorageSummary = {
  storedConversationCount: 0,
  storedMessageCount: 0,
  lastSavedAt: null,
  lastSave: null,
};

function messageComparator(left: StoredMessage, right: StoredMessage): number {
  if (left.createdAt === null && right.createdAt !== null) return 1;
  if (left.createdAt !== null && right.createdAt === null) return -1;
  if (left.createdAt !== null && right.createdAt !== null && left.createdAt !== right.createdAt) return left.createdAt - right.createdAt;
  return left.messageId < right.messageId ? -1 : left.messageId > right.messageId ? 1 : 0;
}

function conversationComparator(left: StoredConversation, right: StoredConversation): number {
  return left.conversationId < right.conversationId ? -1 : left.conversationId > right.conversationId ? 1 : 0;
}

function messagesEqual(left: StoredMessage[], right: StoredMessage[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((message, index) => {
    const other = right[index];
    return message.messageId === other.messageId
      && message.conversationId === other.conversationId
      && message.role === other.role
      && message.text === other.text
      && message.createdAt === other.createdAt;
  });
}

function summarizeMessages(messages: StoredMessage[]): Pick<NormalizedConversation, "messageCount" | "userMessageCount" | "assistantMessageCount"> {
  const userMessageCount = messages.filter((message) => message.role === "user").length;
  const assistantMessageCount = messages.filter((message) => message.role === "assistant").length;
  return { messageCount: userMessageCount + assistantMessageCount, userMessageCount, assistantMessageCount };
}

function canonicalMessages(messages: StoredMessage[]): StoredMessage[] {
  const byId = new Map<string, StoredMessage>();
  for (const message of messages) byId.set(message.messageId, { ...message });
  return Array.from(byId.values()).sort(messageComparator);
}

function incomingConversations(input: StorageConversationInput): StoredConversation[] {
  const messagesByConversation = new Map<string, StoredMessage[]>();
  for (const message of input.messages) {
    const list = messagesByConversation.get(message.conversationId) ?? [];
    list.push({
      messageId: message.messageId,
      conversationId: message.conversationId,
      role: message.role,
      text: message.text,
      createdAt: message.createdAt,
    });
    messagesByConversation.set(message.conversationId, list);
  }

  const byId = new Map<string, StoredConversation>();
  for (const conversation of input.conversations) {
    const next: StoredConversation = {
      conversationId: conversation.conversationId,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      ...summarizeMessages(canonicalMessages(messagesByConversation.get(conversation.conversationId) ?? [])),
      messages: canonicalMessages(messagesByConversation.get(conversation.conversationId) ?? []),
    };
    const previous = byId.get(next.conversationId);
    byId.set(next.conversationId, previous ? mergeStoredConversation(previous, next).conversation : next);
  }
  return Array.from(byId.values()).sort(conversationComparator);
}

export function mergeStoredConversation(existing: StoredConversation, incoming: StoredConversation): { conversation: StoredConversation; changed: boolean } {
  const mergedMessages = canonicalMessages([...existing.messages, ...incoming.messages]);
  const counts = summarizeMessages(mergedMessages);
  const conversation: StoredConversation = {
    conversationId: existing.conversationId,
    title: incoming.title,
    createdAt: incoming.createdAt,
    updatedAt: incoming.updatedAt,
    ...counts,
    messages: mergedMessages,
  };
  const changed = existing.title !== conversation.title
    || existing.createdAt !== conversation.createdAt
    || existing.updatedAt !== conversation.updatedAt
    || existing.messageCount !== conversation.messageCount
    || existing.userMessageCount !== conversation.userMessageCount
    || existing.assistantMessageCount !== conversation.assistantMessageCount
    || !messagesEqual(existing.messages, conversation.messages);
  return { conversation, changed };
}

export function mergeStorageDataset(existing: StorageDataset, input: StorageConversationInput): MergeResult {
  const byId = new Map(existing.conversations.map((conversation) => [conversation.conversationId, {
    ...conversation,
    messages: canonicalMessages(conversation.messages),
  }]));
  const imported = incomingConversations(input);
  let addedConversationCount = 0;
  let updatedConversationCount = 0;
  let unchangedConversationCount = 0;

  for (const conversation of imported) {
    const previous = byId.get(conversation.conversationId);
    if (!previous) {
      byId.set(conversation.conversationId, conversation);
      addedConversationCount += 1;
      continue;
    }
    const merged = mergeStoredConversation(previous, conversation);
    byId.set(conversation.conversationId, merged.conversation);
    if (merged.changed) updatedConversationCount += 1;
    else unchangedConversationCount += 1;
  }

  return {
    dataset: { conversations: Array.from(byId.values()).sort(conversationComparator) },
    importedConversationCount: imported.length,
    addedConversationCount,
    updatedConversationCount,
    unchangedConversationCount,
  };
}

function statsForConversations(conversations: NormalizedConversation[]): BasicStats {
  const userMessageCount = conversations.reduce((total, conversation) => total + conversation.userMessageCount, 0);
  const assistantMessageCount = conversations.reduce((total, conversation) => total + conversation.assistantMessageCount, 0);
  return {
    conversationCount: conversations.length,
    messageCount: userMessageCount + assistantMessageCount,
    userMessageCount,
    assistantMessageCount,
  };
}

export function toParsedExport(dataset: StorageDataset): ParsedExport {
  const storedConversations = [...dataset.conversations].sort(conversationComparator);
  const conversations: NormalizedConversation[] = [];
  const messages: NormalizedMessage[] = [];

  for (const stored of storedConversations) {
    const orderedMessages = canonicalMessages(stored.messages);
    const counts = summarizeMessages(orderedMessages);
    conversations.push({
      conversationId: stored.conversationId,
      title: stored.title,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
      ...counts,
    });
    messages.push(...orderedMessages.map((message) => ({ ...message, title: stored.title })));
  }

  return { conversations, messages, stats: statsForConversations(conversations) };
}

function summaryFromDataset(dataset: StorageDataset, lastSavedAt: string | null, lastSave: SaveResult | null): StorageSummary {
  return {
    storedConversationCount: dataset.conversations.length,
    storedMessageCount: dataset.conversations.reduce((total, conversation) => total + conversation.messages.length, 0),
    lastSavedAt,
    lastSave,
  };
}

function asStorageError(error: unknown, code: "SAVE_FAILED" | "LOAD_FAILED" | "DELETE_FAILED", fallback: string): IndexedDbStorageError {
  if (error instanceof IndexedDbStorageError) return error;
  return new IndexedDbStorageError(code, fallback, { cause: error });
}

export function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new IndexedDbStorageError("UNAVAILABLE", "このブラウザではIndexedDBを利用できません。"));
  }
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(STORAGE_DB_NAME, STORAGE_DB_VERSION);
    } catch (error) {
      reject(new IndexedDbStorageError("OPEN_FAILED", "IndexedDBを開けませんでした。", { cause: error }));
      return;
    }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CONVERSATIONS_STORE_NAME)) {
        database.createObjectStore(CONVERSATIONS_STORE_NAME, { keyPath: "conversationId" });
      }
      if (!database.objectStoreNames.contains(METADATA_STORE_NAME)) {
        database.createObjectStore(METADATA_STORE_NAME, { keyPath: "key" });
      }
    };
    request.onblocked = () => reject(new IndexedDbStorageError("OPEN_FAILED", "IndexedDBの更新がブロックされています。"));
    request.onerror = () => reject(new IndexedDbStorageError("OPEN_FAILED", "IndexedDBを開けませんでした。", { cause: request.error ?? undefined }));
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}

export async function saveConversations(input: StorageConversationInput): Promise<SaveResult> {
  let database: IDBDatabase;
  try {
    database = await openDatabase();
  } catch (error) {
    throw asStorageError(error, "SAVE_FAILED", "IndexedDBへ保存できませんでした。");
  }

  return new Promise((resolve, reject) => {
    let result: SaveResult | null = null;
    let settled = false;
    let transaction: IDBTransaction;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      database.close();
      reject(asStorageError(error, "SAVE_FAILED", "IndexedDBへの保存に失敗しました。"));
    };
    try {
      transaction = database.transaction([CONVERSATIONS_STORE_NAME, METADATA_STORE_NAME], "readwrite");
    } catch (error) {
      fail(error);
      return;
    }
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      database.close();
      if (result) resolve(result);
      else reject(new IndexedDbStorageError("SAVE_FAILED", "IndexedDBへの保存結果を確認できませんでした。"));
    };

    const conversationStore = transaction.objectStore(CONVERSATIONS_STORE_NAME);
    const metadataStore = transaction.objectStore(METADATA_STORE_NAME);
    const request = conversationStore.getAll();
    request.onerror = () => fail(request.error);
    request.onsuccess = () => {
      try {
        const merged = mergeStorageDataset({ conversations: request.result as StoredConversation[] }, input);
        for (const conversation of merged.dataset.conversations) conversationStore.put(conversation);
        const savedAt = new Date().toISOString();
        const totalStoredMessageCount = merged.dataset.conversations.reduce((total, conversation) => total + conversation.messages.length, 0);
        result = {
          importedConversationCount: merged.importedConversationCount,
          addedConversationCount: merged.addedConversationCount,
          updatedConversationCount: merged.updatedConversationCount,
          unchangedConversationCount: merged.unchangedConversationCount,
          totalStoredConversationCount: merged.dataset.conversations.length,
          totalStoredMessageCount,
          savedAt,
        };
        const summary: StorageSummaryRecord = {
          key: STORAGE_SUMMARY_KEY,
          schemaVersion: STORAGE_DB_VERSION,
          storedConversationCount: result.totalStoredConversationCount,
          storedMessageCount: result.totalStoredMessageCount,
          lastSavedAt: savedAt,
          lastSave: result,
        };
        metadataStore.put(summary);
      } catch (error) {
        try { transaction.abort(); } catch { /* The transaction may already be closing. */ }
        fail(error);
      }
    };
  });
}

export async function loadConversations(): Promise<ParsedExport> {
  let database: IDBDatabase;
  try {
    database = await openDatabase();
  } catch (error) {
    throw asStorageError(error, "LOAD_FAILED", "IndexedDBから読み込めませんでした。");
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    let loaded: ParsedExport | null = null;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      database.close();
      reject(asStorageError(error, "LOAD_FAILED", "IndexedDBからの読み込みに失敗しました。"));
    };
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(CONVERSATIONS_STORE_NAME, "readonly");
    } catch (error) {
      fail(error);
      return;
    }
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      database.close();
      if (!loaded || loaded.conversations.length === 0) {
        reject(new IndexedDbStorageError("EMPTY", "保存データが存在しません。"));
      } else resolve(loaded);
    };
    const request = transaction.objectStore(CONVERSATIONS_STORE_NAME).getAll();
    request.onerror = () => fail(request.error);
    request.onsuccess = () => {
      loaded = toParsedExport({ conversations: request.result as StoredConversation[] });
    };
  });
}

export async function getStorageSummary(): Promise<StorageSummary> {
  let database: IDBDatabase;
  try {
    database = await openDatabase();
  } catch (error) {
    throw asStorageError(error, "LOAD_FAILED", "IndexedDBの保存状態を確認できませんでした。");
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    let metadata: StorageSummaryRecord | null = null;
    let records: StoredConversation[] = [];
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      database.close();
      reject(asStorageError(error, "LOAD_FAILED", "IndexedDBの保存状態を確認できませんでした。"));
    };
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction([CONVERSATIONS_STORE_NAME, METADATA_STORE_NAME], "readonly");
    } catch (error) {
      fail(error);
      return;
    }
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      database.close();
      resolve(metadata ? {
        storedConversationCount: metadata.storedConversationCount,
        storedMessageCount: metadata.storedMessageCount,
        lastSavedAt: metadata.lastSavedAt,
        lastSave: metadata.lastSave,
      } : summaryFromDataset({ conversations: records }, null, null));
    };
    const metadataRequest = transaction.objectStore(METADATA_STORE_NAME).get(STORAGE_SUMMARY_KEY);
    metadataRequest.onerror = () => fail(metadataRequest.error);
    metadataRequest.onsuccess = () => { metadata = (metadataRequest.result as StorageSummaryRecord | undefined) ?? null; };
    const conversationRequest = transaction.objectStore(CONVERSATIONS_STORE_NAME).getAll();
    conversationRequest.onerror = () => fail(conversationRequest.error);
    conversationRequest.onsuccess = () => { records = conversationRequest.result as StoredConversation[]; };
  });
}

export async function clearStoredConversations(): Promise<void> {
  let database: IDBDatabase;
  try {
    database = await openDatabase();
  } catch (error) {
    throw asStorageError(error, "DELETE_FAILED", "保存データを削除できませんでした。");
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      database.close();
      reject(asStorageError(error, "DELETE_FAILED", "保存データの削除に失敗しました。"));
    };
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction([CONVERSATIONS_STORE_NAME, METADATA_STORE_NAME], "readwrite");
    } catch (error) {
      fail(error);
      return;
    }
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      database.close();
      resolve();
    };
    transaction.objectStore(CONVERSATIONS_STORE_NAME).clear();
    transaction.objectStore(METADATA_STORE_NAME).clear();
  });
}

export function emptyStorageSummary(): StorageSummary {
  return { ...EMPTY_SUMMARY };
}
