import type {
  ClinicalSummary,
  DietaryAnalysis,
  FoodProperties,
  Inference,
  ReviewItem,
  Transaction,
  UserProfile,
} from "@/types";
import {
  buildAnalysis,
  buildClinicalSummary,
  computeKpis,
  applyReviews,
} from "@/lib/analytics";

/**
 * API 服務層（目前為 mock，回傳 Promise 模擬非同步）。
 *
 * ── 之後串 FastAPI 的替換點 ──
 * 把下列每個方法改成 fetch(API_BASE + path) 即可，簽名都保持不變，
 * 頁面與元件不需要更動。
 *
 *    POST /api/upload
 *    GET  /api/transactions
 *    GET  /api/profile
 *    GET  /api/dietary-analysis
 *    GET  /api/review
 *    POST /api/review/{id}
 *    GET  /api/clinical-summary
 */

const API_BASE = "/api";
const delay = (ms = 320) => new Promise((r) => setTimeout(r, ms));

export interface ApiService {
  getTransactions(period: string, profile: UserProfile): Promise<Transaction[]>;
  getProfile(): Promise<UserProfile>;
  getAnalysis(
    transactions: Transaction[],
    reviews: ReviewItem[],
    period: string
  ): Promise<DietaryAnalysis>;
  getReview(transactions: Transaction[]): Promise<ReviewItem[]>;
  confirmReview(
    reviews: ReviewItem[],
    id: string,
    value: number
  ): Promise<ReviewItem[]>;
  getClinicalSummary(
    transactions: Transaction[],
    reviews: ReviewItem[],
    period: string,
    patient: string
  ): Promise<ClinicalSummary>;
}

export const api: ApiService = {
  async getTransactions(period, profile) {
    await delay();
    return [];
  },
  async getProfile() {
    await delay();
    return {} as UserProfile;
  },
  async getAnalysis(transactions, reviews, period) {
    await delay(200);
    return buildAnalysis(transactions, reviews, period);
  },
  async getReview(transactions) {
    await delay(200);
    return [];
  },
  async confirmReview(reviews, id, value) {
    await delay(200);
    return reviews.map((r) => (r.id === id ? { ...r, confirmed: value } : r));
  },
  async getClinicalSummary(transactions, reviews, period, patient) {
    await delay(200);
    return buildClinicalSummary(transactions, reviews, period, patient);
  },
};

/** 上傳：模擬 POST /api/upload（此處直接回傳解析結果） */
export function mockUpload(text: string): Promise<{
  rawCount: number;
  sample: { itemName: string; qty: number }[];
}> {
  // 實際解析在 store/processing 完成；此處僅模擬網路往返
  return new Promise((r) =>
    setTimeout(
      () =>
        r({
          rawCount: text.split("\n").length - 1,
          sample: [],
        }),
      300
    )
  );
}

export { applyReviews, computeKpis };

export type { FoodProperties, Inference };
