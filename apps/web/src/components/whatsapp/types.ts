export type MessageStatus = "sending" | "sent" | "read";

export interface ChatMessage {
  id: string;
  from: "me" | "hive";
  text: string;
  ts: number;
  status?: MessageStatus; // only for "me" messages
  imageDataUrl?: string; // attached image preview (product photo)
  cta?: { label: string; url: string }; // URL button, e.g. "Pay Now"
  buttons?: string[]; // quick-reply buttons; tapping sends the label
}

/**
 * A persona = one WhatsApp chat thread. The user role is implied by the phone:
 * the seeded merchant phone talks to "Hive" (their AI employee); any other phone
 * talks to the business ("Bella's Fashion Hub"), answered by Hive.
 */
export interface Persona {
  id: string;
  phone: string; // the number we send AS
  chatName: string; // the contact shown at the top of the chat
  subtitle: string; // status line under the name
  avatarText: string; // initials / emoji for the avatar
  avatarColor: string; // tailwind bg class
  tagline: string; // small role hint for the chat list
}
