import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";
import { fonts, palette, radius, typeScale } from "../../../theme";
import type { MatchFilters } from "../../../storage";

const MAX_WIDTH = 720;
const SIDE_PADDING = 16;

const INDIAN_CITIES = [
  "Mumbai, MH",
  "Delhi, DL",
  "Bengaluru, KA",
  "Hyderabad, TG",
  "Ahmedabad, GJ",
  "Chennai, TN",
  "Kolkata, WB",
  "Pune, MH",
  "Jaipur, RJ",
  "Surat, GJ",
  "Lucknow, UP",
  "Kanpur, UP",
  "Nagpur, MH",
  "Indore, MP",
  "Thane, MH",
  "Bhopal, MP",
  "Visakhapatnam, AP",
  "Patna, BR",
  "Vadodara, GJ",
  "Ghaziabad, UP",
  "Ludhiana, PB",
  "Agra, UP",
  "Nashik, MH",
  "Faridabad, HR",
  "Meerut, UP",
  "Rajkot, GJ",
  "Varanasi, UP",
  "Srinagar, JK",
  "Aurangabad, MH",
  "Amritsar, PB",
  "Navi Mumbai, MH",
  "Ranchi, JH",
  "Coimbatore, TN",
  "Jabalpur, MP",
  "Gwalior, MP",
  "Vijayawada, AP",
  "Jodhpur, RJ",
  "Madurai, TN",
  "Raipur, CT",
  "Kota, RJ",
  "Chandigarh, CH",
  "Guwahati, AS",
  "Solapur, MH",
  "Hubli, KA",
  "Tiruchirappalli, TN",
  "Bareilly, UP",
  "Mysore, KA",
  "Gurgaon, HR",
  "Aligarh, UP",
  "Jalandhar, PB",
  "Bhubaneswar, OR",
  "Salem, TN",
  "Warangal, TG",
  "Guntur, AP",
  "Noida, UP",
  "Jamshedpur, JH",
  "Bhilai, CT",
  "Cuttack, OR",
  "Kochi, KL",
  "Nellore, AP",
  "Bhavnagar, GJ",
  "Dehradun, UT",
  "Durgapur, WB",
  "Asansol, WB",
  "Rourkela, OR",
  "Nanded, MH",
  "Kolhapur, MH",
  "Ajmer, RJ",
  "Akola, MH",
  "Gulbarga, KA",
  "Jamnagar, GJ",
  "Ujjain, MP",
  "Siliguri, WB",
  "Jhansi, UP",
  "Jammu, JK",
  "Sangli, MH",
  "Mangalore, KA",
  "Erode, TN",
  "Belgaum, KA",
  "Tirunelveli, TN",
  "Gaya, BR",
  "Thiruvananthapuram, KL",
  "Udaipur, RJ",
  "Kakinada, AP",
  "Kozhikode, KL",
  "Kurnool, AP",
  "Rajahmundry, AP",
  "Bokaro, JH",
  "Bellary, KA",
  "Patiala, PB",
  "Agartala, TR",
  "Bhagalpur, BR",
  "Muzaffarnagar, UP",
  "Latur, MH",
  "Dhule, MH",
  "Rohtak, HR",
  "Korba, CT",
  "Bhilwara, RJ",
  "Muzaffarpur, BR",
  "Ahmednagar, MH",
  "Mathura, UP",
  "Kollam, KL",
  "Sambalpur, OR",
  "Bilaspur, CT",
  "Satara, MH",
  "Shivamogga, KA",
  "Chandrapur, MH",
  "Junagadh, GJ",
  "Thrissur, KL",
  "Alwar, RJ",
  "Nizamabad, TG",
  "Parbhani, MH",
  "Tumkur, KA",
  "Khammam, TG",
  "Panipat, HR",
  "Darbhanga, BR",
  "Aizawl, MZ",
  "Dewas, MP",
  "Karnal, HR",
  "Bathinda, PB",
  "Eluru, AP",
  "Purnia, BR",
  "Satna, MP",
  "Sonipat, HR",
  "Sagar, MP",
  "Durg, CT",
  "Imphal, MN",
  "Ratlam, MP",
  "Hapur, UP",
  "Anantapur, AP",
  "Karimnagar, TG",
  "Etawah, UP",
  "Bharatpur, RJ",
  "New Delhi, DL",
  "Pondicherry, PY",
  "Sikar, RJ",
  "Thoothukudi, TN",
  "Rewa, MP",
  "Mirzapur, UP",
  "Raichur, KA",
  "Pali, RJ",
  "Haridwar, UT",
  "Nagercoil, TN",
  "Thanjavur, TN",
  "Bulandshahr, UP",
  "Nadiad, GJ",
  "Yamunanagar, HR",
  "Bidar, KA",
  "Munger, BR",
  "Panchkula, HR",
  "Kharagpur, WB",
  "Dindigul, TN",
  "Gandhinagar, GJ",
  "Hospet, KA",
  "Malda, WB",
  "Ongole, AP",
  "Deoghar, JH",
  "Chapra, BR",
  "Haldia, WB",
  "Khandwa, MP",
  "Nandyal, AP",
  "Chittoor, AP",
  "Morena, MP",
  "Amroha, UP",
  "Anand, GJ",
  "Bhind, MP",
  "Bhiwani, HR",
  "Navsari, GJ",
  "Ambala, HR",
  "Morvi, GJ",
  "Fatehpur, UP",
  "Rae Bareli, UP",
  "Bhusawal, MH",
  "Bahraich, UP",
  "Vellore, TN",
  "Mahesana, GJ",
  "Sirsa, HR",
  "Guna, MP",
  "Jaunpur, UP",
  "Panvel, MH",
  "Shivpuri, MP",
  "Surendranagar, GJ",
  "Unnao, UP",
  "Alappuzha, KL",
  "Kottayam, KL",
  "Shimla, HP",
  "Udupi, KA",
  "Saharsa, BR",
  "Buxar, BR",
];

