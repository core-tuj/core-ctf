/**
 * Tipe database CORE CTF.
 *
 * Ditulis manual agar cocok dengan migrasi di `supabase/migrations/`.
 * Begitu project sudah di-link, regenerate saja supaya selalu sinkron:
 *
 *   npx supabase gen types typescript --linked > src/types/database.ts
 */

export type UserRole = 'admin' | 'player';

export type ChallengeCategory =
  | 'web'
  | 'pwn'
  | 'crypto'
  | 'forensics'
  | 'reverse'
  | 'osint'
  | 'misc';

/** Hasil RPC submit_flag(). */
export type SubmitFlagResult =
  | {
      status: 'correct';
      points: number;
      penalty: number;
      first_blood: boolean;
      total_score: number;
    }
  | {
      status: 'wrong' | 'already_solved' | 'rate_limited' | 'not_found';
      message: string;
    };

/** Hasil RPC unlock_hint(). */
export type UnlockHintResult =
  | {
      status: 'unlocked' | 'already_unlocked';
      hint_id: string;
      hint_text: string;
      cost: number;
      charged: boolean;
    }
  | { status: 'not_found'; message: string };

/** Hasil RPC create_team() / join_team() / leave_team(). */
export type TeamActionResult =
  | { status: 'ok'; team_id?: string; name?: string; join_code?: string }
  | { status: 'error'; message: string };

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          role: UserRole;
          team_id: string | null;
          total_score: number;
          created_at: string;
          updated_at: string;
        };
        // Baris profiles dibuat trigger on_auth_user_created, bukan oleh client.
        Insert: {
          id: string;
          name: string;
          avatar_url?: string | null;
          role?: UserRole;
          team_id?: string | null;
          total_score?: number;
        };
        // GRANT hanya mengizinkan authenticated meng-update dua kolom ini.
        Update: {
          name?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          join_code: string;
          total_score: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          name: string;
          join_code: string;
          created_by?: string | null;
        };
        Update: { name?: string };
        Relationships: [];
      };
      challenges: {
        // flag_hash sengaja tidak ada: kolomnya tidak di-GRANT ke authenticated,
        // jadi `select('*')` pada tabel ini akan ditolak database.
        // Untuk membaca daftar challenge, pakai view `challenges_board`.
        Row: {
          id: string;
          title: string;
          category: ChallengeCategory;
          description: string;
          file_url: string | null;
          connection_info: string | null;
          author: string | null;
          static_score: number;
          flag_format: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          category?: ChallengeCategory;
          description?: string;
          file_url?: string | null;
          connection_info?: string | null;
          author?: string | null;
          static_score?: number;
          flag_format?: string;
          is_active?: boolean;
        };
        Update: {
          title?: string;
          category?: ChallengeCategory;
          description?: string;
          file_url?: string | null;
          connection_info?: string | null;
          author?: string | null;
          static_score?: number;
          flag_format?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      hints: {
        // hint_text bisa ditulis admin, tapi tidak bisa dibaca lewat PostgREST.
        // Gunakan RPC my_hints() / unlock_hint().
        Row: {
          id: string;
          challenge_id: string;
          cost: number;
          order_index: number;
          created_at: string;
        };
        Insert: {
          challenge_id: string;
          hint_text: string;
          cost?: number;
          order_index?: number;
        };
        Update: {
          challenge_id?: string;
          hint_text?: string;
          cost?: number;
          order_index?: number;
        };
        Relationships: [];
      };
      hint_unlocks: {
        Row: {
          id: string;
          hint_id: string;
          challenge_id: string;
          user_id: string;
          team_id: string | null;
          cost_at_unlock: number;
          created_at: string;
        };
        Insert: never; // hanya lewat RPC unlock_hint()
        Update: never;
        Relationships: [];
      };
      solves: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          team_id: string | null;
          points_awarded: number;
          is_first_blood: boolean;
          created_at: string;
        };
        Insert: never; // hanya lewat RPC submit_flag()
        Update: never;
        Relationships: [];
      };
      submissions: {
        Row: {
          id: number;
          challenge_id: string;
          user_id: string;
          team_id: string | null;
          submitted_flag: string;
          is_correct: boolean;
          created_at: string;
        };
        Insert: never; // dicatat otomatis oleh submit_flag()
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      challenges_board: {
        Row: {
          id: string;
          title: string;
          category: ChallengeCategory;
          description: string;
          file_url: string | null;
          connection_info: string | null;
          author: string | null;
          static_score: number;
          flag_format: string;
          is_active: boolean;
          created_at: string;
          /** Apakah flag sudah dipasang. Hash-nya sendiri tidak pernah keluar. */
          has_flag: boolean;
          solve_count: number;
          hint_count: number;
          solved_by_me: boolean;
          first_blood_by: string | null;
        };
        Relationships: [];
      };
      leaderboard_players: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          team_id: string | null;
          team_name: string | null;
          total_score: number;
          solve_count: number;
          first_blood_count: number;
          last_solve_at: string | null;
          rank: number;
        };
        Relationships: [];
      };
      leaderboard_teams: {
        Row: {
          id: string;
          name: string;
          total_score: number;
          member_count: number;
          solve_count: number;
          first_blood_count: number;
          last_solve_at: string | null;
          rank: number;
        };
        Relationships: [];
      };
      first_blood_feed: {
        Row: {
          solve_id: string;
          created_at: string;
          points_awarded: number;
          challenge_id: string;
          challenge_title: string;
          challenge_category: ChallengeCategory;
          user_id: string;
          user_name: string;
          avatar_url: string | null;
          team_id: string | null;
          team_name: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      submit_flag: {
        Args: { p_challenge_id: string; p_flag: string };
        Returns: SubmitFlagResult;
      };
      unlock_hint: {
        Args: { p_hint_id: string };
        Returns: UnlockHintResult;
      };
      my_hints: {
        Args: { p_challenge_id: string };
        Returns: {
          hint_id: string;
          order_index: number;
          cost: number;
          unlocked: boolean;
          hint_text: string | null;
        }[];
      };
      create_team: {
        Args: { p_name: string };
        Returns: TeamActionResult;
      };
      join_team: {
        Args: { p_join_code: string };
        Returns: TeamActionResult;
      };
      leave_team: {
        Args: Record<string, never>;
        Returns: TeamActionResult;
      };
      admin_set_flag: {
        Args: { p_challenge_id: string; p_flag: string };
        Returns: { status: 'ok' };
      };
      // Satu-satunya cara admin membaca hint_text (kolomnya tidak di-GRANT).
      admin_list_hints: {
        Args: { p_challenge_id: string };
        Returns: {
          id: string;
          hint_text: string;
          cost: number;
          order_index: number;
        }[];
      };
      is_admin: {
        Args: { p_uid?: string };
        Returns: boolean;
      };
      current_team_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
    Enums: {
      user_role: UserRole;
      challenge_category: ChallengeCategory;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type Challenge = Database['public']['Tables']['challenges']['Row'];
export type Solve = Database['public']['Tables']['solves']['Row'];
export type ChallengeBoardItem =
  Database['public']['Views']['challenges_board']['Row'];
export type LeaderboardPlayer =
  Database['public']['Views']['leaderboard_players']['Row'];
export type LeaderboardTeam =
  Database['public']['Views']['leaderboard_teams']['Row'];
export type FirstBloodEntry =
  Database['public']['Views']['first_blood_feed']['Row'];
