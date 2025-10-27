export type CachedUser = {
  _id: string;
  userId?: string;
  displayName: string;
  avatarUrl?: string;
};

export type CachedRoom = {
  _id: string;
  name: string;
  isGroup: boolean;
  createdBy: string;
  members?: Array<Pick<CachedUser, "_id" | "displayName" | "avatarUrl">>;
};

export type ServerMessage = {
  _id: string;
  roomId: string;
  senderId: string;
  kind: "text" | "image" | string;
  text?: string;
  imageUrl?: string;
  createdAt: number;
};

export type PendingMessage = {
  tempId: string;
  roomId: string;
  senderId: string;
  kind: "text" | "image";
  text?: string;
  imageUrl?: string;
  createdAt: number;
  status: "pending" | "failed";
};

export type AnyCachedMessage = ServerMessage | PendingMessage;

export function isPendingMessage(m: AnyCachedMessage): m is PendingMessage {
  return (m as PendingMessage).tempId !== undefined;
}

export function messageSignature(m: AnyCachedMessage): string {
  const sender = (m as any).senderId ?? "";
  const created = m.createdAt ?? 0;
  const text = (m as any).text ?? "";
  const image = (m as any).imageUrl ?? "";
  return `${sender}|${created}|${text}|${image}`;
}


