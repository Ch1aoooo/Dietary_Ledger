import type { ModelConfig, ModelProvider } from "@/types";

/**
 * 模型設定：preset + localStorage 管理。
 * 已移除 "offline" provider——食品分類與攝取推估現在完全交給 AI，
 * 這裡只剩「打哪個 AI 端點」的選擇。
 */

const LS_MODEL = "dl.model.v2";

export const PROVIDER_LABEL: Record<ModelProvider, string> = {
  local: "本機 / 內網模型",
  openai: "OpenAI API",
};

export interface ProviderPreset {
  provider: ModelProvider;
  label: string;
  description: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    provider: "local",
    label: "本機 / 內網 DeepSeek",
    description: "走公司內網 OpenAI 相容端點（不需 key）",
    baseUrl: "http://10.113.43.4:9000/v1",
    model: "dsv4-flash",
    apiKey: "",
  },
  {
    provider: "openai",
    label: "OpenAI API",
    description: "填你自己的 OpenAI API key",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKey: "",
  },
];

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: "local",
  baseUrl: "http://10.113.43.4:9000/v1",
  model: "dsv4-flash",
  apiKey: "",
};

function load(): ModelConfig {
  try {
    const raw = localStorage.getItem(LS_MODEL);
    if (!raw) return DEFAULT_MODEL_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ModelConfig>;
    return { ...DEFAULT_MODEL_CONFIG, ...parsed };
  } catch {
    return DEFAULT_MODEL_CONFIG;
  }
}

function save(cfg: ModelConfig) {
  try {
    localStorage.setItem(LS_MODEL, JSON.stringify(cfg));
  } catch {
    /* ignore quota */
  }
}

/**
 * 套用一個 provider preset。
 *
 * 切換到「不同」provider 時，用該 preset 的預設 baseUrl/model/apiKey 蓋掉
 * 目前的值——這是使用者選一個新引擎時合理預期的行為。但如果點的是「目前
 * 已經選著的」provider（例如只是想再確認一次選取狀態），就整個不動：
 * 原本這裡不管有沒有真的換 provider 都無條件覆寫，導致使用者在 Settings
 * 手動改過 baseUrl/model/apiKey 後，只是重新點一次同一張 preset 卡片，
 * 剛輸入的自訂值就被無聲蓋回 preset 的預設值。
 */
export function applyPreset(cfg: ModelConfig, preset: ProviderPreset): ModelConfig {
  if (cfg.provider === preset.provider) return cfg;
  return {
    ...cfg,
    provider: preset.provider,
    baseUrl: preset.baseUrl,
    model: preset.model,
    apiKey: preset.apiKey,
  };
}

export const modelConfigStore = { load, save };
