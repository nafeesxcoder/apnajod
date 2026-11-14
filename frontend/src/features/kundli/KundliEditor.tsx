/**
 * My Kundli: Rashi, then the Nakshatras of that Rashi, and Manglik. All
 * optional. Not sure? Birth date and time (India time) work them out right
 * here on the phone - the birth time itself is never sent or saved.
 *
 * Premium members also pick the lowest Gun score they want to see.
 *
 * Opened from Settings ("Kundli & Gun Milan"), Match Filters, or the Gun
 * Milan sheet - never pushed on the profile everyone sees.
 */
import { createElement, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { profileApi } from "../../api/profileApi";
import { billingApi } from "../../api/billingApi";
import { kundliApi } from "../../api/kundliApi";
import { fonts, palette, radius } from "../../theme";
import { PressScale } from "../../components/motion";
import { Sheet } from "../posts/PostSheets";
import { fromBirth, NAKSHATRAS, nakshatraName, nakshatrasIn, RASHIS, rashiName } from "./kundli";
import { kundliSaved, onKundliEditor } from "./kundliStore";

type Manglik = "yes" | "no" | "unknown" | null;
type Mine = { rashi: number | null; nakshatra: number | null; manglik: Manglik; minGun: number | null };

const GUN_FILTERS: { label: string; value: number | null }[] = [
  { label: "Any", value: null },
  { label: "18+", value: 18 },
  { label: "24+", value: 24 },
  { label: "28+", value: 28 },
];

async function loadMine(accessToken: string): Promise<Mine> {
  const data: any = await profileApi.getMyProfile(accessToken);
  const p = data?.profile ?? {};
  return {
    rashi: p.rashi ? Number(p.rashi) : null,
    nakshatra: p.nakshatra ? Number(p.nakshatra) : null,
    manglik: ["yes", "no", "unknown"].includes(p.manglik) ? p.manglik : null,
    minGun: data?.preferences?.min_gun ? Number(data.preferences.min_gun) : null,
  };
}

function Chip({ label, sub, on, onPress }: { label: string; sub?: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: on ? palette.crimson : palette.rule,
        backgroundColor: on ? palette.crimsonTint : "#FFFFFF",
        alignItems: "center",
        minWidth: 70,
      }}
    >
      <Text style={{ fontFamily: on ? fonts.bodySemi : fonts.body, fontSize: 13, color: on ? palette.crimson : palette.ink }}>{label}</Text>
      {!!sub && <Text style={{ fontFamily: fonts.body, fontSize: 11, color: palette.slate }}>{sub}</Text>}
    </Pressable>
  );
}

/** A date or time box: the browser's own picker on the web. */
function Field({ kind, value, onChange }: { kind: "date" | "time"; value: string; onChange: (v: string) => void }) {
  if (Platform.OS === "web") {
    return createElement("input", {
      type: kind,
      value,
      max: kind === "date" ? new Date().toISOString().slice(0, 10) : undefined,
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
      "aria-label": kind === "date" ? "Birth date" : "Birth time",
      style: { padding: 10, borderRadius: 10, border: `1px solid ${palette.rule}`, fontSize: 15, fontFamily: "inherit", background: "#FFFFFF" },
    });
  }
  return (
    <TextInput
      accessibilityLabel={kind === "date" ? "Birth date" : "Birth time"}
      value={value}
      onChangeText={onChange}
      placeholder={kind === "date" ? "YYYY-MM-DD" : "HH:MM (24 hr)"}
      style={{ borderWidth: 1, borderColor: palette.rule, borderRadius: 10, padding: 10, fontSize: 15, minWidth: 130, backgroundColor: "#FFFFFF" }}
    />
  );
}

