import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { AppCanvas } from "../../../components/AppCanvas";
import { BottomNav } from "../../../components/navigation/BottomNav";
import { postApi } from "../../../api/postApi";

// Server par photo upload karne ka function
async function uploadPhotoAsset(
  uri: string,
  accessToken?: string,
): Promise<string> {
  if (!accessToken) return uri;
  try {
    const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";
    const formData = new FormData();
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append("photo", blob, "photo.jpg");
    const uploadResponse = await fetch(`${API_URL}/profile/upload-photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });
    const data = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(data.error || "Upload failed");
    return data.url; // Server ka URL return karega
  } catch (e) {
    console.log("Photo upload failed, using local URI", e);
    return uri; // Fallback (par yeh local URI refresh par kaam nahi karegi)
  }
}

type Post = {
  id: string;
  media_url: string;
  caption: string;
};

export function ProfileScreen({
  profile,
  verified,
  profilePhoto,
  navigate,
  accessToken,
}: {
  profile: any;
  verified: boolean;
  profilePhoto?: string;
  navigate: (screen: any) => void;
  accessToken?: string;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [newPostImage, setNewPostImage] = useState("");
  const [newPostCaption, setNewPostCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  // Posts fetch karo jab screen khule
  useEffect(() => {
    if (!accessToken) return;
    postApi
      .getMyPosts(accessToken)
      .then((res) => setPosts(res.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const pickPostImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setNewPostImage(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!accessToken || !newPostImage) return;
    setUploading(true);
    try {
      // 1. Pehle photo server par upload karo
      const uploadedUrl = await uploadPhotoAsset(newPostImage, accessToken);

      // 2. Ab server ka URL database mein save karo
      await postApi.create(accessToken, uploadedUrl, newPostCaption);

      const res = await postApi.getMyPosts(accessToken);
      setPosts(res.posts || []);
      setPostModalVisible(false);
      setNewPostImage("");
      setNewPostCaption("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!accessToken) return;
    try {
      await postApi.delete(accessToken, postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Top Header - + icon left, Menu right */}
          <View style={styles.header}>
            {/* Left Side: + Icon */}
            <TouchableOpacity onPress={() => setPostModalVisible(true)}>
              <Ionicons name="add-circle-outline" size={32} color="#1A1416" />
            </TouchableOpacity>

            {/* Right Side: Menu Icon */}
            <TouchableOpacity onPress={() => navigate("settings")}>
              <Ionicons name="menu-outline" size={32} color="#1A1416" />
            </TouchableOpacity>
          </View>

          {/* Profile Info Section */}
          <View style={styles.profileInfoContainer}>
            {/* Bada Profile Picture */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarRing}>
                {profilePhoto ? (
                  <Image
                    source={{ uri: profilePhoto }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={40} color="#A0A0A0" />
                  </View>
                )}
              </View>
              {verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
                </View>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>5</Text>
                <Text style={styles.statLabel}>Likes</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>10</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
            </View>
          </View>

          {/* Bio Section */}
          <View style={styles.bioContainer}>
            <Text style={styles.nameText}>
              {profile.firstName}
              {profile.age ? `, ${profile.age}` : ""}
            </Text>
            <Text style={styles.professionText}>
              {profile.profession || "Add profession"} ·{" "}
              {profile.city || "Add city"}
            </Text>
            <Text style={styles.bioText}>
              {profile.bio ||
                "✨ Building my profile. Love exploring new places, good coffee, and meaningful conversations."}
            </Text>
          </View>

          {/* Action Buttons (Instagram Style) */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              onPress={() => navigate("profileSetup")}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>Edit profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPostModalVisible(true)}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>Share profile</Text>
            </TouchableOpacity>
          </View>

          {/* Posts Grid */}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#8A6722" />
          ) : posts.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Ionicons name="images-outline" size={48} color="#E2D9CB" />
              <Text style={{ color: "#A0A0A0", marginTop: 12 }}>
                No posts yet
              </Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.gridItem}
                  onLongPress={() => handleDeletePost(post.id)}
                >
                  <Image
                    source={{ uri: post.media_url }}
                    style={styles.gridImage}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Post Creation Modal */}
        <Modal visible={postModalVisible} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F3E9" }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#E2D9CB",
              }}
            >
              <TouchableOpacity onPress={() => setPostModalVisible(false)}>
                <Text style={{ fontSize: 16, color: "#B00020" }}>Cancel</Text>
              </TouchableOpacity>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#1A1416" }}
              >
                New Post
              </Text>
              <TouchableOpacity
                onPress={handleCreatePost}
                disabled={uploading || !newPostImage}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: uploading || !newPostImage ? "#A0A0A0" : "#8A6722",
                  }}
                >
                  {uploading ? "Posting..." : "Share"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <TouchableOpacity
                onPress={pickPostImage}
                style={{ marginBottom: 20 }}
              >
                {newPostImage ? (
                  <Image
                    source={{ uri: newPostImage }}
                    style={{ width: "100%", height: 300, borderRadius: 12 }}
                  />
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: 300,
                      borderRadius: 12,
                      backgroundColor: "#E2D9CB",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="camera" size={48} color="#A0A0A0" />
                    <Text style={{ color: "#A0A0A0", marginTop: 8 }}>
                      Tap to select a photo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                value={newPostCaption}
                onChangeText={setNewPostCaption}
                placeholder="Write a caption..."
                multiline
                style={{
                  backgroundColor: "#FFF",
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: "#E2D9CB",
                  height: 100,
                  textAlignVertical: "top",
                }}
                placeholderTextColor="#A0A0A0"
              />
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <BottomNav active="profile" navigate={navigate} />
      </SafeAreaView>
    </AppCanvas>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1416",
  },
  profileInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    marginBottom: 20,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 24,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: "#8A6722",
    justifyContent: "center",
    alignItems: "center",
    padding: 3,
  },
  avatarImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  avatarPlaceholder: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#E2D9CB",
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 2,
  },
  statsContainer: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E2D9CB",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1416",
  },
  statLabel: {
    fontSize: 12,
    color: "#635A5D",
    marginTop: 2,
    fontWeight: "500",
  },
  bioContainer: {
    paddingHorizontal: 22,
    marginBottom: 20,
  },
  nameText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1416",
  },
  professionText: {
    fontSize: 14,
    color: "#635A5D",
    marginTop: 4,
    fontWeight: "500",
  },
  bioText: {
    fontSize: 14,
    color: "#3C3336",
    marginTop: 10,
    lineHeight: 22,
  },
  actionButtonsRow: {
    flexDirection: "row",
    paddingHorizontal: 22,
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#F8F3E9",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2D9CB",
  },
  actionButtonText: {
    color: "#1A1416",
    fontWeight: "600",
    fontSize: 14,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
  },
  gridItem: {
    width: "31.5%",
    aspectRatio: 1,
  },
  gridImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
});
