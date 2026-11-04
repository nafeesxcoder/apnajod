import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function handleBottomNavScroll(_event?: any) {
  return;
}

export function BottomNav({
  active,
  navigate,
  light,
}: {
  active: string;
  navigate: (screen: any) => void;
  light?: boolean;
}) {
  const insets = useSafeAreaInsets();

  const NavItem = ({ icon, label, screen, activeIcon }: any) => {
    const isActive = active === screen;
    const activeColor = light ? "#FFFFFF" : "#1A1416";
    const inactiveColor = light ? "rgba(255,255,255,0.6)" : "#A0A0A0";

    return (
      <TouchableOpacity
        onPress={() => navigate(screen)}
        style={{ alignItems: "center", justifyContent: "center", flex: 1 }}
      >
        <Ionicons
          name={isActive ? activeIcon : icon}
          size={24}
          color={isActive ? activeColor : inactiveColor}
        />
        <Text
          style={{
            fontSize: 10,
            marginTop: 4,
            color: isActive ? activeColor : inactiveColor,
            fontWeight: isActive ? "600" : "400",
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom || 10 },
        light && {
          backgroundColor: "rgba(0,0,0,0.5)",
          borderTopColor: "transparent",
        },
      ]}
    >
      <NavItem
        icon="home-outline"
        activeIcon="home"
        label="Home"
        screen="home"
      />
      <NavItem
        icon="sparkles-outline"
        activeIcon="sparkles"
        label="Likes"
        screen="likes"
      />
      <NavItem
        icon="search-outline"
        activeIcon="search"
        label="Search"
        screen="find"
      />
      <NavItem
        icon="chatbubble-outline"
        activeIcon="chatbubble"
        label="Chats"
        screen="chats"
      />
      <NavItem
        icon="person-outline"
        activeIcon="person"
        label="Profile"
        screen="profile"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2D9CB",
    paddingTop: 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
});
