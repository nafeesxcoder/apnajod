import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";
import { colors } from "../../../theme";
import type { MatchFilters } from "../../../storage";

const GOLD = "#8A2237";
const RUBY = "#1F5286";
const LINE = "#D3D6DA";
const PAPER = "#EFF0F2";

// List of Indian cities for suggestions
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
  "Pimpri-Chinchwad, MH",
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
  "Dhanbad, JH",
  "Amritsar, PB",
  "Navi Mumbai, MH",
  "Allahabad, UP",
  "Ranchi, JH",
  "Howrah, WB",
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
  "Tiruppur, TN",
  "Gurgaon, HR",
  "Aligarh, UP",
  "Jalandhar, PB",
  "Bhubaneswar, OR",
  "Salem, TN",
  "Warangal, TG",
  "Guntur, AP",
  "Bhiwandi, MH",
  "Saharanpur, UP",
  "Gorakhpur, UP",
  "Bikaner, RJ",
  "Amravati, MH",
  "Noida, UP",
  "Jamshedpur, JH",
  "Bhilai, CT",
  "Cuttack, OR",
  "Firozabad, UP",
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
  "Loni, UP",
  "Siliguri, WB",
  "Jhansi, UP",
  "Ulhasnagar, MH",
  "Jammu, JK",
  "Sangli, MH",
  "Mangalore, KA",
  "Erode, TN",
  "Belgaum, KA",
  "Ambattur, TN",
  "Tirunelveli, TN",
  "Malegaon, MH",
  "Gaya, BR",
  "Thiruvananthapuram, KL",
  "Udaipur, RJ",
  "Kakinada, AP",
  "Davanagere, KA",
  "Kozhikode, KL",
  "Kurnool, AP",
  "Rajahmundry, AP",
  "Bokaro, JH",
  "South Dumdum, WB",
  "Bellary, KA",
  "Patiala, PB",
  "Gopalpur, WB",
  "Agartala, TR",
  "Bhagalpur, BR",
  "Muzaffarnagar, UP",
  "Bhatpara, WB",
  "Panihati, WB",
  "Latur, MH",
  "Dhule, MH",
  "Rohtak, HR",
  "Korba, CT",
  "Bhilwara, RJ",
  "Brahmapur, OR",
  "Muzaffarpur, BR",
  "Ahmednagar, MH",
  "Mathura, UP",
  "Kollam, KL",
  "Avadi, TN",
  "Kadapa, AP",
  "Kamarhati, WB",
  "Sambalpur, OR",
  "Bilaspur, CT",
  "Shahjahanpur, UP",
  "Satara, MH",
  "Bijapur, KA",
  "Rampur, UP",
  "Shivamogga, KA",
  "Chandrapur, MH",
  "Junagadh, GJ",
  "Thrissur, KL",
  "Alwar, RJ",
  "Bardhaman, WB",
  "Kulti, WB",
  "Kakinada, AP",
  "Nizamabad, TG",
  "Parbhani, MH",
  "Tumkur, KA",
  "Khammam, TG",
  "Ozhukarai, PY",
  "Bihar Sharif, BR",
  "Panipat, HR",
  "Darbhanga, BR",
  "Bally, WB",
  "Aizawl, MZ",
  "Dewas, MP",
  "Ichalkaranji, MH",
  "Karnal, HR",
  "Bathinda, PB",
  "Jalna, MH",
  "Eluru, AP",
  "Barasat, WB",
  "Kirari Suleman Nagar, DL",
  "Purnia, BR",
  "Satna, MP",
  "Mau, UP",
  "Sonipat, HR",
  "Farrukhabad, UP",
  "Sagar, MP",
  "Rourkela, OR",
  "Durg, CT",
  "Imphal, MN",
  "Ratlam, MP",
  "Hapur, UP",
  "Arrah, BR",
  "Anantapur, AP",
  "Karimnagar, TG",
  "Etawah, UP",
  "Ambernath, MH",
  "North Dumdum, WB",
  "Bharatpur, RJ",
  "Begusarai, BR",
  "New Delhi, DL",
  "Gandhidham, GJ",
  "Baranagar, WB",
  "Tiruvottiyur, TN",
  "Pondicherry, PY",
  "Sikar, RJ",
  "Thoothukudi, TN",
  "Rewa, MP",
  "Mirzapur, UP",
  "Raichur, KA",
  "Pali, RJ",
  "Ramagundam, TG",
  "Haridwar, UT",
  "Vijayanagaram, AP",
  "Katihar, BR",
  "Nagercoil, TN",
  "Sri Ganganagar, RJ",
  "Karawal Nagar, DL",
  "Mango, JH",
  "Thanjavur, TN",
  "Bulandshahr, UP",
  "Uluberia, WB",
  "Murwara, MP",
  "Sambhal, UP",
  "Singrauli, MP",
  "Nadiad, GJ",
  "Secunderabad, TG",
  "Naihati, WB",
  "Yamunanagar, HR",
  "Bidhannagar, WB",
  "Pallavaram, TN",
  "Bidar, KA",
  "Munger, BR",
  "Panchkula, HR",
  "Burhanpur, MP",
  "Raurkela, OR",
  "Kharagpur, WB",
  "Dindigul, TN",
  "Gandhinagar, GJ",
  "Hospet, KA",
  "Nangloi Jat, DL",
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
  "Bhalswa Jahangir Pur, DL",
  "Madhyamgram, WB",
  "Bhiwani, HR",
  "Navsari, GJ",
  "Baharampur, WB",
  "Ambala, HR",
  "Morvi, GJ",
  "Fatehpur, UP",
  "Rae Bareli, UP",
  "Khora, UP",
  "Bhusawal, MH",
  "Orai, UP",
  "Bahraich, UP",
  "Vellore, TN",
  "Mahesana, GJ",
  "Raebareli, UP",
  "Sirsa, HR",
  "Danapur, BR",
  "Serampore, WB",
  "Guna, MP",
  "Jaunpur, UP",
  "Panvel, MH",
  "Shivpuri, MP",
  "Surendranagar, GJ",
  "Unnao, UP",
  "Hugli, WB",
  "Alappuzha, KL",
  "Kottayam, KL",
  "Machilipatnam, AP",
  "Shimla, HP",
  "Adoni, AP",
  "Udupi, KA",
  "Tenali, AP",
  "Proddatur, AP",
  "Saharsa, BR",
  "Hindupur, AP",
  "Sasaram, BR",
  "Buxar, BR",
  "Krishnanagar, WB",
  "Fatehabad, HR",
  "Rajahmundry, AP",
  "Nandurbar, MH",
  "Hajipur, BR",
  "Jalpaiguri, WB",
  "Puducherry, PY",
  "Budaun, UP",
  "Sultan Pur Majra, DL",
  "Srikakulam, AP",
  "Porbandar, GJ",
  "Bhiwandi, MH",
  "Bargarh, OR",
  "Nandyal, AP",
  "Sambalpur, OR",
  "Karaikudi, TN",
  "Vellore, TN",
  "Neyveli, TN",
  "Kumbakonam, TN",
  "Dindigul, TN",
  "Karaikal, PY",
  "Thanjavur, TN",
  "Nagapattinam, TN",
  "Tiruvannamalai, TN",
  "Villupuram, TN",
  "Cuddalore, TN",
  "Kancheepuram, TN",
  "Tiruvallur, TN",
  "Hosur, TN",
  "Ambur, TN",
  "Vaniyambadi, TN",
  "Gudiyatham, TN",
  "Arakkonam, TN",
  "Ranipet, TN",
  "Arcot, TN",
  "Polur, TN",
  "Cheyyar, TN",
  "Vandavasi, TN",
  "Melvisharam, TN",
  "Walajapet, TN",
  "Pernampattu, TN",
  "Sholinghur, TN",
  "Nemili, TN",
  "Kaivandapadi, TN",
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

  const SectionHeader = ({
    title,
    subtitle,
  }: {
    title: string;
    subtitle?: string;
  }) => (
    <View style={{ marginBottom: 12, marginTop: 24 }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  const Chip = ({
    label,
    icon,
    active,
    onPress,
  }: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: active ? RUBY : LINE,
        backgroundColor: active ? RUBY : "#FFFFFF",
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? "#FFFFFF" : GOLD}
        style={{ marginRight: 8 }}
      />
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: active ? "#FFFFFF" : colors.text,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
            backgroundColor: "#FFFFFF",
            borderBottomWidth: 1,
            borderBottomColor: LINE,
          }}
        >
          <TouchableOpacity onPress={onBack} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#151719" />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#151719" }}>
            Match Filters
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
            {[
              { label: "21-25", min: 21, max: 25 },
              { label: "25-30", min: 25, max: 30 },
              { label: "25-35", min: 25, max: 35 },
              { label: "30-35", min: 30, max: 35 },
              { label: "35-45", min: 35, max: 45 },
            ].map((option) => (
              <Chip
                key={option.label}
                icon="calendar-outline"
                label={option.label}
                active={
                  filters.minAge === option.min && filters.maxAge === option.max
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
                style={styles.input}
                placeholderTextColor="#9AA4AF"
                onFocus={() => setShowSuggestions(true)}
              />
              <TouchableOpacity
                onPress={() => {
                  if (cityInput.trim()) addCity(cityInput.trim());
                }}
                style={styles.addButton}
              >
                <Text style={{ color: "#FFF", fontWeight: "600" }}>Add</Text>
              </TouchableOpacity>
            </View>

            {showSuggestions &&
              cityInput.length > 0 &&
              filteredCities.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {filteredCities.map((city) => (
                    <TouchableOpacity
                      key={city}
                      onPress={() => addCity(city)}
                      style={styles.suggestionItem}
                    >
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={GOLD}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={{ fontSize: 14, color: colors.text }}>
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
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: LINE,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{ fontSize: 14, color: colors.text, marginRight: 8 }}
                >
                  {city}
                </Text>
                <TouchableOpacity onPress={() => removeCity(city)}>
                  <Ionicons name="close-circle" size={18} color="#9AA4AF" />
                </TouchableOpacity>
              </View>
            ))}
            {filters.cities.length === 0 && (
              <Text
                style={{
                  fontSize: 13,
                  color: colors.muted,
                  fontStyle: "italic",
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
            <Chip
              icon="chatbubbles-outline"
              label="Casual"
              active={filters.intents.includes("Casual")}
              onPress={() => toggleArrayFilter("intents", "Casual")}
            />
            <Chip
              icon="heart-outline"
              label="Long-term"
              active={filters.intents.includes("Long-term")}
              onPress={() => toggleArrayFilter("intents", "Long-term")}
            />
            <Chip
              icon="heart-circle-outline"
              label="Marriage"
              active={filters.intents.includes("Marriage")}
              onPress={() => toggleArrayFilter("intents", "Marriage")}
            />
          </View>

          <TouchableOpacity
            onPress={onBack}
            style={{
              backgroundColor: RUBY,
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 32,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
              Apply Filters
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </AppCanvas>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  addButton: {
    backgroundColor: RUBY,
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 12,
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E6E8EA",
  },
});
