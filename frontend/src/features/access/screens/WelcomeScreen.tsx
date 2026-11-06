import { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const brandLogo = require("../../../../assets/apnajoda-logo.png");

// Brand navy and its pressed step, from the mark.
const NAVY = "#1F4D7A";
const NAVY_DARK = "#12355A";
const WHITE = "#FFFFFF";
const DARK = "#151719";

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
                  {/* The lockup itself, not a stand-in glyph with the name
                      typed beside it: this is the first screen anyone sees,
                      so it shows the actual logo. 1600x460 is the asset's
                      own ratio. */}
                  <Image
                    source={brandLogo}
                    resizeMode="contain"
                    accessibilityLabel="Apnajoda"
                    style={{ width: 226, height: 65, marginBottom: 6 }}
                  />
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
                      backgroundColor: NAVY,
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
                      borderColor: NAVY,
                      paddingVertical: 14,
                      borderRadius: 25,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: NAVY_DARK,
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
