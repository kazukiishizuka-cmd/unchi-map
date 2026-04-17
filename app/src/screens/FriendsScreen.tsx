import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import ProfileModal from "../components/ProfileModal";
import type { Profile, Friendship } from "../types";

type FriendWithProfile = {
  friendship: Friendship;
  profile: Profile;
};

type Props = {
  onBack?: () => void;
};

export default function FriendsScreen({ onBack }: Props) {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);

  useEffect(() => {
    loadFriends();
    loadSuggestions();
  }, []);

  const loadFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // accepted friends
    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (friendships) {
      const friendProfiles: FriendWithProfile[] = [];
      for (const f of friendships) {
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", friendId)
          .single();
        if (profile) friendProfiles.push({ friendship: f, profile });
      }
      setFriends(friendProfiles);
    }

    // pending requests (received)
    const { data: pending } = await supabase
      .from("friendships")
      .select("*")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (pending) {
      const pendingProfiles: FriendWithProfile[] = [];
      for (const f of pending) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", f.requester_id)
          .single();
        if (profile) pendingProfiles.push({ friendship: f, profile });
      }
      setPendingRequests(pendingProfiles);
    }
  };

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", searchId.trim())
      .single();
    if (data) {
      setSearchResult(data);
    } else {
      Alert.alert("見つかりません", `@${searchId} は存在しません`);
      setSearchResult(null);
    }
  };

  const sendRequest = async (targetId: string) => {
    const { error } = await supabase.from("friendships").insert({
      requester_id: currentUserId,
      addressee_id: targetId,
    });
    if (error) {
      Alert.alert("エラー", "申請に失敗しました（既に申請済みかも）");
    } else {
      Alert.alert("送信完了", "フレンド申請を送りました！");
      setSearchResult(null);
      setSearchId("");
    }
  };

  const loadSuggestions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get my friend IDs
    const { data: myFs } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or("requester_id.eq." + user.id + ",addressee_id.eq." + user.id);

    const myFriendIds = (myFs || []).map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    // Get friends of friends
    const suggestedIds = new Set<string>();
    for (const fId of myFriendIds) {
      const { data: fofs } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or("requester_id.eq." + fId + ",addressee_id.eq." + fId);

      if (fofs) {
        for (const f of fofs) {
          const otherId = f.requester_id === fId ? f.addressee_id : f.requester_id;
          if (otherId !== user.id && !myFriendIds.includes(otherId)) {
            suggestedIds.add(otherId);
          }
        }
      }
    }

    const suggestedProfiles: Profile[] = [];
    for (const sId of suggestedIds) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", sId).single();
      if (prof) suggestedProfiles.push(prof);
    }
    setSuggestions(suggestedProfiles);
  };

  const toggleClose = async (friendshipId: string, currentValue: boolean) => {
    await supabase
      .from("friendships")
      .update({ is_close: !currentValue })
      .eq("id", friendshipId);
    loadFriends();
  };

  const deleteFriend = (friendshipId: string, nickname: string) => {
    Alert.alert("フレンド削除", nickname + " をフレンドから削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          await supabase.from("friendships").delete().eq("id", friendshipId);
          loadFriends();
        },
      },
    ]);
  };

  const acceptRequest = async (friendshipId: string) => {
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    loadFriends();
  };

  const rejectRequest = async (friendshipId: string) => {
    await supabase
      .from("friendships")
      .update({ status: "rejected" })
      .eq("id", friendshipId);
    loadFriends();
  };

  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>戻る</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>👥 フレンド</Text>

      {/* Search */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="IDで検索"
          placeholderTextColor="#555"
          value={searchId}
          onChangeText={setSearchId}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {searchResult && (
        <View style={styles.searchResultCard}>
          <View>
            <Text style={styles.resultName}>{searchResult.nickname}</Text>
            <Text style={styles.resultId}>@{searchResult.user_id}</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => sendRequest(searchResult.id)}
          >
            <Text style={styles.addBtnText}>申請</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>知り合いかも？</Text>
          {suggestions.map((s) => (
            <View key={s.id} style={styles.suggestionCard}>
              <View>
                <Text style={styles.friendName}>{s.nickname}</Text>
                <Text style={styles.friendId}>@{s.user_id}</Text>
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={() => sendRequest(s.id)}>
                <Text style={styles.addBtnText}>申請</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📩 フレンド申請</Text>
          {pendingRequests.map((item) => (
            <View key={item.friendship.id} style={styles.requestCard}>
              <View>
                <Text style={styles.friendName}>{item.profile.nickname}</Text>
                <Text style={styles.friendId}>@{item.profile.user_id}</Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => acceptRequest(item.friendship.id)}
                >
                  <Text style={styles.acceptText}>承認</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => rejectRequest(item.friendship.id)}
                >
                  <Text style={styles.rejectText}>拒否</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Friends List */}
      <Text style={styles.sectionTitle}>
        フレンド一覧（{friends.length}人）
      </Text>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.friendship.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.friendCard} onPress={() => {
            setSelectedProfile(item.profile);
            setProfileModalVisible(true);
          }}>
            <View
              style={[
                styles.friendDot,
                { backgroundColor: item.profile.pin_color },
              ]}
            />
            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>{item.profile.nickname}</Text>
              <Text style={styles.friendId}>@{item.profile.user_id}</Text>
            </View>
            <TouchableOpacity
              style={[styles.closeTag, item.friendship.is_close ? styles.closeTagActive : null]}
              onPress={() => toggleClose(item.friendship.id, item.friendship.is_close)}
            >
              <Text style={[styles.closeTagText, item.friendship.is_close ? styles.closeTagTextActive : null]}>
                {item.friendship.is_close ? "★" : "☆"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteFriendBtn}
              onPress={() => deleteFriend(item.friendship.id, item.profile.nickname)}
            >
              <Text style={styles.deleteFriendText}>🗑</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>まだフレンドがいません</Text>
        }
      />
      <ProfileModal
        profile={selectedProfile}
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f1a", paddingTop: 60 },
  backBtn: { paddingHorizontal: 20, marginBottom: 12, paddingVertical: 8 },
  backText: { color: "#4A90D9", fontSize: 18, fontWeight: "600" },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 14,
    color: "#fff",
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: "#8B6914",
    borderRadius: 14,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtnText: { fontSize: 20 },
  searchResultCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: "rgba(74,144,217,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(74,144,217,0.2)",
    marginBottom: 16,
  },
  resultName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  resultId: { color: "#888", fontSize: 13 },
  addBtn: {
    backgroundColor: "#4A90D9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  sectionTitle: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  requestCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    marginBottom: 8,
  },
  requestActions: { flexDirection: "row", gap: 8 },
  acceptBtn: {
    backgroundColor: "rgba(0,200,83,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  acceptText: { color: "#00C853", fontSize: 13, fontWeight: "600" },
  rejectBtn: {
    backgroundColor: "rgba(233,30,99,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rejectText: { color: "#E91E63", fontSize: 13, fontWeight: "600" },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  friendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  friendInfo: { flex: 1 },
  friendName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  friendId: { color: "#666", fontSize: 12 },
  friendStreak: { color: "#FF9800", fontSize: 13, marginRight: 12 },
  closeTag: {
    padding: 6,
    marginRight: 4,
  },
  closeTagActive: {},
  closeTagText: { fontSize: 18, color: "#555" },
  closeTagTextActive: { color: "#FF9800" },
  deleteFriendBtn: { padding: 4 },
  deleteFriendText: { fontSize: 16 },
  suggestionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 12,
    backgroundColor: "rgba(255,152,0,0.06)",
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,152,0,0.15)",
  },
  empty: { color: "#666", textAlign: "center", marginTop: 40, fontSize: 14 },
});
