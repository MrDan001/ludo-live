// Shared TypeScript types

export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string; // socketId of sender
    senderName: string;
    senderColor: string;
    senderAvatarUrl?: string;
    text: string;
    isQuick: boolean;
    timestamp: number; // epoch ms
  }
  
  // Fixed set of one-tap quick chat phrases. The server only accepts text
  // that matches one of these when a message is sent via chat:quick, so
  // quick chat can never be used to smuggle in arbitrary/unmoderated text.
  export const QUICK_CHAT_PRESETS: string[] = [
    "Good luck!",
    "Well played!",
    "Nice move!",
    "Hurry up!",
    "Oops!",
    "Thanks!",
    "Let's play well.",
    "All the best!",
    "😂",
    "👍",
    "🔥",
    "😢",
  ];