const AGE_OPTIONS = [
  { label: "21-25", min: 21, max: 25 },
  { label: "25-30", min: 25, max: 30 },
  { label: "25-35", min: 25, max: 35 },
  { label: "30-35", min: 30, max: 35 },
  { label: "35-45", min: 35, max: 45 },
];

const INTENT_OPTIONS = [
  { label: "Casual", icon: "chatbubbles-outline" as const },
  { label: "Long-term", icon: "heart-outline" as const },
  { label: "Marriage", icon: "heart-circle-outline" as const },
];

export function DiscoveryCenterScreen({
  filters,
  onFiltersChange,
  onBack,
}: {
  filters: MatchFilters;
  onFiltersChange: (filters: MatchFilters) => void;
  signals: any[];
  smartDiscovery: boolean;
  crossedPaths: boolean;
  onSmartChange: (enabled: boolean) => void;
  onCrossedChange: (enabled: boolean) => void;
  onClear: () => void;
  onBack: () => void;
}) {
  const [cityInput, setCityInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const updateFilter = (key: keyof MatchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: keyof MatchFilters, value: string) => {
    const current = (filters[key] as string[]) || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    updateFilter(key, next);
  };

  const filteredCities = INDIAN_CITIES.filter(
    (city) =>
      city.toLowerCase().includes(cityInput.toLowerCase()) &&
      !filters.cities.includes(city),
  ).slice(0, 5);

  const addCity = (city: string) => {
    if (!filters.cities.includes(city)) {
      updateFilter("cities", [...filters.cities, city]);
      setCityInput("");
      setShowSuggestions(false);
    }
  };

  const removeCity = (city: string) => {
    updateFilter(
      "cities",
      filters.cities.filter((item) => item !== city),
    );
  };

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paperBase }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 60,
            paddingHorizontal: 12,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              width: "100%",
              maxWidth: MAX_WIDTH,
              alignSelf: "center",
              backgroundColor: palette.paper,
              borderRadius: radius.xl,
              paddingHorizontal: SIDE_PADDING,
              paddingVertical: 20,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <TouchableOpacity
                onPress={onBack}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: palette.paperSand,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="arrow-back" size={18} color={palette.ink} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: typeScale.title,
                    color: palette.ink,
                  }}
                >
                  Match Filters
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    color: palette.slate,
                    marginTop: 2,
                  }}
                >
                  Shape who you want to meet
                </Text>
              </View>
            </View>

            <SectionHeader
              title="Looking for"
              subtitle="Who do you want to meet?"
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <Chip
                icon="woman-outline"
                label="Women"
                active={filters.lookingFor === "Women"}
                onPress={() => updateFilter("lookingFor", "Women")}
              />
              <Chip
                icon="man-outline"
                label="Men"
                active={filters.lookingFor === "Men"}
                onPress={() => updateFilter("lookingFor", "Men")}
              />
              <Chip
                icon="people-outline"
                label="Everyone"
                active={filters.lookingFor === "Everyone"}
                onPress={() => updateFilter("lookingFor", "Everyone")}
              />
            </View>

            <SectionHeader
              title="Age range"
              subtitle="Choose your preferred age"
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {AGE_OPTIONS.map((option) => (
                <Chip
                  key={option.label}
                  icon="calendar-outline"
                  label={option.label}
                  active={
                    filters.minAge === option.min &&
                    filters.maxAge === option.max
                  }
                  onPress={() => {
                    updateFilter("minAge", option.min);
                    updateFilter("maxAge", option.max);
                  }}
                />
              ))}
            </View>

            <SectionHeader title="City" subtitle="Where should they be from?" />
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  value={cityInput}
                  onChangeText={(text) => {
                    setCityInput(text);
                    setShowSuggestions(true);
                  }}
                  placeholder="Search city..."
                  style={{
                    flex: 1,
                    backgroundColor: palette.paperSand,
                    borderWidth: 1,
                    borderColor: palette.rule,
                    borderRadius: radius.md,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 14,
                    fontFamily: fonts.body,
                    color: palette.ink,
                    outlineStyle: "none" as any,
                  }}
                  placeholderTextColor={palette.navySoft}
                  onFocus={() => setShowSuggestions(true)}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (cityInput.trim()) addCity(cityInput.trim());
                  }}
                  style={{
                    backgroundColor: palette.navy,
                    paddingHorizontal: 20,
                    justifyContent: "center",
                    borderRadius: radius.md,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: fonts.bodySemi,
                      fontSize: 14,
                    }}
                  >
                    Add
                  </Text>
                </TouchableOpacity>
              </View>

              {showSuggestions &&
                cityInput.length > 0 &&
                filteredCities.length > 0 && (
                  <View
                    style={{
                      marginTop: 8,
                      backgroundColor: palette.paper,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: palette.rule,
                      overflow: "hidden",
                    }}
                  >
                    {filteredCities.map((city) => (
                      <TouchableOpacity
                        key={city}
                        onPress={() => addCity(city)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: palette.rule,
                        }}
                      >
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color={palette.navy}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontFamily: fonts.body,
                            color: palette.ink,
                          }}
                        >
                          {city}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {filters.cities.map((city) => (
                <View
                  key={city}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: palette.paperSand,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: radius.pill,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: fonts.bodySemi,
                      color: palette.ink,
                      marginRight: 6,
                    }}
                  >
                    {city}
                  </Text>
                  <TouchableOpacity onPress={() => removeCity(city)}>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={palette.slate}
                    />
                  </TouchableOpacity>
                </View>
              ))}
              {filters.cities.length === 0 && (
                <Text
                  style={{
                    fontSize: 13,
                    color: palette.slate,
                    fontStyle: "italic",
                    fontFamily: fonts.body,
                  }}
                >
                  No city selected (Anywhere)
                </Text>
              )}
            </View>

            <SectionHeader
              title="What are you looking for?"
              subtitle="Choose your relationship goal"
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {INTENT_OPTIONS.map((intent) => (
                <Chip
                  key={intent.label}
                  icon={intent.icon}
                  label={intent.label}
                  active={filters.intents.includes(intent.label)}
                  onPress={() => toggleArrayFilter("intents", intent.label)}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={onBack}
              style={{
                backgroundColor: palette.navy,
                paddingVertical: 14,
                borderRadius: radius.pill,
                alignItems: "center",
                marginTop: 32,
                minHeight: 48,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: fonts.bodySemi,
                  fontSize: 15,
                }}
              >
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppCanvas>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ marginBottom: 12, marginTop: 24 }}>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: typeScale.section,
          color: palette.ink,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontSize: 13,
            color: palette.slate,
            marginTop: 2,
            fontFamily: fonts.body,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

function Chip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active ? palette.navy : palette.rule,
        backgroundColor: active ? palette.navy : palette.paper,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? "#FFFFFF" : palette.navy}
        style={{ marginRight: 6 }}
      />
      <Text
        style={{
          fontSize: 13,
          fontFamily: fonts.bodySemi,
          color: active ? "#FFFFFF" : palette.ink,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
