import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";

type Props = {
  location: Location.LocationObject;
  profile: Profile | null;
  onClose: () => void;
  onComplete: () => void;
};

export default function RecordDrawer({ location, profile, onClose, onComplete }: Props) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (results.length > 0) {
          const r = results[0];
          const parts = [r.region, r.city, r.district, r.street].filter(Boolean);
          setAddress(parts.join(" "));
        }
      } catch {}
    })();
  }, [location]);

  const handleRecord = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("エラー", "ログインしてください");
      return;
    }

    setLoading(true);

    // 記録を保存
    const { error: recordError } = await supabase.from("records").insert({
      user_id: user.id,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      comment: comment || null,
    });

    if (recordError) {
      Alert.alert("エラー", "記録の保存に失敗しました");
      setLoading(false);
      return;
    }

    // ストリーク更新
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let newStreak = 1;
    if (profile) {
      if (profile.last_record_date === today) {
        // 今日すでに記録済み → ストリーク変更なし
        newStreak = profile.streak_count;
      } else if (profile.last_record_date === yesterday) {
        // 昨日記録あり → 継続
        newStreak = profile.streak_count + 1;
      }
      // それ以外 → リセットで1
    }

    await supabase
      .from("profiles")
      .update({ streak_count: newStreak, last_record_date: today })
      .eq("id", user.id);

    setLoading(false);
    onComplete();
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.drawer}>
          <ScrollView>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>💩 記録する</Text>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>📍 現在地</Text>
              <Text style={styles.locationText}>
                {address || location.coords.latitude.toFixed(6) + ", " + location.coords.longitude.toFixed(6)}
              </Text>
            </View>

            {/* Comment */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>💬 コメント（任意）</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="今回のうんちはどうだった？"
                placeholderTextColor="#555"
                value={comment}
                onChangeText={setComment}
                multiline
              />
            </View>

            {/* Streak */}
            <View style={styles.streakBox}>
              <Text style={styles.streakNum}>
                {profile?.streak_count || 0}
              </Text>
              <Text style={styles.streakLabel}>日連続記録中 🔥</Text>
              <Text style={styles.streakSub}>
                記録して{(profile?.streak_count || 0) + 1}日目にしよう！
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleRecord}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? "記録中..." : "💩 記録する！"}
              </Text>
            </TouchableOpacity>

            {/* Close */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>閉じる</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  drawer: {
    backgroundColor: "#16162a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  toggle: {
    backgroundColor: "rgba(74,144,217,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4A90D9",
  },
  toggleOff: {
    backgroundColor: "rgba(233,30,99,0.2)",
    borderColor: "#E91E63",
  },
  toggleText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  section: { marginBottom: 20 },
  sectionLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  locationText: { color: "#fff", fontSize: 14 },
  commentInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  streakBox: {
    backgroundColor: "rgba(255,152,0,0.1)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,152,0,0.2)",
  },
  streakNum: { color: "#FF9800", fontSize: 40, fontWeight: "800" },
  streakLabel: { color: "#FF9800", fontSize: 14, marginTop: 4 },
  streakSub: { color: "#666", fontSize: 11, marginTop: 4 },
  submitBtn: {
    backgroundColor: "#8B6914",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  closeBtn: { alignItems: "center", padding: 12 },
  closeText: { color: "#888", fontSize: 14 },
});
