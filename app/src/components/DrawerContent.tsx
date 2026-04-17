import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";

export default function DrawerContent(props: any) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadProfile();
    loadPendingRequests();
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

  const loadPendingRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending");
    setPendingCount(count || 0);
  };

  const handleLogout = async () => {
    Alert.alert("ログアウト", "本当にログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "ログアウト",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  return (
    <DrawerContentScrollView {...props} style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🙂</Text>
        </View>
        <Text style={styles.nickname}>{profile?.nickname || "..."}</Text>
        <Text style={styles.userId}>@{profile?.user_id || "..."}</Text>
        {profile && profile.streak_count > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>
              🔥 {profile.streak_count}日連続記録中！
            </Text>
          </View>
        )}
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => props.navigation.navigate("Map")}
        >
          <Text style={styles.menuIcon}>🗺</Text>
          <Text style={styles.menuText}>マップ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => props.navigation.navigate("History")}
        >
          <Text style={styles.menuIcon}>📋</Text>
          <Text style={styles.menuText}>マイ記録</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => props.navigation.navigate("Friends")}
        >
          <Text style={styles.menuIcon}>👥</Text>
          <Text style={styles.menuText}>フレンド</Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => props.navigation.navigate("Settings")}
        >
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuText}>設定</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={styles.menuIcon}>🚪</Text>
          <Text style={[styles.menuText, { color: "#E91E63" }]}>ログアウト</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>うんちマップ v1.0.0</Text>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#16162a" },
  profileSection: {
    padding: 24,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4A90D9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 24 },
  nickname: { color: "#fff", fontSize: 18, fontWeight: "700" },
  userId: { color: "#666", fontSize: 13, marginTop: 2 },
  streakBadge: {
    marginTop: 12,
    backgroundColor: "rgba(255,152,0,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,152,0,0.2)",
  },
  streakText: { color: "#FF9800", fontSize: 13, fontWeight: "600" },
  menu: { paddingVertical: 16 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  menuIcon: { fontSize: 20, width: 32 },
  menuText: { color: "#ccc", fontSize: 15, flex: 1 },
  badge: {
    backgroundColor: "#E91E63",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 24,
    marginVertical: 8,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  footerText: { color: "#555", fontSize: 12 },
});
