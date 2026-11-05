import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";

const PINK = "#E6286F";
const DARK = "#1A1416";
const MUTED = "#635A5D";
const LINE = "#E2D9CB";

export const MAX_CAPTION = 300;

/**
 * The words under a post, written once after posting and editable after.
 *
 * Shared so adding and editing cannot drift apart: they are the same box,
 * the same limit, and the server enforces the same 300 characters.
 */
export function CaptionEditor({
  visible,
  value,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  visible: boolean;
  value: string;
  busy?: boolean;
  onChange: (next: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View style={{ backgroundColor: "#FFF", borderRadius: 18, padding: 20 }}>
          <Text
            style={{ fontSize: 16, fontWeight: "700", color: DARK, marginBottom: 12 }}
          >
            Caption
          </Text>
          <TextInput
            accessibilityLabel="Post caption"
            value={value}
            onChangeText={onChange}
            placeholder="Say something about this photo"
            placeholderTextColor="#A0A0A0"
            multiline
            maxLength={MAX_CAPTION}
            style={{
              borderWidth: 1,
              borderColor: LINE,
              borderRadius: 12,
              padding: 12,
              minHeight: 84,
              fontSize: 14,
              color: DARK,
              textAlignVertical: "top",
            }}
          />
          <Text
            style={{ fontSize: 11, color: MUTED, marginTop: 6, textAlign: "right" }}
          >
            {value.length}/{MAX_CAPTION}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: LINE,
                alignItems: "center",
              }}
            >
              <Text style={{ color: MUTED, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSave}
              disabled={busy}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 24,
                backgroundColor: PINK,
                alignItems: "center",
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#FFF", fontWeight: "700" }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
