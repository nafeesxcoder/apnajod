import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";

export function SettingsScreen({
  navigate,
  onLogout,
  onDeactivate,
  onDeletePermanently,
}: {
  navigate: (screen: any) => void;
  onLogout: () => void;
  onDeactivate: () => void;
  onDeletePermanently: () => void;
}) {
  const MenuItem = ({ icon, title, onPress, color = "#1A1416" }: any) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E2D9CB",
      }}
    >
      <Ionicons
        name={icon}
        size={22}
        color={color}
        style={{ marginRight: 12 }}
      />
      <Text style={{ fontSize: 16, color, fontWeight: "500" }}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ padding: 22, flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <TouchableOpacity
              onPress={() => navigate("profile")}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color="#1A1416" />
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#1A1416" }}>
              Settings
            </Text>
          </View>

          <ScrollView>
            <MenuItem
              icon="shield-checkmark-outline"
              title="Trust Hub & Verification"
              onPress={() => navigate("verifyHub")}
            />
            <MenuItem
              icon="options-outline"
              title="Match Filters & Preferences"
              onPress={() => navigate("discovery")}
            />
            <MenuItem
              icon="heart-outline"
              title="Who Chose You"
              onPress={() => navigate("likes")}
            />
            <MenuItem
              icon="search-outline"
              title="Find Someone"
              onPress={() => navigate("find")}
            />
            <MenuItem
              icon="shield-outline"
              title="Safety & Privacy"
              onPress={() => navigate("safety")}
            />

            <View style={{ height: 40 }} />

            <MenuItem
              icon="log-out-outline"
              title="Log out"
              onPress={onLogout}
              color="#B00020"
            />
            <MenuItem
              icon="pause-circle-outline"
              title="Deactivate Account"
              onPress={onDeactivate}
              color="#B00020"
            />
            <MenuItem
              icon="trash-outline"
              title="Delete Account Permanently"
              onPress={onDeletePermanently}
              color="#B00020"
            />
          </ScrollView>
        </View>
      </SafeAreaView>
    </AppCanvas>
  );
}
