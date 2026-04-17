import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./src/lib/supabase";
import LoginScreen from "./src/screens/LoginScreen";
import MapScreen from "./src/screens/MapScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import FriendsScreen from "./src/screens/FriendsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import CustomDrawer from "./src/components/CustomDrawer";
import type { Profile } from "./src/types";

type Screen = "Map" | "History" | "Friends" | "Settings";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>("Map");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadProfile();
      loadPendingCount();
    }
  }, [session]);

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

  const loadPendingCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending");
    setPendingCount(count || 0);
  };

  if (loading) return null;
  if (!session) return <LoginScreen />;

  const renderScreen = () => {
    switch (currentScreen) {
      case "Map":
        return <MapScreen onOpenDrawer={() => setDrawerVisible(true)} />;
      case "History":
        return <HistoryScreen onBack={() => { setCurrentScreen("Map"); setDrawerVisible(true); }} />;
      case "Friends":
        return <FriendsScreen onBack={() => { setCurrentScreen("Map"); setDrawerVisible(true); }} />;
      case "Settings":
        return <SettingsScreen onBack={() => { setCurrentScreen("Map"); setDrawerVisible(true); }} onProfileUpdate={loadProfile} />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}
      <CustomDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onNavigate={setCurrentScreen}
        profile={profile}
        pendingCount={pendingCount}
      />
    </View>
  );
}
