type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Something in a chat changed (a message was sent or arrived): the chat list
 * should reload, so that chat moves to the top.
 */
export function notifyChatListChanged() {
  listeners.forEach((listener) => listener());
}

export function onChatListChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
