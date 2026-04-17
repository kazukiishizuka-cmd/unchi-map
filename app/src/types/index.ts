export type Profile = {
  id: string;
  user_id: string;
  nickname: string;
  pin_color: string;
  streak_count: number;
  last_record_date: string | null;
  created_at: string;
};

export type Record = {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  comment: string | null;
  is_public: boolean;
  recorded_at: string;
  created_at: string;
  profiles?: Profile;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};
