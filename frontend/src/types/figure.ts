export type Figure = {
  id: string;
  user_id: string;
  mint_number: number;
  display_number: string;
  rarity: string;
  status: string;
  selected_color: string | null;
  selected_vibe: string | null;
  selected_accessory: string | null;
  selected_background: string | null;
  source_photo_type: string | null;
  source_photo_url: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  share_image_url?: string | null;
  prompt?: string | null;
  foil_rarity?: string | null;
  foil_image_url?: string | null;
  foil_prompt?: string | null;
  description?: string | null;
  traits_json?: Record<string, unknown> | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  next_step?: FigureNextStep;
};

export type FigureNextStep =
  | "welcome"
  | "photo"
  | "presets"
  | "ready_to_generate"
  | "generating"
  | "completed"
  | "failed";

export type PresetOption = {
  value: string;
  label: string;
};

export type FigurePresets = {
  colors: PresetOption[];
  vibes: PresetOption[];
  accessories: PresetOption[];
  backgrounds: PresetOption[];
  rarities: PresetOption[];
  source_photo_types: PresetOption[];
};

export type SourcePhotoType = "telegram_profile" | "uploaded" | "none";

export type FigurePresetsUpdate = {
  selected_color?: string | null;
  selected_vibe?: string | null;
  selected_accessory?: string | null;
  selected_background?: string | null;
  rarity?: string;
  source_photo_type?: SourcePhotoType;
  is_public?: boolean;
};

export type GenerationJob = {
  id: string;
  figure_id: string;
  user_id: string;
  status: string;
  model: string | null;
  prompt: string | null;
  result_image_url: string | null;
  foil_prompt?: string | null;
  foil_result_image_url?: string | null;
  attempt: number;
  max_attempts: number;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type FigureGenerationResponse = {
  job: GenerationJob;
  figure: Figure;
  foil_figure?: Figure | null;
};
