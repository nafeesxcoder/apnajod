import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const brandMark = require("../../../../assets/apnajoda-mark.png");
const brandWordmark = require("../../../../assets/apnajoda-wordmark.png");

const NAVY = "#1F4D7A";
const CRIMSON = "#A8243A";
const PAPER = "#FDF7F4";
const MUTED = "#5A6878";

const RING = 148;
const JOIN_MS = 900;
const PART_MS = 700;

/**
 * The launch screen.
 *
 * Two half-rings — one navy, one crimson — swing toward each other, close
 * into a single ring around the mark, hold, and drift apart again. That is
 * the name: "jod", two halves meeting. A spinning circle would have said
 * nothing, and the app would have looked like every other app for the three
 * seconds a person spends deciding what it is.
 *
 * The ground is the same #FDF7F4 as the native splash in app.json, so the
 * handover from the OS splash to this screen has no flash of another colour.
 * The artwork is the two-colour mark, not the white one: on paper the white
 * version is invisible, which is exactly how the first version of this
 * screen shipped.
 *
 * Every animated property is a transform or an opacity, so the whole thing
 * runs on the native driver and does not stutter while the app boots behind
 * it.
 */
export function SplashScreen() {
  // 0 = apart, 1 = joined.
  const join = useRef(new Animated.Value(0)).current;
  const markIn = useRef(new Animated.Value(0)).current;
  const wordIn = useRef(new Animated.Value(0)).current;
  const wordSlide = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.spring(markIn, {
      toValue: 1,
      friction: 6,
      tension: 70,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(wordIn, {
        toValue: 1,
        duration: 700,
        delay: 450,
        useNativeDriver: true,
      }),
      Animated.timing(wordSlide, {
        toValue: 0,
        duration: 700,
        delay: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(join, {
          toValue: 1,
          duration: JOIN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(420),
        Animated.timing(join, {
          toValue: 0,
          duration: PART_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(160),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [join, markIn, wordIn, wordSlide]);

  const navySpin = join.interpolate({
    inputRange: [0, 1],
    outputRange: ["-152deg", "0deg"],
  });
  const crimsonSpin = join.interpolate({
    inputRange: [0, 1],
    outputRange: ["152deg", "0deg"],
  });
  // The mark leans in a touch as the ring closes, so the two read as one
  // movement rather than a logo sitting inside an unrelated animation.
  const markBreath = join.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.centre}>
        <View style={styles.ringBox}>
          <Animated.View
            style={[styles.arc, styles.arcNavy, { transform: [{ rotate: navySpin }] }]}
          />
          <Animated.View
            style={[
              styles.arc,
              styles.arcCrimson,
              { transform: [{ rotate: crimsonSpin }] },
            ]}
          />
          <Animated.Image
            source={brandMark}
            resizeMode="contain"
            accessibilityLabel="Apnajoda"
            style={[
              styles.mark,
              { opacity: markIn, transform: [{ scale: Animated.multiply(markIn, markBreath) }] },
            ]}
          />
        </View>

        <Animated.View
          style={{ opacity: wordIn, transform: [{ translateY: wordSlide }] }}
        >
          <Image
            source={brandWordmark}
            resizeMode="contain"
            accessibilityLabel="Apnajoda"
            style={styles.wordmark}
          />
          <Text style={styles.tagline}>Find Your Perfect Match</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAPER },
  centre: { flex: 1, alignItems: "center", justifyContent: "center" },

  ringBox: {
    width: RING,
    height: RING,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 44,
  },
  // A circle with two of its four borders coloured is a half ring, and
  // rotating it costs nothing: no SVG, no layout work, native driver.
  arc: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 3,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
  },
  arcNavy: { borderTopColor: NAVY, borderRightColor: NAVY },
  arcCrimson: { borderBottomColor: CRIMSON, borderLeftColor: CRIMSON },

  mark: { width: 78, height: 78 },

  // 1200x293 is the wordmark asset's own ratio.
  wordmark: { width: 244, height: 60, alignSelf: "center" },
  tagline: {
    marginTop: 10,
    fontSize: 14,
    letterSpacing: 1.2,
    color: MUTED,
    textAlign: "center",
  },
});
