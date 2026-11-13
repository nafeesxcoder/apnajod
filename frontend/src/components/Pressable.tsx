import { forwardRef, useState } from "react";
import {
  Pressable as NativePressable,
  type GestureResponderEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type View,
} from "react-native";

/**
 * React Native's Pressable, for buttons whose look changes while pressed
 * (style={({ pressed }) => ...}).
 *
 * In the phone app NativeWind wraps Pressable and drops a style given as a
 * function, so those buttons lost their colour and size - the Log in button
 * came out as small white text on a white page. Here the pressed state is
 * tracked and the style is worked out before it reaches Pressable.
 */
export const Pressable = forwardRef<View, PressableProps>(function Pressable(
  { style, onPressIn, onPressOut, ...rest },
  ref,
) {
  const [pressed, setPressed] = useState(false);
  const state = { pressed, hovered: false } as PressableStateCallbackType;
  return (
    <NativePressable
      ref={ref}
      {...rest}
      style={typeof style === "function" ? style(state) : style}
      onPressIn={(event: GestureResponderEvent) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        setPressed(false);
        onPressOut?.(event);
      }}
    />
  );
});
