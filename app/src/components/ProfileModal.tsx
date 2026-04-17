import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
} from "react-native";
import type { Profile } from "../types";

type Props = {
  profile: Profile | null;
  visible: boolean;
  onClose: () => void;
};

export default function ProfileModal({ profile, visible, onClose }: Props) {
  if (!profile) return null;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.card}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarEmoji}>🙂</Text>
            </View>
          )}

          <Text style={s.nickname}>{profile.nickname}</Text>
          <Text style={s.userId}>@{profile.user_id}</Text>

          {profile.bio ? (
            <Text style={s.bio}>{profile.bio}</Text>
          ) : null}

          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statNum}>{profile.streak_count}</Text>
              <Text style={s.statLabel}>連続記録</Text>
            </View>
          </View>

          {profile.streak_count > 0 && (
            <View style={s.streakBadge}>
              <Text style={s.streakText}>🔥 {profile.streak_count}日連続！</Text>
            </View>
          )}

          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeBtnText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#16162a",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: 280,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#4A90D9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 16,
  },
  avatarEmoji: { fontSize: 40 },
  nickname: { color: "#fff", fontSize: 22, fontWeight: "700" },
  userId: { color: "#666", fontSize: 14, marginTop: 4 },
  bio: { color: "#aaa", fontSize: 13, marginTop: 12, textAlign: "center", lineHeight: 18 },
  statsRow: { flexDirection: "row", marginTop: 20, gap: 24 },
  stat: { alignItems: "center" },
  statNum: { color: "#fff", fontSize: 28, fontWeight: "800" },
  statLabel: { color: "#888", fontSize: 12, marginTop: 2 },
  streakBadge: {
    marginTop: 16,
    backgroundColor: "rgba(255,152,0,0.1)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,152,0,0.2)",
  },
  streakText: { color: "#FF9800", fontSize: 15, fontWeight: "600" },
  closeBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
  },
  closeBtnText: { color: "#888", fontSize: 14 },
});
