import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import { supabase } from "../lib/supabase";
import type { Profile, Partnership } from "../types";

type PartnerWithProfile = {
  partnership: Partnership;
  profile: Profile;
};

type Props = {
  onBack?: () => void;
};

export default function PartnerScreen({ onBack }: Props) {
  const [partners, setPartners] = useState<PartnerWithProfile[]>([]);
  const [pendingReceived, setPendingReceived] = useState<PartnerWithProfile[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [myId, setMyId] = useState("");
  const [partnerCount, setPartnerCount] = useState(0);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyId(user.id);

    // Accepted partners
    const { data: ps } = await supabase
      .from("partnerships")
      .select("*")
      .eq("status", "accepted")
      .or("requester_id.eq." + user.id + ",partner_id.eq." + user.id);

    const accepted: PartnerWithProfile[] = [];
    if (ps) {
      for (const p of ps) {
        const otherId = p.requester_id === user.id ? p.partner_id : p.requester_id;
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", otherId).single();
        if (prof) accepted.push({ partnership: p, profile: prof });
      }
    }
    setPartners(accepted);
    setPartnerCount(accepted.length);

    // Pending received
    const { data: pending } = await supabase
      .from("partnerships")
      .select("*")
      .eq("partner_id", user.id)
      .eq("status", "pending");

    const pendingList: PartnerWithProfile[] = [];
    if (pending) {
      for (const p of pending) {
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", p.requester_id).single();
        if (prof) pendingList.push({ partnership: p, profile: prof });
      }
    }
    setPendingReceived(pendingList);

    // Friends (for adding partners)
    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or("requester_id.eq." + user.id + ",addressee_id.eq." + user.id);

    const friendProfiles: Profile[] = [];
    if (friendships) {
      const allPartnerIds = (ps || []).map((p) =>
        p.requester_id === user.id ? p.partner_id : p.requester_id
      );
      const allPendingSentIds = ((await supabase
        .from("partnerships")
        .select("partner_id")
        .eq("requester_id", user.id)).data || []).map((p) => p.partner_id);

      for (const f of friendships) {
        const fId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        if (!allPartnerIds.includes(fId) && !allPendingSentIds.includes(fId)) {
          const { data: prof } = await supabase.from("profiles").select("*").eq("id", fId).single();
          if (prof) friendProfiles.push(prof);
        }
      }
    }
    setFriends(friendProfiles);
  };

  const sendRequest = async (partnerId: string) => {
    if (partnerCount >= 4) {
      Alert.alert("上限", "パートナーは最大4人までです");
      return;
    }
    const { error } = await supabase.from("partnerships").insert({
      requester_id: myId,
      partner_id: partnerId,
    });
    if (error) {
      Alert.alert("エラー", "申請に失敗しました");
    } else {
      Alert.alert("送信完了", "パートナー申請を送りました！");
      load();
    }
  };

  const acceptPartner = async (id: string) => {
    await supabase.from("partnerships").update({ status: "accepted" }).eq("id", id);
    load();
  };

  const rejectPartner = async (id: string) => {
    await supabase.from("partnerships").update({ status: "rejected" }).eq("id", id);
    load();
  };

  const removePartner = (id: string, name: string) => {
    Alert.alert("解除", name + " とのパートナーを解除しますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "解除", style: "destructive", onPress: async () => {
        await supabase.from("partnerships").delete().eq("id", id);
        load();
      }},
    ]);
  };

  return (
    <View style={s.container}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>戻る</Text>
        </TouchableOpacity>
      )}
      <Text style={s.title}>パートナー</Text>
      <Text style={s.subtitle}>二人とも記録した日の連続数を計測</Text>

      {/* Pending */}
      {pendingReceived.length > 0 && (
        <>
          <Text style={s.sectionTitle}>申請が届いています</Text>
          {pendingReceived.map((item) => (
            <View key={item.partnership.id} style={s.requestCard}>
              <Text style={s.requestName}>{item.profile.nickname}</Text>
              <View style={s.requestActions}>
                <TouchableOpacity style={s.acceptBtn} onPress={() => acceptPartner(item.partnership.id)}>
                  <Text style={s.acceptText}>承認</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.rejectBtn} onPress={() => rejectPartner(item.partnership.id)}>
                  <Text style={s.rejectText}>拒否</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Current Partners */}
      <Text style={s.sectionTitle}>パートナー（{partners.length}/4）</Text>
      {partners.map((item) => (
        <View key={item.partnership.id} style={s.partnerCard}>
          {item.profile.avatar_url ? (
            <Image source={{ uri: item.profile.avatar_url }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarEmoji}>🙂</Text>
            </View>
          )}
          <View style={s.partnerInfo}>
            <Text style={s.partnerName}>{item.profile.nickname}</Text>
            <Text style={s.partnerId}>@{item.profile.user_id}</Text>
          </View>
          <View style={s.streakWrap}>
            <Text style={s.streakNum}>{item.partnership.streak_count}</Text>
            <Text style={s.streakLabel}>日連続</Text>
          </View>
          <TouchableOpacity style={s.removeBtn} onPress={() => removePartner(item.partnership.id, item.profile.nickname)}>
            <Text style={s.removeText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      {partners.length === 0 && (
        <Text style={s.empty}>まだパートナーがいません</Text>
      )}

      {/* Add from friends */}
      {friends.length > 0 && partnerCount < 4 && (
        <>
          <Text style={s.sectionTitle}>フレンドから追加</Text>
          {friends.map((f) => (
            <View key={f.id} style={s.addCard}>
              <Text style={s.addName}>{f.nickname}</Text>
              <TouchableOpacity style={s.addBtn} onPress={() => sendRequest(f.id)}>
                <Text style={s.addBtnText}>申請</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f1a", paddingTop: 60 },
  backBtn: { paddingHorizontal: 20, marginBottom: 12, paddingVertical: 8 },
  backText: { color: "#4A90D9", fontSize: 18, fontWeight: "600" },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", paddingHorizontal: 20 },
  subtitle: { color: "#666", fontSize: 13, paddingHorizontal: 20, marginTop: 4, marginBottom: 16 },
  sectionTitle: { color: "#888", fontSize: 13, fontWeight: "600", paddingHorizontal: 20, marginTop: 20, marginBottom: 8 },
  requestCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginHorizontal: 20, padding: 14,
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, marginBottom: 8,
  },
  requestName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  requestActions: { flexDirection: "row", gap: 8 },
  acceptBtn: { backgroundColor: "rgba(0,200,83,0.2)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  acceptText: { color: "#00C853", fontSize: 13, fontWeight: "600" },
  rejectBtn: { backgroundColor: "rgba(233,30,99,0.2)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  rejectText: { color: "#E91E63", fontSize: 13, fontWeight: "600" },
  partnerCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 20, padding: 14,
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#4A90D9", justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarEmoji: { fontSize: 20 },
  partnerInfo: { flex: 1 },
  partnerName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  partnerId: { color: "#666", fontSize: 12 },
  streakWrap: { alignItems: "center", marginRight: 12 },
  streakNum: { color: "#FF9800", fontSize: 22, fontWeight: "800" },
  streakLabel: { color: "#FF9800", fontSize: 10 },
  removeBtn: { padding: 6 },
  removeText: { color: "#666", fontSize: 16 },
  empty: { color: "#666", textAlign: "center", marginTop: 20, fontSize: 14, paddingHorizontal: 20 },
  addCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  addName: { color: "#ccc", fontSize: 15 },
  addBtn: { backgroundColor: "#4A90D9", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
