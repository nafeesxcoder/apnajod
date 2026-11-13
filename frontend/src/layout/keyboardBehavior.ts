import { Platform } from "react-native";

/**
 * How a KeyboardAvoidingView makes room for the keyboard.
 *
 * iPhone: padding. Android: padding too - the app draws edge-to-edge
 * (React Native 0.83 / Android 15), so the window no longer shrinks for the
 * keyboard and, with no behaviour set, the keyboard simply covered the
 * bottom of the screen (the Log in button, the chat box). The web handles
 * the keyboard itself (see useKeyboardInset).
 */
export const keyboardBehavior: "padding" | undefined = Platform.OS === "web" ? undefined : "padding";
