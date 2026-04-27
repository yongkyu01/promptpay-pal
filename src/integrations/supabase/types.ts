export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          monthly_limit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          monthly_limit?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          monthly_limit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          expense_type: string
          golf_bet_amount: number | null
          golf_bet_result: string
          golf_caddy_fee: number | null
          golf_green_fee: number | null
          golf_lesson_fee: number | null
          golf_tip: number | null
          id: string
          payment_method: string
          recipient: string
          ref_no: string | null
          slip_id: string | null
          time: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          date: string
          expense_type?: string
          golf_bet_amount?: number | null
          golf_bet_result?: string
          golf_caddy_fee?: number | null
          golf_green_fee?: number | null
          golf_lesson_fee?: number | null
          golf_tip?: number | null
          id?: string
          payment_method?: string
          recipient: string
          ref_no?: string | null
          slip_id?: string | null
          time?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          expense_type?: string
          golf_bet_amount?: number | null
          golf_bet_result?: string
          golf_caddy_fee?: number | null
          golf_green_fee?: number | null
          golf_lesson_fee?: number | null
          golf_tip?: number | null
          id?: string
          payment_method?: string
          recipient?: string
          ref_no?: string | null
          slip_id?: string | null
          time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_slip_id_fkey"
            columns: ["slip_id"]
            isOneToOne: false
            referencedRelation: "slips"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          avatar_color: string
          created_at: string
          email: string | null
          id: string
          linked_user_id: string | null
          name: string
          user_id: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          email?: string | null
          id?: string
          linked_user_id?: string | null
          name: string
          user_id: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          email?: string | null
          id?: string
          linked_user_id?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string
          board: string
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          board: string
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          board?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          promptpay_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          promptpay_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          promptpay_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      slips: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_processed: boolean
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_processed?: boolean
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_processed?: boolean
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      split_items: {
        Row: {
          assigned_member_ids: Json
          created_at: string
          id: string
          name: string
          position: number
          quantity: number
          split_id: string
          total: number
          unit_price: number
          user_id: string
        }
        Insert: {
          assigned_member_ids?: Json
          created_at?: string
          id?: string
          name: string
          position?: number
          quantity?: number
          split_id: string
          total?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          assigned_member_ids?: Json
          created_at?: string
          id?: string
          name?: string
          position?: number
          quantity?: number
          split_id?: string
          total?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_items_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "splits"
            referencedColumns: ["id"]
          },
        ]
      }
      split_members: {
        Row: {
          amount_due: number
          avatar_color: string
          created_at: string
          friend_id: string | null
          id: string
          is_owner: boolean
          is_paid: boolean
          linked_user_id: string | null
          name: string
          split_id: string
          user_id: string
        }
        Insert: {
          amount_due?: number
          avatar_color?: string
          created_at?: string
          friend_id?: string | null
          id?: string
          is_owner?: boolean
          is_paid?: boolean
          linked_user_id?: string | null
          name: string
          split_id: string
          user_id: string
        }
        Update: {
          amount_due?: number
          avatar_color?: string
          created_at?: string
          friend_id?: string | null
          id?: string
          is_owner?: boolean
          is_paid?: boolean
          linked_user_id?: string | null
          name?: string
          split_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_members_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "splits"
            referencedColumns: ["id"]
          },
        ]
      }
      splits: {
        Row: {
          created_at: string
          currency: string
          id: string
          note: string | null
          place: string | null
          receipt_image_url: string | null
          service_charge: number
          status: string
          subtotal: number
          title: string
          total: number
          updated_at: string
          user_id: string
          vat: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          place?: string | null
          receipt_image_url?: string | null
          service_charge?: number
          status?: string
          subtotal?: number
          title?: string
          total?: number
          updated_at?: string
          user_id: string
          vat?: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          place?: string | null
          receipt_image_url?: string | null
          service_charge?: number
          status?: string
          subtotal?: number
          title?: string
          total?: number
          updated_at?: string
          user_id?: string
          vat?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
