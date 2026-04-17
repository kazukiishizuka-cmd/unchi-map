import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";
import type { Record as UnchiRecord } from "../types";

type RecordWithAddress = UnchiRecord & { address?: string };

type Props = {
  onBack?: () => void;
};

export default function HistoryScreen({ onBack }: Props) {
  const [records, setRecords] = useState<RecordWithAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyRecords();
  }, []);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const r = results[0];
        const parts = [r.region, r.city, r.district, r.street].filter(Boolean);
        return parts.join(" ") || lat.toFixed(4) + ", " + lng.toFixed(4);
      }
    } catch {}
    return lat.toFixed(4) + ", " + lng.toFixed(4);
  };

  const loadMyRecords = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("records")
      .select("*")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false });
    if (data) {
      setRecords(data);
      // 住所を非同期で取得
      const withAddresses = await Promise.all(
        data.map(async (record) => {
          const address = await reverseGeocode(record.latitude, record.longitude);
          return { ...record, address };
        })
      );
      setRecords(withAddresses);
    }
    setLoading(false);
  };

  const deleteRecord = (record: UnchiRecord) => {
    Alert.alert("削除確認", "この記録を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          await supabase.from("records").delete().eq("id", record.id);
          loadMyRecords();
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return month + "/" + day + " " + hours + ":" + minutes;
  };

  const renderItem = ({ item }: { item: RecordWithAddress }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{formatDate(item.recorded_at)}</Text>
        <TouchableOpacity onPress={() => deleteRecord(item)}>
          <Text style={styles.cardDelete}>🗑</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.cardLocation}>
        {item.address || item.latitude.toFixed(4) + ", " + item.longitude.toFixed(4)}
      </Text>
      {item.comment && (
        <Text style={styles.cardComment}>{item.comment}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>戻る</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>📋 マイ記録</Text>
      </View>
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
  header: { paddingHorizontal: 20 },
  backBtn: { marginBottom: 12, paddingVertical: 8 },
  backText: { color: "#4A90D9", fontSize: 18, fontWeight: "600" },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  cardActions: { flexDirection: "row", gap: 12 },
  cardDelete: { fontSize: 16 },
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
