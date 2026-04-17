import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [userId, setUserId] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!userId || !password) {
      Alert.alert("エラー", "IDとパスワードを入力してください");
      return;
    }
    setLoading(true);
    const email = `${userId}@unchi-map.app`;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) Alert.alert("ログインエラー", error.message);
  };

  const handleSignUp = async () => {
    if (!userId || !nickname || !password) {
      Alert.alert("エラー", "全ての項目を入力してください");
      return;
    }
    if (userId.length < 3) {
      Alert.alert("エラー", "IDは3文字以上にしてください");
      return;
    }
    if (password.length < 6) {
      Alert.alert("エラー", "パスワードは6文字以上にしてください");
      return;
    }
    setLoading(true);
    const email = `${userId}@unchi-map.app`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { user_id: userId, nickname },
      },
    });
    setLoading(false);
    if (error) {
      Alert.alert("登録エラー", error.message);
    } else {
      Alert.alert("登録完了", "アカウントが作成されました！");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.logo}>💩</Text>
      <Text style={styles.appName}>うんちマップ</Text>
      <Text style={styles.tagline}>記録して、共有して、つながろう</Text>

      <View style={styles.form}>
        <Text style={styles.label}>ユーザーID</Text>
        <TextInput
          style={styles.input}
          placeholder="@your_id"
          placeholderTextColor="#555"
          value={userId}
          onChangeText={setUserId}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {isSignUp && (
          <>
            <Text style={styles.label}>ニックネーム</Text>
            <TextInput
              style={styles.input}
              placeholder="表示名"
              placeholderTextColor="#555"
              value={nickname}
              onChangeText={setNickname}
            />
          </>
        )}

        <Text style={styles.label}>パスワード</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#555"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={isSignUp ? handleSignUp : handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "..." : isSignUp ? "アカウント作成" : "ログイン"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.switchText}>
            {isSignUp
              ? "アカウントをお持ちの方 →"
              : "アカウントを作成する →"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f1a",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  logo: { fontSize: 64, marginBottom: 8 },
  appName: { color: "#fff", fontSize: 28, fontWeight: "800" },
  tagline: { color: "#666", fontSize: 13, marginBottom: 40 },
  form: { width: "100%" },
  label: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 14,
    color: "#fff",
    fontSize: 15,
  },
  button: {
    backgroundColor: "#8B6914",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  switchText: { color: "#4A90D9", fontSize: 13, marginTop: 20, textAlign: "center" },
});
