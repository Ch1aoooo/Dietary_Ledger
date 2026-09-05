# 食溯 · Dietary Ledger

電子發票載具資料 → 個人化飲食分析 → 醫療參考摘要（黑客松 Demo）

> **核心引擎：Personalized Consumption Attribution Engine**
> 把「購買數據」翻譯成「推估本人實際食用量」，每一筆都有
> `estimatedSelfConsumed` / `confidence` / `reasoning` / `source`
> （source：`observed` / `inferred` / `user_confirmed`）。
> 主張 **購買量 ≠ 實際攝取量**。

## 快速開始

```bash
npm install
npm run dev        # http://localhost:5173  （首次會先進入 Onboarding）
```

也可直接產出靜態檔：

```bash
npm run build      # 產出 dist/
npm run preview    # 本機預覽產出
```

## 技術棧

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui（Radix primitives，手動內建於 `src/components/ui`）
- Recharts
- React Router

## 頁面

| 路由 | 頁面 |
| --- | --- |
| `/` | Overview（Monthly Dietary Dashboard） |
| `/upload` | Upload Data（Drag & Drop ＋ 分析中動畫 ） |
| `/profile` | Dietary Profile（含編輯） |
| `/transactions` | Transactions（表格 ＋ 可解釋 side panel） |
| `/review` | Review（Monthly Review Inbox） |
| `/clinical` | Clinical Summary（醫療文件風格） |
| `/settings` | Settings |
| `/onboarding` | 首次使用的卡片式 Profile 問卷 |

## 真實資料支援

`src/data/sampleInvoice.csv` 內含一份**財政部電子發票整合平台的實際匯出格式**（
含 BOM、14 欄位、折扣/出清負數列、非食品如汽油/日用品/運動用品）。
`src/utils/einvoiceParser.ts` 已完整解析該格式，可直接上傳你自行下載的 CSV。

Demo 內建一份**加料範例**，用來明確展示三種行為模式（食品分類與攝取量推估
完全交給 AI，實際數字會依模型回應略有不同，不是寫死的固定值）：

- 可口可樂 6 入 → 可久放的庫存型飲料，推估分散在數天內由本人喝完
- 便當 × 4 → 超出個人一餐典型份量，信心不足 → 進 Review
- 波霸紅茶拿鐵 × 3、巧克力蛋糕 × 3 → 大量易腐食品 → 進 Review

上傳自訂檔案時，`/upload` 會以同一條 pipeline 重新分析並覆寫現有資料（存於
localStorage）。`Settings → 重設 Demo 資料` 可還原。

## 後端：薄模型代理（已實作）

前端負責 CSV 解析與渲染；`backend/` 是一個**薄 FastAPI 代理**，負責把
「選定模型的請求」轉發到內網 DeepSeek 或 OpenAI——解決瀏覽器跨域與 API key 外洩。

食品分類與攝取量推估**完全交給 AI**，沒有離線規則引擎當備援：呼叫失敗、
逾時、或模型漏回某幾筆時，那幾筆會被標記「分析失敗」並誠實顯示在畫面上
（Dashboard 頂部的提示、Transactions 表格、detail panel 都看得到），可以在
Settings 按「重試分析」。這代表本機/內網模型必須連得上，demo 才跑得動。

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
.venv/Scripts/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# 另開一個終端：npm run dev  (vite 已把 /api proxy 到 :8000)
```

第一頁 Onboarding 即可選引擎：內網 DeepSeek / OpenAI。

## 目錄

```
src/
  components/       Sidebar, Header, 圖表, TransactionTable, ReviewCard, detail panel…
    ui/             shadcn primitives
  pages/            各路由頁面
  data/             sampleInvoice.csv（真實格式）
  lib/              store(localStorage), analytics(彙整/推論), colors, utils
  services/         api.ts, llmFoodUnderstanding.ts
  types/            index.ts（型別）
  utils/            einvoiceParser, processing（CSV→Transaction 結構整形）, modelPipeline（AI 分類/推估）
```

## 注意

此產品**不提供醫療診斷**。所有飲食資訊皆為補充性參考，Clinical Summary 會固定
顯示資料限制聲明。
