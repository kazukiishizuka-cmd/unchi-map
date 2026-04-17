export type Profile = {
  id: string;
  user_id: string;
  nickname: string;
  pin_color: string;
  streak_count: number;
  last_record_date: string | null;
  is_public: boolean;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type Record = {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  comment: string | null;
  visibility: "public" | "close_only" | "private";
  recorded_at: string;
  created_at: string;
  profiles?: Profile;
};

export type Partnership = {
  id: string;
  requester_id: string;
  partner_id: string;
  status: "pending" | "accepted" | "rejected";
  streak_count: number;
  last_both_date: string | null;
  created_at: string;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  is_close: boolean;
  created_at: string;
};
