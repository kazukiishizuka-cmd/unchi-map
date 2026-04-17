import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from "react-native";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";

const PIN_COLORS = [
  { label: "ブルー", value: "#4A90D9" },
  { label: "ピンク", value: "#E91E8C" },
  { label: "オレンジ", value: "#FF8C00" },
  { label: "グリーン", value: "#00C853" },
  { label: "パープル", value: "#9C27B0" },
  { label: "レッド", value: "#F44336" },
];

export default function SettingsScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data);
  };

  const updatePinColor = async (color: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ pin_color: color })
      .eq("id", user.id);
    setProfile((prev) => prev ? { ...prev, pin_color: color } : null);
  };

  const handleLogout = async () => {
    Alert.alert("ログアウト", "本当にログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "ログアウト",
        style: "destructive",
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚙️ 設定</Text>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アカウント</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>ユーザーID</Text>
          <Text style={styles.infoValue}>@{profile?.user_id}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>ニックネーム</Text>
          <Text style={styles.infoValue}>{profile?.nickname}</Text>
        </View>
      </View>

      {/* Pin Color */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ピンの色</Text>
        <View style={styles.colorGrid}>
          {PIN_COLORS.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[
                styles.colorOption,
                { backgroundColor: c.value },
                profile?.pin_color === c.value && styles.colorSelected,
              ]}
              onPress={() => updatePinColor(c.value)}
            >
              {profile?.pin_color === c.value && (
                <Text style={styles.colorCheck}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>通知</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>ストリークリマインド（18:00）</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ true: "#8B6914" }}
          />
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>ログアウト</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f1a", paddingTop: 60 },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  infoLabel: { color: "#888", fontSize: 14 },
  infoValue: { color: "#fff", fontSize: 14 },
  colorGrid: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: "#fff",
  },
  colorCheck: { color: "#fff", fontSize: 18, fontWeight: "700" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: { color: "#ccc", fontSize: 14 },
  logoutBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    backgroundColor: "rgba(233,30,99,0.1)",
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(233,30,99,0.2)",
  },
  logoutText: { color: "#E91E63", fontSize: 15, fontWeight: "600" },
});
