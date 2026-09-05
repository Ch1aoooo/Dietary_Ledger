# 食溯 · 模型代理 (Model Proxy)

一個**薄 FastAPI 代理**：把「選擇模型 + 呼叫模型」從瀏覽器搬到伺服器端。

為什麼需要它：
- **CORS**：本地/內網模型（例如 `http://10.113.43.4:9000`）瀏覽器直接打會被跨域擋掉；
  這裡用 `httpx` 在伺服器端呼叫，完全繞過瀏覽器限制。
- **API key 不進瀏覽器**（OpenAI 情境）。
- 提供乾淨的「可選擇模型」demo 敘事（第一頁 Onboarding 即可選：內網 DeepSeek / OpenAI）。

本代理**只做模型代理**，不含任何業務邏輯（CSV 解析、歸因、localStorage 都在前端）。

## 啟動

```bash
cd backend
python -m venv .venv                 # 一次即可
# Windows:  .venv\Scripts\pip install -r requirements.txt
# macOS/Linux: .venv/bin/pip install -r requirements.txt
.venv/Scripts/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

前端開發伺服器（`npm run dev`，port 5173）已設定 proxy：`/api → http://127.0.0.1:8000`，
所以前端直接呼叫 `/api/...` 即可，不需額外設定。

## 端點

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| GET | `/api/health` | 存活檢查 |
| POST | `/api/understand/batch` | 批次商品理解：一次請求含多列，模型回一整包 JSON（以 `idx` 對回原列）。 |
| POST | `/api/ask/load` | 把前端的交易資料整批載入 SQLite（`transactions` 表），供 AI 顧問查詢。 |
| POST | `/api/ask/chat` | **AI 飲食顧問（Text-to-SQL + 正式 function-calling）**：註冊一個 `query_diet_db` 工具，模型以結構化 `tool_calls` 產生 SQL，後端唯讀執行後把結果回傳給模型，收斂成自然人話回答。已開啟模型思考模式（`chat_template_kwargs.thinking`）提升準確度。 |

SQLite 資料庫檔案位於 `backend/data/dietary.db`（自動建立）。所有 SQL 只允許 `SELECT`/`WITH`，其餘寫入會被拒絕。

## 設定

預設「內網 DeepSeek」：`http://10.113.43.4:9000/v1`、模型 `dsv4-flash`、不需 key。
也可在頁面 Settings 改成 OpenAI API（填 key）或其他 OpenAI 相容端點。
