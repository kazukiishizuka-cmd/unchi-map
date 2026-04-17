import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { supabase } from "../lib/supabase";
import type { Record as UnchiRecord } from "../types";

export default function HistoryScreen() {
  const [records, setRecords] = useState<UnchiRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyRecords();
  }, []);

  const loadMyRecords = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("records")
      .select("*")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false });
    if (data) setRecords(data);
    setLoading(false);
  };

  const togglePublic = async (record: UnchiRecord) => {
    await supabase
      .from("records")
      .update({ is_public: !record.is_public })
      .eq("id", record.id);
    loadMyRecords();
  };

  const renderItem = ({ item }: { item: UnchiRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>
          {new Date(item.recorded_at).toLocaleString("ja-JP")}
        </Text>
        <TouchableOpacity onPress={() => togglePublic(item)}>
          <Text style={styles.cardVisibility}>
            {item.is_public ? "🔓 公開" : "🔒 非公開"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.cardLocation}>
        📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
      </Text>
      {item.comment && (
        <Text style={styles.cardComment}>💬 {item.comment}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 マイ記録</Text>
      <Text style={styles.count}>{records.length} 件の記録</Text>
      <FlatList
        data={records}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? "読み込み中..." : "まだ記録がありません"}
          </Text>
        }
      />
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
  },
  count: {
    color: "#666",
    fontSize: 13,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  list: { paddingHorizontal: 20 },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardDate: { color: "#fff", fontSize: 14, fontWeight: "600" },
  cardVisibility: { fontSize: 13 },
  cardLocation: { color: "#888", fontSize: 12, marginBottom: 4 },
  cardComment: { color: "#ccc", fontSize: 13, marginTop: 4 },
  empty: { color: "#666", textAlign: "center", marginTop: 40, fontSize: 14 },
});
