import { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  ImageBackground,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const PINK = "#E91E63";
const PINK_DARK = "#880E4F";
const WHITE = "#FFFFFF";
const DARK = "#1A1416";

const MAX_WIDTH = 480;

// backdropFilter only exists on web, and React Native's style types do not
// know about it, so it is added through a cast and only on web.
const glassStyle: object =
  Platform.OS === "web" ? ({ backdropFilter: "blur(10px)" } as any) : {};

export function AccessWelcomeScreen({
  onSignUp,
  onLogIn,
}: {
  onSignUp: () => void;
  onLogIn: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center" }}>
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: MAX_WIDTH,
          overflow: "hidden",
        }}
      >
        <ImageBackground
          source={{
            uri: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80",
          }}
          style={{ flex: 1 }}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.6)"]}
            style={{ flex: 1 }}
          >
            <SafeAreaView
              style={{ flex: 1, justifyContent: "flex-end", padding: 20 }}
            >
              <Animated.View
                style={[
                  {
                    backgroundColor: "rgba(255, 255, 255, 0.85)",
                    borderRadius: 30,
                    padding: 24,
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                  glassStyle,
                ]}
              >
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <LinearGradient
                    colors={[PINK, PINK_DARK]}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="heart" size={30} color={WHITE} />
                  </LinearGradient>
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: "800",
                      color: PINK_DARK,
                    }}
                  >
                    ApnaJod
                  </Text>
                  <Text style={{ fontSize: 14, color: "#555", marginTop: 4 }}>
                    Find Your Perfect Match
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: DARK,
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  Serious about finding someone?
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#555",
                    textAlign: "center",
                    marginBottom: 24,
                    lineHeight: 18,
                  }}
                >
                  Verified people across India, looking for something real.
                </Text>

                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    onPress={onSignUp}
                    accessibilityRole="button"
                    style={{
                      backgroundColor: PINK,
                      paddingVertical: 14,
                      borderRadius: 25,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ color: WHITE, fontSize: 15, fontWeight: "700" }}
                    >
                      Create account
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onLogIn}
                    accessibilityRole="button"
                    style={{
                      backgroundColor: "transparent",
                      borderWidth: 1.5,
                      borderColor: PINK,
                      paddingVertical: 14,
                      borderRadius: 25,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: PINK_DARK,
                        fontSize: 15,
                        fontWeight: "600",
                      }}
                    >
                      I already have an account
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </SafeAreaView>
          </LinearGradient>
        </ImageBackground>
      </View>
    </View>
  );
}
