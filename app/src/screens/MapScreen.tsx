import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";
import RecordDrawer from "../components/RecordDrawer";
import ProfileModal from "../components/ProfileModal";
import type { Record as UnchiRecord, Profile } from "../types";

type RecordWithProfile = UnchiRecord & { profiles: Profile };

type Props = {
  onOpenDrawer?: () => void;
};

export default function MapScreen({ onOpenDrawer }: Props) {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [records, setRecords] = useState<RecordWithProfile[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "me" | "friends" | "close">("all");
  const [closeFriendIds, setCloseFriendIds] = useState<string[]>([]);
  const [myUserId, setMyUserId] = useState<string>("");
  const mapRef = useRef<MapView>(null);
  const lastMarkerTap = useRef<number>(0);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("位置情報の許可が必要です");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
    loadProfile();
    loadRecords();
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
      setMyUserId(user.id);
    }
    // 親しいフレンドIDを取得
    const { data: closeFs } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .eq("is_close", true)
      .or("requester_id.eq." + user.id + ",addressee_id.eq." + user.id);
    if (closeFs) {
      setCloseFriendIds(closeFs.map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      ));
    }
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const dedupeRecords = (recs: RecordWithProfile[]): RecordWithProfile[] => {
    const result: RecordWithProfile[] = [];
    for (const rec of recs) {
      const isDupe = result.some(
        (r) => r.user_id === rec.user_id &&
          getDistance(r.latitude, r.longitude, rec.latitude, rec.longitude) < 10
      );
      if (!isDupe) result.push(rec);
    }
    return result;
  };

  const loadRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("records")
      .select("*, profiles(*)")
      .order("recorded_at", { ascending: false });
    if (data) setRecords(dedupeRecords(data as RecordWithProfile[]));
    if (error) console.error("records fetch error:", error);
    setLoading(false);
  };

  const handleRecordComplete = () => {
    setDrawerVisible(false);
    loadRecords();
    loadProfile();
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B6914" />
        <Text style={styles.loadingText}>位置情報を取得中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* 現在地マーカー（極小） */}
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.currentLocationDot} />
        </Marker>

        {records.filter((record) => {
          if (filter === "me") return record.user_id === myUserId;
          if (filter === "friends") return record.user_id !== myUserId;
          if (filter === "close") return closeFriendIds.includes(record.user_id);
          return true;
        }).map((record) => (
          <Marker
            key={record.id}
            coordinate={{
              latitude: record.latitude,
              longitude: record.longitude,
            }}
            onPress={() => {
              lastMarkerTap.current = Date.now();
            }}
            onCalloutPress={() => {
              const elapsed = Date.now() - lastMarkerTap.current;
              if (elapsed > 500 && record.profiles) {
                setSelectedProfile(record.profiles);
                setProfileModalVisible(true);
              }
            }}
          >
            <Text style={{ fontSize: 42 }}>💩</Text>
            <Callout tooltip={false}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>
                  {record.profiles?.nickname || "???"}
                </Text>
                <Text style={styles.calloutTime}>
                  {(() => {
                    const d = new Date(record.recorded_at);
                    return (d.getMonth()+1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
                  })()}
                </Text>
                {record.comment && (
                  <Text style={styles.calloutComment}>{record.comment}</Text>
                )}
                <Text style={styles.calloutProfile}>タップでプロフィール</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Hamburger */}
      <TouchableOpacity style={styles.hamburger} onPress={onOpenDrawer}>
        <View style={styles.hamburgerLine} />
        <View style={styles.hamburgerLine} />
        <View style={styles.hamburgerLine} />
      </TouchableOpacity>

      {/* Filter */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, filter === "all" ? styles.filterActive : null]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.filterText, filter === "all" ? styles.filterTextActive : null]}>全部</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === "me" ? styles.filterActive : null]}
          onPress={() => setFilter("me")}
        >
          <Text style={[styles.filterText, filter === "me" ? styles.filterTextActive : null]}>自分</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === "friends" ? styles.filterActive : null]}
          onPress={() => setFilter("friends")}
        >
          <Text style={[styles.filterText, filter === "friends" ? styles.filterTextActive : null]}>フレンド</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === "close" ? styles.filterActive : null]}
          onPress={() => setFilter("close")}
        >
          <Text style={[styles.filterText, filter === "close" ? styles.filterTextActive : null]}>★親しい</Text>
        </TouchableOpacity>
      </View>

      {/* Refresh */}
      <TouchableOpacity style={styles.refreshBtn} onPress={loadRecords}>
        <Text style={styles.refreshText}>🔄</Text>
      </TouchableOpacity>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setDrawerVisible(true)}
      >
        <Text style={styles.fabText}>💩</Text>
      </TouchableOpacity>

      {/* Profile Modal */}
      <ProfileModal
        profile={selectedProfile}
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />

      {/* Record Drawer */}
      {drawerVisible && location && (
        <RecordDrawer
          location={location}
          profile={profile}
          onClose={() => setDrawerVisible(false)}
          onComplete={handleRecordComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0f0f1a",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#888", marginTop: 12, fontSize: 14 },
  fab: {
    position: "absolute",
    bottom: 40,
    right: 20,
    width: 64,
    height: 64,
    backgroundColor: "#8B6914",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: { fontSize: 28 },
  hamburger: {
    position: "absolute",
    top: 60,
    left: 16,
    width: 44,
    height: 44,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: "#fff",
    borderRadius: 1,
    marginVertical: 2,
  },
  callout: { padding: 10, width: 220 },
  calloutName: { fontWeight: "700", fontSize: 14, color: "#333" },
  calloutTime: { fontSize: 11, color: "#888", marginTop: 2 },
  calloutComment: { fontSize: 12, color: "#555", marginTop: 4 },
  calloutProfile: { fontSize: 12, color: "#4A90D9", marginTop: 6 },
  filterBar: {
    position: "absolute",
    top: 110,
    left: 16,
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  filterActive: {
    backgroundColor: "rgba(74,144,217,0.3)",
    borderColor: "#4A90D9",
  },
  filterText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: "#4A90D9" },
  refreshBtn: {
    position: "absolute",
    top: 60,
    right: 16,
    width: 44,
    height: 44,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  refreshText: { fontSize: 20 },
  currentLocationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4A90D9",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  calloutPrivate: { fontSize: 11, color: "#E91E63", marginTop: 4 },
});
