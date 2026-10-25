
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "allergens": {
                  Row: {
                    "id": string,"label": string,"same_as": string | null,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"label": string,"same_as"?: string | null,"sort": number
                  }
                  Update: {
                    "id"?: string,"label"?: string,"same_as"?: string | null,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"ballots": {
                  Row: {
                    "device_id": string,"first_id": string | null,"second_id": string | null,"third_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device_id": string,"first_id"?: string | null,"second_id"?: string | null,"third_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "device_id"?: string,"first_id"?: string | null,"second_id"?: string | null,"third_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ballots_first_id_fkey"
      columns: ["first_id"]
isOneToOne: false
      referencedRelation: "chilis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ballots_second_id_fkey"
      columns: ["second_id"]
isOneToOne: false
      referencedRelation: "chilis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ballots_third_id_fkey"
      columns: ["third_id"]
isOneToOne: false
      referencedRelation: "chilis"
      referencedColumns: ["id"]
    }
                  ]
                },"chili_allergens": {
                  Row: {
                    "allergen_id": string,"chili_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allergen_id": string,"chili_id": string
                  }
                  Update: {
                    "allergen_id"?: string,"chili_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chili_allergens_allergen_id_fkey"
      columns: ["allergen_id"]
isOneToOne: false
      referencedRelation: "allergens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chili_allergens_chili_id_fkey"
      columns: ["chili_id"]
isOneToOne: false
      referencedRelation: "chilis"
      referencedColumns: ["id"]
    }
                  ]
                },"chili_tags": {
                  Row: {
                    "chili_id": string,"created_at": string,"device_id": string,"tag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chili_id": string,"created_at"?: string,"device_id": string,"tag_id": string
                  }
                  Update: {
                    "chili_id"?: string,"created_at"?: string,"device_id"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chili_tags_chili_id_fkey"
      columns: ["chili_id"]
isOneToOne: false
      referencedRelation: "chilis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chili_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"chilis": {
                  Row: {
                    "cook": string | null,"created_at": string,"description": string | null,"id": string,"name": string,"owner_device_id": string,"pot_number": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cook"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"owner_device_id": string,"pot_number"?: number,"updated_at"?: string
                  }
                  Update: {
                    "cook"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"owner_device_id"?: string,"pot_number"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"event": {
                  Row: {
                    "entries_open": boolean,"id": number,"name": string,"reveal_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "entries_open"?: boolean,"id": number,"name": string,"reveal_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "entries_open"?: boolean,"id"?: number,"name"?: string,"reveal_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tags": {
                  Row: {
                    "id": string,"label": string,"same_as": string | null,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"label": string,"same_as"?: string | null,"sort": number
                  }
                  Update: {
                    "id"?: string,"label"?: string,"same_as"?: string | null,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "ballot_count":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"create_chili":
{ Args: { "p_allergens": (string)[],"p_as_admin"?: boolean,"p_cook": string,"p_description": string,"p_device_id": string,"p_name": string }; Returns: number
                           },
"entries_ok":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"get_chilis":
{ Args: Record<PropertyKey, never>; Returns: {
              "allergen_ids": (string)[],"cook": string,"description": string,"id": string,"name": string,"pot_number": number
            }[]
                           },
"get_event":
{ Args: Record<PropertyKey, never>; Returns: {
              "entries_open": boolean,"name": string,"reveal_at": string,"server_now": string,"status": string
            }[]
                           },
"get_results":
{ Args: Record<PropertyKey, never>; Returns: {
              "chili_id": string,"cook": string,"firsts": number,"name": string,"points": number,"pot_number": number,"rank": number,"seconds": number,"thirds": number
            }[]
                           },
"get_tag_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "chili_id": string,"count": number,"tag_id": string
            }[]
                           },
"set_tag":
{ Args: { "p_chili_id": string,"p_device_id": string,"p_on": boolean,"p_tag_id": string }; Returns: undefined
                           },
"submit_ballot":
{ Args: { "p_device_id": string,"p_first": string,"p_second": string,"p_third": string }; Returns: undefined
                           },
"voting_open":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
