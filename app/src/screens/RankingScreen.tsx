import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";

type Props = {
  onBack?: () => void;
};

export default function RankingScreen({ onBack }: Props) {
  const [rankings, setRankings] = useState<Profile[]>([]);
  const [myId, setMyId] = useState<string>("");

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyId(user.id);

    // Get friend IDs
    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or("requester_id.eq." + user.id + ",addressee_id.eq." + user.id);

    const friendIds = (friendships || []).map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );
    friendIds.push(user.id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", friendIds)
      .order("streak_count", { ascending: false });

    if (profiles) setRankings(profiles);
  };

  const getMedal = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return String(index + 1);
  };

  const renderItem = ({ item, index }: { item: Profile; index: number }) => (
    <View style={[s.card, item.id === myId ? s.cardMe : null]}>
      <Text style={s.rank}>{getMedal(index)}</Text>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={s.avatar} />
      ) : (
        <View style={s.avatarPlaceholder}>
          <Text style={s.avatarEmoji}>🙂</Text>
        </View>
      )}
      <View style={s.info}>
        <Text style={s.name}>{item.nickname}</Text>
        <Text style={s.userId}>@{item.user_id}</Text>
      </View>
      <View style={s.streakWrap}>
        <Text style={s.streakNum}>{item.streak_count}</Text>
        <Text style={s.streakLabel}>日</Text>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>戻る</Text>
        </TouchableOpacity>
      )}
      <Text style={s.title}>ストリークランキング</Text>
      <FlatList
        data={rankings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <Text style={s.empty}>データがありません</Text>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
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
  list: { paddingHorizontal: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardMe: {
    borderColor: "rgba(74,144,217,0.3)",
    backgroundColor: "rgba(74,144,217,0.08)",
  },
  rank: { fontSize: 20, width: 36, textAlign: "center" },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#4A90D9",
    justifyContent: "center", alignItems: "center",
    marginRight: 12,
  },
  avatarEmoji: { fontSize: 18 },
  info: { flex: 1 },
  name: { color: "#fff", fontSize: 15, fontWeight: "600" },
  userId: { color: "#666", fontSize: 12 },
  streakWrap: { alignItems: "center" },
  streakNum: { color: "#FF9800", fontSize: 24, fontWeight: "800" },
  streakLabel: { color: "#FF9800", fontSize: 11 },
  empty: { color: "#666", textAlign: "center", marginTop: 40, fontSize: 14 },
});
