import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
} from "react-native";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = 300;

type Screen = "Map" | "History" | "Friends" | "Settings" | "Ranking" | "Partner";

type Props = {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  profile: Profile | null;
  pendingCount: number;
};

export default function CustomDrawer({ visible, onClose, onNavigate, profile, pendingCount }: Props) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleNavigate = (screen: Screen) => {
    onClose();
    setTimeout(() => onNavigate(screen), 250);
  };

  const handleLogout = () => {
    onClose();
    supabase.auth.signOut();
  };

  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        {/* Profile */}
        <View style={styles.profileSection}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>🙂</Text>
            </View>
          )}
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

        {/* Menu */}
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate("Map")}>
            <Text style={styles.menuIcon}>🗺</Text>
            <Text style={styles.menuText}>マップ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate("History")}>
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={styles.menuText}>マイ記録</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate("Friends")}>
            <Text style={styles.menuIcon}>👥</Text>
            <Text style={styles.menuText}>フレンド</Text>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate("Partner")}>
            <Text style={styles.menuIcon}>🤝</Text>
            <Text style={styles.menuText}>パートナー</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate("Ranking")}>
            <Text style={styles.menuIcon}>🏆</Text>
            <Text style={styles.menuText}>ランキング</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate("Settings")}>
            <Text style={styles.menuIcon}>⚙️</Text>
            <Text style={styles.menuText}>設定</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Text style={styles.menuIcon}>🚪</Text>
            <Text style={styles.menuTextDanger}>ログアウト</Text>
          </TouchableOpacity>

        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>うんちマップ v1.0.0</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
  },
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    position: "absolute",
    top: 0, left: 0, bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#16162a",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.08)",
  },
  profileSection: {
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#4A90D9",
    justifyContent: "center", alignItems: "center",
    marginBottom: 12,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.15)",
  },
  avatarText: { fontSize: 24 },
  avatarImage: {
    width: 56, height: 56, borderRadius: 28,
    marginBottom: 12,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.15)",
  },
  nickname: { color: "#fff", fontSize: 18, fontWeight: "700" },
  userId: { color: "#666", fontSize: 13, marginTop: 2 },
  streakBadge: {
    marginTop: 12,
    backgroundColor: "rgba(255,152,0,0.1)",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, alignSelf: "flex-start",
    borderWidth: 1, borderColor: "rgba(255,152,0,0.2)",
  },
  streakText: { color: "#FF9800", fontSize: 13, fontWeight: "600" },
  menu: { paddingVertical: 16, flex: 1 },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 24,
  },
  menuIcon: { fontSize: 20, width: 32 },
  menuText: { color: "#ccc", fontSize: 15, flex: 1 },
  menuTextDanger: { color: "#E91E63", fontSize: 15, flex: 1 },
  badge: {
    backgroundColor: "#E91E63", borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  divider: {
    height: 1, backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 24, marginVertical: 8,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)",
  },
  footerText: { color: "#555", fontSize: 12 },
});