export function KundliEditor({
  accessToken,
  visible,
  onClose,
  onPremium,
}: {
  accessToken: string;
  visible: boolean;
  onClose: () => void;
  onPremium: () => void;
}) {
  const [mine, setMine] = useState<Mine | null>(null);
  const [premium, setPremium] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [finder, setFinder] = useState(false);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [found, setFound] = useState("");

  useEffect(() => {
    if (!visible) return;
    setError("");
    setFound("");
    void loadMine(accessToken)
      .then(setMine)
      .catch(() => setMine({ rashi: null, nakshatra: null, manglik: null, minGun: null }));
    void billingApi
      .me(accessToken)
      .then((s) => setPremium(!!s.premium))
      .catch(() => setPremium(false));
  }, [visible, accessToken]);

  const set = (patch: Partial<Mine>) => setMine((current) => (current ? { ...current, ...patch } : current));

  const find = () => {
    const result = fromBirth(day, time);
    if (!result) {
      setFound("Enter both your birth date and time.");
      return;
    }
    set({ rashi: result.rashi, nakshatra: result.nakshatra });
    setFound(
      `${rashiName(result.rashi)} · ${nakshatraName(result.nakshatra)}` +
        (result.nearEdge ? " - the Moon was very close to a boundary, so please confirm with an astrologer." : ""),
    );
  };

  const save = async () => {
    if (!mine) return;
    setBusy(true);
    setError("");
    try {
      await kundliApi.save(accessToken, {
        rashi: mine.rashi,
        nakshatra: mine.nakshatra,
        manglik: mine.manglik,
        ...(premium ? { minGun: mine.minGun } : {}),
      });
      kundliSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const label = (text: string) => (
    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink, marginTop: 6 }}>{text}</Text>
  );

  return (
    <Sheet visible={visible} title="My Kundli" tall onClose={onClose}>
      {!mine ? (
        <ActivityIndicator color={palette.crimson} style={{ marginTop: 30 }} />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 30, gap: 10 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate, lineHeight: 19 }}>
            Add your Rashi and Nakshatra to see your Gun Milan (out of 36) on every profile. It's all optional - nothing
            changes for people who don't add it.
          </Text>

          <PressScale
            accessibilityRole="button"
            accessibilityLabel="Find from birth date and time"
            onPress={() => setFinder((v) => !v)}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 }}
          >
            <Ionicons name={finder ? "chevron-down" : "calendar-outline"} size={16} color={palette.crimson} />
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.crimson }}>
              Not sure? Find them from your birth date and time
            </Text>
          </PressScale>
          {finder && (
            <View style={{ backgroundColor: palette.paperBase, borderRadius: 14, padding: 12, gap: 10 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <Field kind="date" value={day} onChange={setDay} />
                <Field kind="time" value={time} onChange={setTime} />
                <PressScale
                  accessibilityRole="button"
                  accessibilityLabel="Find my Rashi"
                  onPress={find}
                  style={{ backgroundColor: palette.ink, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10 }}
                >
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: "#FFFFFF" }}>Find</Text>
                </PressScale>
              </View>
              {!!found && <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink }}>{found}</Text>}
              <Text style={{ fontFamily: fonts.body, fontSize: 11, color: palette.slate }}>
                India time. Worked out on your phone - your birth time is never saved.
              </Text>
            </View>
          )}

          {label("Rashi (Moon sign)")}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {RASHIS.map((r) => (
              <Chip
                key={r.n}
                label={`${r.symbol} ${r.name}`}
                sub={`${r.hindi} · ${r.english}`}
                on={mine.rashi === r.n}
                onPress={() => set({ rashi: r.n, nakshatra: mine.nakshatra && nakshatrasIn(r.n).includes(mine.nakshatra) ? mine.nakshatra : null })}
              />
            ))}
          </View>

          {!!mine.rashi && (
            <>
              {label("Nakshatra")}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {nakshatrasIn(mine.rashi).map((n) => (
                  <Chip key={n} label={NAKSHATRAS[n - 1]!} on={mine.nakshatra === n} onPress={() => set({ nakshatra: n })} />
                ))}
                <Chip label="Not sure" on={!mine.nakshatra} onPress={() => set({ nakshatra: null })} />
              </View>
            </>
          )}

          {label("Manglik")}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip label="Yes" on={mine.manglik === "yes"} onPress={() => set({ manglik: "yes" })} />
            <Chip label="No" on={mine.manglik === "no"} onPress={() => set({ manglik: "no" })} />
            <Chip label="Not sure" on={mine.manglik === "unknown" || mine.manglik === null} onPress={() => set({ manglik: "unknown" })} />
          </View>

          {!!mine.rashi && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>Only show people with Gun</Text>
                {!premium && <Ionicons name="lock-closed" size={13} color="#B45309" />}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {GUN_FILTERS.map((f) => (
                  <Chip
                    key={f.label}
                    label={f.label}
                    on={premium ? mine.minGun === f.value : f.value === null}
                    onPress={() => (premium ? set({ minGun: f.value }) : f.value !== null && (onClose(), onPremium()))}
                  />
                ))}
              </View>
              <Text style={{ fontFamily: fonts.body, fontSize: 11, color: palette.slate }}>
                {premium
                  ? "People below this score won't show. People who haven't added a Rashi come after the rest."
                  : "The Gun filter is part of Premium."}
              </Text>
            </>
          )}

          {!!error && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.crimson }}>{error}</Text>}

          <PressScale
            accessibilityRole="button"
            accessibilityLabel="Save my kundli"
            onPress={() => void save()}
            disabled={busy}
            containerStyle={{ marginTop: 8 }}
            style={{ backgroundColor: palette.crimson, borderRadius: radius.pill, paddingVertical: 14, alignItems: "center" }}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: "#FFFFFF" }}>Save</Text>}
          </PressScale>
          {(mine.rashi || mine.manglik) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove my kundli"
              onPress={() => setMine({ rashi: null, nakshatra: null, manglik: null, minGun: null })}
              style={{ alignSelf: "center", padding: 6 }}
            >
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>Remove (turns Gun Milan off)</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </Sheet>
  );
}

/** Lives in the app shell: opens the editor from the Profile card or the Gun sheet. */
export function KundliEditorHost({ accessToken, onPremium }: { accessToken: string; onPremium: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => onKundliEditor(() => setOpen(true)), []);
  return <KundliEditor accessToken={accessToken} visible={open} onClose={() => setOpen(false)} onPremium={onPremium} />;
}
