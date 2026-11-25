// Image files the app ships with (for example the chat background photos).
// Metro bundles them; this tells TypeScript what an import of one gives back.
declare module "*.jpg" {
  import type { ImageSourcePropType } from "react-native";
  const source: ImageSourcePropType;
  export default source;
}
