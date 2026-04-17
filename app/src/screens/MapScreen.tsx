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
  const mapRef = useRef<MapView>(null);

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
    if (data) setProfile(data);
  };

  const loadRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("records")
      .select("*, profiles(*)")
      .order("recorded_at", { ascending: false });
    if (data) setRecords(data as RecordWithProfile[]);
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

        {records.map((record) => (
          <Marker
            key={record.id}
            coordinate={{
              latitude: record.latitude,
              longitude: record.longitude,
            }}
          >
            <Text style={{ fontSize: 42 }}>💩</Text>
            <Callout onPress={() => {
              if (record.profiles) {
                setSelectedProfile(record.profiles);
                setProfileModalVisible(true);
              }
            }}>
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
                <Text style={styles.calloutProfile}>プロフィールを見る</Text>
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
