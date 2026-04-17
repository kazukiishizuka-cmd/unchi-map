import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  Image,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";

type Props = {
  onBack?: () => void;
  onProfileUpdate?: () => void;
};

const COLOR_LIST = [
  "#4A90D9",
  "#E91E8C",
  "#FF8C00",
  "#00C853",
  "#9C27B0",
  "#F44336",
];

function ColorCircle({ color, selected, onPress }: { color: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View
        style={StyleSheet.flatten([
          colorStyles.circle,
          { backgroundColor: color },
          selected ? colorStyles.selected : colorStyles.unselected,
        ])}
      />
    </TouchableOpacity>
  );
}

const colorStyles = StyleSheet.create({
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  selected: {
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  unselected: {
    borderWidth: 0,
    borderColor: "transparent",
  },
});

export default function SettingsScreen({ onBack, onProfileUpdate }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [editUserId, setEditUserId] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editing, setEditing] = useState(false);

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
    if (data) {
      setProfile(data);
      setEditUserId(data.user_id);
      setEditNickname(data.nickname);
      setEditBio(data.bio || "");
    }
  };

  const saveProfile = async () => {
    if (!editUserId.trim() || !editNickname.trim()) {
      Alert.alert("IDとニックネームを入力してください");
      return;
    }
    if (editUserId.trim().length < 3) {
      Alert.alert("IDは3文字以上にしてください");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ user_id: editUserId.trim(), nickname: editNickname.trim(), bio: editBio.trim() || null })
      .eq("id", user.id);
    if (error) {
      Alert.alert("保存エラー", error.message);
    } else {
      setProfile((prev) => prev ? { ...prev, user_id: editUserId.trim(), nickname: editNickname.trim(), bio: editBio.trim() || null } : null);
      setEditing(false);
      onProfileUpdate?.();
    }
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

  const togglePublic = async (value: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ is_public: value })
      .eq("id", user.id);
    if (!error) {
      setProfile((prev) => prev ? { ...prev, is_public: value } : null);
    }
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("写真へのアクセスを許可してください");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const base64 = result.assets[0].base64;
      const fileName = user.id + ".jpg";

      if (!base64) {
        Alert.alert("Error", "base64 is empty");
        return;
      }

      const decoded = decode(base64);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, decoded, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        Alert.alert("Upload failed", uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl + "?t=" + Date.now();

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) {
        Alert.alert("Profile update failed", updateError.message);
        return;
      }

      setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrl } : null);
      onProfileUpdate?.();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Unknown error");
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  };

  return (
    <View style={s.container}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>戻る</Text>
        </TouchableOpacity>
      )}
      <Text style={s.title}>設定</Text>

      <ScrollView style={s.scroll}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>アイコン</Text>
          <TouchableOpacity style={s.avatarRow} onPress={pickAvatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarEmoji}>🙂</Text>
              </View>
            )}
            <Text style={s.avatarChangeText}>タップして変更</Text>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>アカウント</Text>
          {editing ? (
            <View>
              <Text style={s.inputLabel}>ユーザーID</Text>
              <TextInput
                style={s.textInput}
                value={editUserId}
                onChangeText={setEditUserId}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#555"
              />
              <Text style={s.inputLabel}>ニックネーム</Text>
              <TextInput
                style={s.textInput}
                value={editNickname}
                onChangeText={setEditNickname}
                placeholderTextColor="#555"
              />
              <Text style={s.inputLabel}>自己紹介</Text>
              <TextInput
                style={s.textInputMulti}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="自己紹介を書こう"
                placeholderTextColor="#555"
                multiline
              />
              <View style={s.editActions}>
                <TouchableOpacity style={s.saveBtn} onPress={saveProfile}>
                  <Text style={s.saveBtnText}>保存</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => {
                  setEditUserId(profile?.user_id || "");
                  setEditNickname(profile?.nickname || "");
                  setEditBio(profile?.bio || "");
                  setEditing(false);
                }}>
                  <Text style={s.cancelBtnText}>キャンセル</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>ユーザーID</Text>
                <Text style={s.infoValue}>@{profile?.user_id}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>ニックネーム</Text>
                <Text style={s.infoValue}>{profile?.nickname}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>自己紹介</Text>
                <Text style={s.infoValue}>{profile?.bio || "未設定"}</Text>
              </View>
              <TouchableOpacity style={s.editBtn} onPress={() => setEditing(true)}>
                <Text style={s.editBtnText}>編集</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>ピンの色</Text>
          <View style={s.colorGrid}>
            {COLOR_LIST.map((color) => (
              <ColorCircle
                key={color}
                color={color}
                selected={profile?.pin_color === color}
                onPress={() => updatePinColor(color)}
              />
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>公開設定</Text>
          <View style={s.switchRow}>
            <View style={s.switchLabelWrap}>
              <Text style={s.switchLabel}>うんち記録を公開</Text>
              <Text style={s.switchSub}>OFFにするとフレンドに表示されません</Text>
            </View>
            <Switch
              value={profile?.is_public ?? true}
              onValueChange={togglePublic}
              trackColor={{ true: "#4A90D9", false: "#333" }}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>通知</Text>
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>ストリークリマインド(18:00)</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ true: "#8B6914", false: "#333" }}
            />
          </View>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>ログアウト</Text>
        </TouchableOpacity>

        <View style={s.spacer} />
      </ScrollView>
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
  scroll: { flex: 1 },
  spacer: { height: 60 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
  },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.15)",
  },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#4A90D9",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.15)",
  },
  avatarEmoji: { fontSize: 32 },
  avatarChangeText: { color: "#4A90D9", fontSize: 14 },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  infoLabel: { color: "#888", fontSize: 14 },
  infoValue: { color: "#fff", fontSize: 14 },
  inputLabel: { color: "#888", fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 15,
  },
  textInputMulti: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 15,
    minHeight: 70,
    textAlignVertical: "top",
  },
  editActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  saveBtn: {
    flex: 1, backgroundColor: "#4A90D9", borderRadius: 12, padding: 12, alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  cancelBtn: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 12, alignItems: "center",
  },
  cancelBtnText: { color: "#888", fontSize: 14 },
  editBtn: { marginTop: 12 },
  editBtnText: { color: "#4A90D9", fontSize: 14 },
  colorGrid: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  switchRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  switchLabelWrap: { flex: 1 },
  switchLabel: { color: "#ccc", fontSize: 14 },
  switchSub: { color: "#666", fontSize: 11, marginTop: 2 },
  logoutBtn: {
    marginHorizontal: 20, marginTop: 20, padding: 16,
    backgroundColor: "rgba(233,30,99,0.1)",
    borderRadius: 14, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(233,30,99,0.2)",
  },
  logoutText: { color: "#E91E63", fontSize: 15, fontWeight: "600" },
});
