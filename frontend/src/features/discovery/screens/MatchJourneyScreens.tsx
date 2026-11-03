import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, SectionTitle, shared } from "../../../components";
import { FormPage } from "../../../components/forms/FormScaffold";
import {
  MiniPremiumIcon,
  PremiumIcon,
} from "../../../components/premium/PremiumIcon";
import type { Match } from "../../../data";
import { styles } from "../../../theme/appStyles";
import { AppCanvas } from "../../../components/AppCanvas";



export function MutualMatchScreen({
  match,
  next,
  back,
}: {
  match: Match;
  next: () => void;
  back: () => void;
}) {
  return (
    <AppCanvas>
      <View style={styles.center}>
        <SafeAreaView
          style={[
            shared.safe,
            { alignItems: "center", justifyContent: "center", gap: 26 },
          ]}
        >
          <Text style={styles.kicker}>A NEW BEGINNING</Text>
          <View style={styles.matchFaces}>
            <Image
              source={{ uri: match.photo }}
              style={[styles.face, { left: 0 }]}
            />
            <View style={styles.matchHeart}>
              <PremiumIcon name="heart" tone="ruby" size={58} iconSize={28} />
            </View>
            <View
              style={[
                styles.face,
                {
                  right: 0,
                  backgroundColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Text style={[styles.avatarText, { fontSize: 38 }]}>A</Text>
            </View>
          </View>
          <View style={{ alignItems: "center", gap: 10 }}>
            <Text style={styles.bigMatch}>It’s a Match</Text>
            <Text style={[shared.body, { textAlign: "center", maxWidth: 310 }]}>
              You and {match.name} both felt something worth exploring.
            </Text>
          </View>
          <View style={[shared.card, { width: "100%", gap: 12 }]}>
            <View style={shared.row}>
              <PremiumIcon
                name="chatbubbles-outline"
                tone="gold"
                size={44}
                iconSize={20}
              />
              <Text style={[shared.label, { marginLeft: 9 }]}>
                One little step before hello
              </Text>
            </View>
            <Text style={shared.body}>
              Answer an icebreaker. When you both answer, your chat opens.
            </Text>
          </View>
          <View style={{ width: "100%", gap: 8 }}>
            <Button label="Break the ice" icon="sparkles" onPress={next} />
            <Button label="Keep browsing" variant="ghost" onPress={back} />
          </View>
        </SafeAreaView>
      </View>
    </AppCanvas>
  );
}

export function IcebreakerScreen({
  match,
  question,
  onSubmit,
}: {
  match: Match;
  question: string;
  onSubmit: (answer: string) => Promise<void>;
}) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!answer || loading) return;
    setLoading(true);
    try {
      await onSubmit(answer);
    } finally {
      setLoading(false);
    }
  };
  return (
    <AppCanvas>
      <FormPage>
        <View style={{ alignItems: "center", gap: 12 }}>
          <Text style={styles.kicker}>YOUR FIRST MOMENT</Text>
          <View style={styles.miniFaces}>
            <Image source={{ uri: match.photo }} style={styles.miniFace} />
            <View
              style={[
                styles.miniFace,
                {
                  backgroundColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: -9,
                },
              ]}
            >
              <Text style={styles.avatarText}>A</Text>
            </View>
          </View>
        </View>
        <SectionTitle
          title={question}
          body={`${match.name} is answering this too. No overthinking—just be you.`}
        />
        <View style={{ gap: 12 }}>
          {[
            "Coffee date — good conversation first",
            "Road trip — let’s make a memory",
          ].map((option) => {
            const isSelected = answer === option;
            return (
              <Pressable
                disabled={loading}
                key={option}
                onPress={() => setAnswer(option)}
                style={[
                  styles.answer,
                  isSelected && styles.intentSelected,
                  loading && { opacity: 0.72 },
                ]}
              >
                <Text
                  style={[
                    styles.answerText,
                    isSelected && styles.answerTextSelected,
                  ]}
                >
                  {option}
                </Text>
                <MiniPremiumIcon
                  name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                  tone={isSelected ? "gold" : "dark"}
                  size={34}
                  iconSize={16}
                />
              </Pressable>
            );
          })}
        </View>
        <View style={styles.private}>
          <MiniPremiumIcon
            name="lock-closed"
            tone="dark"
            size={28}
            iconSize={13}
          />
          <Text style={styles.helper}>
            Answers are revealed after you both respond. Production chat stays
            locked until then.
          </Text>
        </View>
        <View style={shared.spacer} />
        <Button
          disabled={!answer || loading}
          label={loading ? "Saving answer…" : "Send my answer"}
          onPress={() => void submit()}
        />
      </FormPage>
    </AppCanvas>
  );
}
