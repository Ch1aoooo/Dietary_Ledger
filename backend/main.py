"""
食溯 · Dietary Ledger — 薄模型代理 (model proxy)

角色：把「選擇模型 + 呼叫模型」從瀏覽器搬到伺服器端。
解決兩個純前端做不到的事：
  1. CORS：本地/內網模型 (ex: http://10.113.43.4:9000) 瀏覽器打不過去，
     這裡用 httpx 在伺服器端呼叫，完全繞過瀏覽器跨域限制。
  2. API key 不進模型供應商以外的瀏覽器請求（OpenAI / Google 情境）。

Design note：本代理「只做模型代理」，不做任何業務邏輯。
CSV 解析、歸因引擎、localStorage 全都留在前端。檔案刻意保持小而薄。

啟動：
  cd backend
  pip install -r requirements.txt
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import json
import os
import re
import sqlite3

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="食溯 Dietary Ledger · Model Proxy", version="0.1.0")

# 原本是 allow_origins=["*"]：任何網域的網頁都能對這支 API 發請求並讀到
# 回應。這支代理會把使用者真實的飲食/購買資料寫進 SQLite、也能被拿來問
# text-to-SQL，`*` 等於任何使用者剛好開著的其他分頁/惡意頁面都能用
# fetch() 打這支 API 並讀走回傳的個人資料（CORS misconfig → CSRF 式的
# 資料外洩），不只是「開發時瀏覽器擋跨域」那種單純不方便而已。改成只
# 允許本機前端的 origin。
DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEV_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_DEFAULT_BASE = "https://api.openai.com/v1"
CHUNK_SIZE = 20  # 每請求最多幾列商品（避免單次 token 過大）
TIMEOUT_SEC = 120


# --------------------------------------------------------------------------- #
#  Request / Response 型別
# --------------------------------------------------------------------------- #
class BatchItem(BaseModel):
    itemName: str
    qty: float
    amount: float


class BatchRequest(BaseModel):
    items: list[BatchItem]
    profile: dict
    modelConfig: dict  # {provider, baseUrl?, model, apiKey?}
    lang: str = "zh"  # "zh" | "en" — 只影響模型產生的自由文字（reasoning）語言


# --------------------------------------------------------------------------- #
#  Prompt
# --------------------------------------------------------------------------- #
SYSTEM_PROMPT = (
    "你是「食溯」的個人化飲食歸因引擎。核心主張：購買量 ≠ 實際攝取量。\n"
    "你會拿到一份電子發票的商品清單，以及使用者個人的飲食 Profile。\n"
    "請對『食品』逐項推估『本人實際食用量』，並給出可解釋的中文 reasoning。\n"
    "非食品、折讓/出清/服務費等調整列，請標 isFood=false，不需推估食用量。\n"
    "只輸出一個 JSON 陣列，不要輸出其他文字、不要用 Markdown code block。"
    "每個元素格式：\n"
    '{"idx": <整數，逐字抄自商品清單的編號>,\n'
    ' "itemName": "<品名，逐字抄自清單「品名:"…"」裡的原文，不要加數量或金額>",\n'
    ' "isFood": true|false,\n'
    ' "category": "Prepared meals|Coffee|Sugary beverages|Bakery|Desserts|Dairy|Protein|Snacks|Non-food",\n'
    ' "stockable": true|false,\n'
    ' "shelfLife": "very short|short|medium|long",\n'
    ' "typicalUnit": "<食用單位，ex: 罐/份/杯>",\n'
    ' "estimatedCalories": <number，這筆「本人實際食用量」（不是購買量）'
    "對應的粗估熱量，單位大卡，非食品請填 0>,\n"
    ' "isRefinedCarb": true|false，是否含精緻澱粉'
    "（白飯、白麵包、白麵條、含糖甜點、手搖飲的糖等精製碳水，非食品請填 false）,\n"
    ' "isWholeFood": true|false，是否為原型食物'
    "（未經高度加工，如新鮮蔬果、原型肉類/海鮮、糙米/全穀，非食品請填 false）,\n"
    ' "giLevel": "high|medium|low"，這個食物整體的升糖指數等級（非食品請填 "low"）,\n'
    ' "isFried": true|false，是否為油炸類（非食品請填 false）,\n'
    ' "estimatedSelfConsumed": <number>,\n'
    ' "distributionDays": <number|null>,\n'
    ' "confidence": <0-100>,\n'
    ' "source": "observed|inferred|user_confirmed",\n'
    ' "needsReview": true|false,\n'
    ' "reasoning": ["<1-2句中文推論>", "..."]}\n'
    "規則：咖啡/手搖/奶茶/鮮奶屬飲料，依 profile 的 drinking 習慣推估；"
    "可久放飲料（罐裝可樂等）常為囤貨自用可分散多天；便當/新鮮餐點不可久放，"
    "超出個人一餐典型份量的部分可能是替他人買或共享；"
    "購買數量若是計件單位（個/顆/粒/片等，例如鍋貼、水餃、餛飩、貢丸、"
    "雞塊、壽司、小籠包這類一份就包含多個的食物），不要把購買的『個數』"
    "直接當成『幾份』或『幾餐』——這類食物一份/一餐通常包含多個"
    "（例如鍋貼一份約 8-10 個、水餃一份約 10-15 顆），請先判斷這批購買量"
    "大約相當於幾份典型餐點份量，estimatedSelfConsumed 請以換算後、對使用者"
    "有意義的份量為準（而不是逐個計算），typicalUnit 也請填能反映這個份量"
    "概念的單位（例如「份」），不要直接照抄「個」，否則後續跨品項加總"
    "（例如統計『本人實際食用份數』）會被少數計件類食物的高個數嚴重灌水；"
    "profile 的身高體重可作為推估食用量/份量大小的參考依據之一"
    "（例如體型較大者一餐實際食用量可能略高於平均，但仍須以商品本身的"
    "typicalUnit、購買數量等結構化資訊為主，身高體重只是輔助微調，不是唯一依據）；"
    "estimatedCalories/isRefinedCarb/isWholeFood/giLevel/isFried 這五項是"
    "針對食物本身營養屬性的判斷，依品名、店家、常見作法（例如便當通常搭配"
    "白飯、手搖飲通常含糖、鹹酥雞/炸雞/天婦羅屬油炸）合理推估即可，"
    "不需要使用者額外提供成分資訊。"
)

# 英文介面：分類/enum 欄位維持不變，只要求模型把 reasoning 這串自由文字
# 改用英文寫。放在 system prompt 最後，覆蓋前面「1-2句中文推論」的字樣。
REASONING_LANG_EN = (
    "\n\nOUTPUT LANGUAGE: The user's interface is in English. Write every "
    'string inside the "reasoning" array in natural, concise English. '
    "All other fields keep their fixed enum / numeric values unchanged."
)

# llama.cpp 支援 OpenAI-compatible 的 schema-constrained JSON。Ornith 在
# 關閉 thinking 後速度已足夠，但對較長的商品清單仍偶爾會漏逗號或多輸出
# Markdown fence；把整個陣列交給 grammar 約束，讓 extract_json_array 永遠
# 收到可解析的資料。
ANALYSIS_RESPONSE_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "idx": {"type": "integer"},
            "itemName": {"type": "string"},
            "isFood": {"type": "boolean"},
            "category": {"type": "string"},
            "stockable": {"type": "boolean"},
            "shelfLife": {"type": "string"},
            "typicalUnit": {"type": "string"},
            "estimatedCalories": {"type": "number"},
            "isRefinedCarb": {"type": "boolean"},
            "isWholeFood": {"type": "boolean"},
            "giLevel": {"type": "string"},
            "isFried": {"type": "boolean"},
            "estimatedSelfConsumed": {"type": "number"},
            "distributionDays": {"type": ["number", "null"]},
            "confidence": {"type": "number"},
            "source": {"type": "string"},
            "needsReview": {"type": "boolean"},
            "reasoning": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "idx",
            "itemName",
            "isFood",
            "category",
            "stockable",
            "shelfLife",
            "typicalUnit",
            "estimatedCalories",
            "isRefinedCarb",
            "isWholeFood",
            "giLevel",
            "isFried",
            "estimatedSelfConsumed",
            "distributionDays",
            "confidence",
            "source",
            "needsReview",
            "reasoning",
        ],
        "additionalProperties": False,
    },
}


def build_user_prompt(profile: dict, items: list[dict]) -> str:
    profile_lines = [
        f"- 身高: {profile.get('heightCm', 170)} 公分",
        f"- 體重: {profile.get('weightKg', 65)} 公斤",
        f"- 家庭人數: {profile.get('householdSize', 1)}",
        f"- 是否常替他人購買: {profile.get('buysForOthers', 'occasionally')}",
        f"- 一餐典型份量: {profile.get('typicalMealServings', 1)}",
        f"- 一次飲料典型杯數: {profile.get('typicalDrinkServings', 1)}",
    ]
    bulk = profile.get("bulkPurchasing") or {}
    for key, label in [
        ("beverage", "飲料"),
        ("frozen", "冷凍"),
        ("snacks", "零食"),
        ("bakery", "麵包"),
        ("readyMeal", "即食餐點"),
    ]:
        profile_lines.append(f"- 常一次買多天份[{label}]: {bulk.get(key, 'rarely')}")

    # 重要：這裡一定要印 it["idx"]（understand_batch 組 indexed_items 時
    # 塞進去的「全域」編號），不能用 enumerate() 產生的區塊內編號。
    # SYSTEM_PROMPT 要求模型「逐字抄」括號裡的號碼回填 idx，如果這裡印的
    # 是每個 chunk 各自從 1 開始數的區塊內編號，模型抄回來的 idx 在
    # understand_batch 合併結果時就會對不上原本送出的全域 idx——單一
    # chunk 時第 0 筆永遠對不到（少了一個 off-by-one），超過一個 chunk
    # 時後面每個 chunk 的編號還會從 1 重來，直接覆寫前一個 chunk 的結果。
    items_lines = [
        f'[{it["idx"]}] 品名:"{it["itemName"]}"  數量:{it["qty"]}  金額:{it["amount"]}'
        for it in items
    ]

    return (
        "使用者飲食 Profile：\n"
        + "\n".join(profile_lines)
        + "\n\n本筆發票商品清單（每列請保留其編號 idx 與原品名）：\n"
        + "\n".join(items_lines)
        + "\n\n請對清單中每一列（包含非食品與調整列）都輸出一個物件，"
        "並把該列的編號逐字寫進 idx、把原品名逐字寫進 itemName，"
        "回傳完整的 JSON 陣列（陣列順序與清單一致）。"
    )


# --------------------------------------------------------------------------- #
#  呼叫目標模型 (OpenAI 相容 /chat/completions)
# --------------------------------------------------------------------------- #
def resolve_endpoint(cfg: dict) -> tuple[str, str | None]:
    provider = cfg.get("provider", "local")
    base = (cfg.get("baseUrl") or "").strip().rstrip("/")
    if not base:
        base = OPENAI_DEFAULT_BASE if provider == "openai" else ""
    # OpenAI-compatible local servers conventionally expose their chat API
    # under /v1.  Accept a bare local host too, since older saved settings in
    # the frontend used http://127.0.0.1:55984 without the suffix.
    if provider == "local" and base and not base.endswith("/v1"):
        base = f"{base}/v1"
    api_key = (cfg.get("apiKey") or "").strip() or None
    url = f"{base}/chat/completions"
    return url, api_key


def auth_headers(api_key: str | None) -> dict:
    return {"Authorization": f"Bearer {api_key}"} if api_key else {}


async def post_chat_completion(
    client: httpx.AsyncClient, url: str, headers: dict, payload: dict
) -> dict:
    """POST 到 chat/completions，並吸收一種常見的相容性問題：部分 reasoning
    系列模型（例如 o1/o3 這類）不支援自訂 temperature，只准用預設值 1，
    帶自訂值會直接 400。這裡不事先用模型名稱去猜「哪些模型屬於這種限制」
    （一猜就會有猜不到的新模型/漏網之魚），而是讓 API 自己說了算：只要
    回報的錯誤明確指向 temperature 參數，就拿掉這個欄位重打一次。"""
    resp = await client.post(url, json=payload, headers=headers)
    if resp.status_code == 400 and "temperature" in payload:
        try:
            err = (resp.json() or {}).get("error") or {}
        except Exception:
            err = {}
        mentions_temperature = err.get("param") == "temperature" or "temperature" in (
            err.get("message") or ""
        )
        if mentions_temperature:
            retry_payload = {k: v for k, v in payload.items() if k != "temperature"}
            resp = await client.post(url, json=retry_payload, headers=headers)
    resp.raise_for_status()
    return resp.json()


def extract_json_array(text: str) -> list:
    text = re.sub(r"```(?:json)?", "", text).strip()
    try:
        val = json.loads(text)
    except Exception:
        start = text.find("[")
        end = text.rfind("]")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("找不到 JSON 陣列")
        val = json.loads(text[start : end + 1])
    if isinstance(val, list):
        return val
    if isinstance(val, dict):
        for key in ("results", "items", "data", "output"):
            if isinstance(val.get(key), list):
                return val[key]
        best = None
        for v in val.values():
            if isinstance(v, list) and (best is None or len(v) > len(best)):
                best = v
        if best is not None:
            return best
    raise ValueError("回傳內容不是 JSON 陣列")


async def call_model(cfg: dict, items: list[dict]) -> list:
    url, api_key = resolve_endpoint(cfg)
    headers = {"Content-Type": "application/json", **auth_headers(api_key)}

    system_prompt = SYSTEM_PROMPT
    if cfg.get("_lang") == "en":
        # 連 prompt 內嵌的「<1-2句中文推論>」範例字樣也一起換掉，避免模型
        # 照著那句 placeholder 用中文寫 reasoning。
        system_prompt = system_prompt.replace(
            "<1-2句中文推論>", "<1-2 short sentences of reasoning, in English>"
        )
        system_prompt += REASONING_LANG_EN

    payload = {
        "model": cfg.get("model") or "dsv4-flash",
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": build_user_prompt(cfg.get("_profile", {}), items),
            },
        ],
        "temperature": 0.3,
        # Ornith 的 llama.cpp chat template 預設會輸出 reasoning；這個
        # pipeline 需要的是可直接解析的 JSON，開啟 reasoning 會把整批
        # 商品卡在思考內容，最後超過代理 timeout。
        "max_tokens": 2048,
    }

    # 只有本機 llama.cpp 需要這個 chat-template 參數；不要把它送給
    # OpenAI 等其他 OpenAI-compatible provider。
    if cfg.get("provider") == "local":
        payload["chat_template_kwargs"] = {"enable_thinking": False}
        payload["response_format"] = {
            "type": "json_schema",
            "schema": ANALYSIS_RESPONSE_SCHEMA,
        }
    elif cfg.get("provider") == "google":
        # Google Gemini's OpenAI-compatible endpoint uses this field to turn
        # down thinking for Gemini 3 models.  Gemini 3 does not accept
        # reasoning_effort=none, so minimal is the fastest supported level.
        # The Gemini OpenAI compatibility layer accepts json_object here but
        # rejects llama.cpp's json_schema.schema request shape.
        payload["reasoning_effort"] = "minimal"
        payload["response_format"] = {"type": "json_object"}
        # Even at reasoning_effort=minimal, Gemini's hidden thinking tokens
        # are billed against max_tokens (unlike the local llama.cpp path,
        # where thinking is fully disabled via chat_template_kwargs above).
        # 2048 was sized for that thinking-disabled path; against Gemini it
        # gets eaten by thinking before a 20-item JSON array can be written,
        # so the API returns finish_reason=MAX_TOKENS with empty content and
        # every chunk fails to parse. Give Gemini enough headroom for both.
        payload["max_tokens"] = 8192

    async with httpx.AsyncClient(timeout=TIMEOUT_SEC) as client:
        data = await post_chat_completion(client, url, headers, payload)

    content = data["choices"][0]["message"]["content"]
    parsed = extract_json_array(content)
    if isinstance(parsed, dict):  # 有些模型會包一層 {"results": [...]}
        parsed = parsed.get("results") or parsed.get("items") or []
    return parsed


# --------------------------------------------------------------------------- #
#  路由
# --------------------------------------------------------------------------- #
@app.get("/api/health")
async def health():
    return {"ok": True, "service": "dietary-ledger-model-proxy"}


@app.post("/api/understand/batch")
async def understand_batch(req: BatchRequest, request: Request):
    """接受整批商品，分塊呼叫模型，回傳以 itemName 為鍵的分析 map。"""
    if not req.items:
        return {"results": {}, "meta": {"chunks": 0, "items": 0}}
    if not req.modelConfig.get("model"):
        return {"error": "未指定 model"}

    # 邊緣 case：沒有 baseUrl 也無法呼叫
    url, _ = resolve_endpoint(req.modelConfig)
    if not url.startswith("http"):
        return {"error": "缺少 baseUrl"}

    # 建立 idx → item 對照，供前端把結果合回對應交易列
    indexed_items = [
        {
            **it.model_dump(),
            "idx": idx,
        }
        for idx, it in enumerate(req.items)
    ]

    results: dict = {}
    meta = {"chunks": 0, "items": 0}

    for i in range(0, len(req.items), CHUNK_SIZE):
        # 大批資料要跑好幾個 chunk 時，前端可能早就因為換了 modelConfig、
        # 卸載頁面等原因中止了這個請求（fetch signal.abort()）。原本這裡
        # 完全沒檢查，瀏覽器那端已經放棄等待了，這裡還是會把剩下的 chunk
        # 全部呼叫完——白白耗用模型額度跟時間，結果也沒人會用到。
        if await request.is_disconnected():
            break
        chunk = indexed_items[i : i + CHUNK_SIZE]
        cfg = dict(req.modelConfig)
        cfg["_profile"] = req.profile
        cfg["_lang"] = req.lang
        try:
            parsed = await call_model(cfg, chunk)
        except Exception as exc:  # 單塊失敗就丟給前端離線 fallback
            detail = getattr(getattr(exc, "response", None), "text", "")
            print(f"[understand_batch] chunk {i // CHUNK_SIZE} failed: {exc!r} | body: {detail[:500]}")
            return {
                "error": f"chunk {i // CHUNK_SIZE} failed: {exc}",
                "results": results,
                "meta": meta,
            }
        for entry in parsed:
            if not isinstance(entry, dict):
                continue
            idx = entry.get("idx")
            meta["items"] += 1
            # 防呆：只信任範圍內的 idx，避免模型幻覺出一個不存在/超出範圍
            # 的編號時，意外覆寫或污染到其他商品列的結果。
            if isinstance(idx, int) and 0 <= idx < len(req.items):
                results[idx] = entry
        meta["chunks"] += 1

    return {"results": results, "meta": meta}


# --------------------------------------------------------------------------- #
#  AI 飲食顧問：Text-to-SQL 資料問答                                          #
#  把前端的交易資料載入 SQLite，由 LLM 寫 SQL 查詢後再用人話回答。            #
# --------------------------------------------------------------------------- #

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
_SESSION_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
DB_SCHEMA = {
    "transactions": (
        "("
        "id TEXT PRIMARY KEY, "
        "purchase_date TEXT, "
        "invoice_no TEXT, "
        "merchant TEXT, "
        "item_name TEXT, "
        "purchased_qty REAL, "
        "unit_price REAL, "
        "amount REAL, "
        "category TEXT, "
        "is_food INTEGER, "
        "estimated_self_consumed REAL, "
        "confidence REAL, "
        "source TEXT, "
        "needs_review INTEGER"
        ")"
    )
}
MAX_SQL_ITERS = 5  # 最多幾輪 SQL 往返後，模型必須給出最終答案
PHP_SQL_TIMEOUT = 10
# 開啟 vllm 的 DeepSeek 推理模式（reasoning/思考），讓答案更準
REASONING_KWARGS = {"chat_template_kwargs": {"thinking": True}}


def _db_path(session_id: str | None) -> str:
    """
    每個 session（前端用 sessionStorage 存的一個亂數 id，見
    src/services/dietCoach.ts）各自一個 SQLite 檔案，而不是全部人共用同一個
    dietary.db。原本不管誰打 /api/ask/load 都是「DELETE FROM transactions
    再整批塞入」，兩個分頁（甚至兩個不同使用者，如果這支代理跑在共用主機
    上）交錯呼叫時，會互相清空、覆寫對方的資料，AI 顧問查到的也會是別人
    的購買紀錄。用 session_id 分開實體檔案，完全不用去改動 SQL
    query/schema，也不用管模型自己寫的 SQL 是不是有 WHERE session_id。
    """
    safe = session_id if session_id and _SESSION_ID_RE.match(session_id) else "default"
    return os.path.join(DB_DIR, f"dietary_{safe}.db")


def _conn(session_id: str | None = None) -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    return sqlite3.connect(_db_path(session_id), timeout=PHP_SQL_TIMEOUT)


def _ensure_schema(session_id: str | None = None):
    c = _conn(session_id)
    try:
        c.execute(
            "CREATE TABLE IF NOT EXISTS transactions " + DB_SCHEMA["transactions"]
        )
        c.commit()
    finally:
        c.close()


def _run_sql_ro(sql: str, session_id: str | None = None) -> tuple[list, list]:
    """執行唯讀 SELECT，回 (columns, rows)。"""
    if not re.match(r"^\s*(SELECT|WITH)", sql, re.IGNORECASE):
        raise ValueError("只允許 SELECT / WITH 查詢")
    if re.search(r"(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|PRAGMA|VACUUM|REINDEX)", sql, re.IGNORECASE):
        raise ValueError("不允許寫入操作")
    c = _conn(session_id)
    try:
        cur = c.execute(sql)
        cols = [d[0] for d in cur.description or []]
        rows = cur.fetchmany(300)
        return cols, rows
    finally:
        c.close()


class LoadRequest(BaseModel):
    transactions: list[dict]
    session_id: str | None = None


@app.post("/api/ask/load")
async def ask_load(req: LoadRequest):
    """把前端的交易資料整批載入 SQLite（每次全量取代，僅取代同一個 session 的資料）。"""
    _ensure_schema(req.session_id)
    c = _conn(req.session_id)
    try:
        c.execute("DELETE FROM transactions")
        rows = []
        for t in req.transactions:
            inf = t.get("inference") or {}
            rows.append(
                (
                    t.get("id", ""),
                    t.get("date", ""),
                    t.get("invoiceNo", "") or None,
                    t.get("merchant", ""),
                    t.get("itemName", ""),
                    t.get("purchasedQty", 0),
                    t.get("unitPrice", 0),
                    t.get("amount", 0),
                    t.get("category", "Non-food"),
                    1 if t.get("food", {}).get("isFood") else 0,
                    inf.get("estimatedSelfConsumed", 0),
                    inf.get("confidence", 0),
                    inf.get("source", ""),
                    1 if inf.get("needsReview") else 0,
                )
            )
        c.executemany(
            "INSERT INTO transactions (id, purchase_date, invoice_no, merchant, item_name, "
            "purchased_qty, unit_price, amount, category, is_food, estimated_self_consumed, "
            "confidence, source, needs_review) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            rows,
        )
        c.commit()
        return {"ok": True, "loaded": len(rows)}
    finally:
        c.close()


class ChatRequest(BaseModel):
    messages: list[dict]  # [{role, content}, ...]
    profile: dict
    modelConfig: dict
    period: str | None = None  # ex: "2026-08"
    session_id: str | None = None
    lang: str = "zh"  # "zh" | "en" — 顧問回覆語言


COACH_SYSTEM = (
    "你是「食溯」的 AI 飲食顧問，講台灣國語、語氣親切友善。\n"
    "你的職責範圍很窄，只有：(a) 使用者自己的電子發票飲食資料庫，"
    "(b) 跟這份資料相關的飲食習慣／健康建議。除此之外的任何問題——不管是寫程式、"
    "debug、解釋程式碼、其他領域的知識問答，或任何跟飲食資料無關的話題——都不屬於"
    "你的職責，即使使用者說『只是問問』『順便問一下』『當作聊天』也一樣不例外。\n"
    "你可以查詢使用者的電子發票飲食資料庫來回答問題。資料表 transactions 欄位：\n"
    "- purchase_date: 購買日期 (YYYY-MM-DD)\n"
    "- invoice_no: 發票號碼（同一次消費/同一次到店通常會拆成多列，"
    "每個品項各一列、共用同一個 invoice_no；手動輸入的紀錄沒有發票號碼，"
    "這欄會是 NULL）\n"
    "- merchant: 店家\n"
    "- item_name: 商品品名\n"
    "- purchased_qty: 購買數量\n"
    "- unit_price / amount: 單價 / 金額\n"
    "- category: 類別 (Sugary beverages / Coffee / Prepared meals / Bakery / Desserts / Dairy / Protein / Snacks / Non-food)\n"
    "- is_food: 是否食品 (0/1)\n"
    "- estimated_self_consumed: 推估本人實際食用量\n"
    "- confidence: 信心值 0-100\n"
    "- needs_review: 是否需確認 (0/1)\n\n"
    "規則：\n"
    "1. 只要是關於「你買了什麼/多少/幾次/金額/類別分布/頻率」這類資料性問題，一律先呼叫 query_diet_db 功能拿真實數據再回答，絕對不要憑印象或猜測。\n"
    "2. 使用者問「去某家店幾次」「購買頻率」這類跟『次數』有關的問題時，"
    "同一次消費常常會拆成好幾列（一個品項一列，見上面 invoice_no 的說明），"
    "不能直接 COUNT(*) 品項列數當作次數，那樣會把『一次買了 5 樣東西』"
    "誤算成『去了 5 次』。請改用 COUNT(DISTINCT invoice_no) 這類方式計算"
    "實際到店/消費次數；如果該店家的紀錄裡 invoice_no 是 NULL（手動輸入），"
    "改以 purchase_date（同一天視為同一次）去重計算。\n"
    "3. 資料夠了時，直接輸出最終答案：用繁體中文、簡潔、有條理地回覆，可適時給健康建議（例如少喝含糖飲料、注意份量），但不要治療/診斷建議。\n"
    "4. 使用者問任何跟上述職責範圍無關的問題（寫程式/程式碼/技術問題、其他領域知識、"
    "與飲食資料無關的閒聊）時，不要回答那個問題本身——禮貌說明你只能回答飲食資料庫"
    "相關的問題，並引導使用者問跟他的飲食/購買紀錄有關的事。單純的招呼語（嗨、你好、"
    "謝謝）可以簡短回應，不用長篇說明。\n"
    "5. 收斂，不要無限查詢，查到能回答就好。"
)

# 英文介面版本：職責範圍、SQL 規則完全相同，只是改用英文說明、並要求
# 模型「最終答案」用英文回覆。
COACH_SYSTEM_EN = (
    "You are the AI dietary advisor for \"Dietary Ledger\", warm and friendly in tone.\n"
    "Your scope is narrow: (a) the user's own e-invoice dietary database, "
    "(b) eating-habit / health suggestions related to that data. Anything else — "
    "coding, debugging, explaining code, general knowledge, or any topic unrelated "
    "to the dietary data — is out of scope, even if the user says they're \"just asking\" "
    "or \"just chatting\".\n"
    "You can query the user's e-invoice dietary database. Table `transactions` columns:\n"
    "- purchase_date: purchase date (YYYY-MM-DD)\n"
    "- invoice_no: invoice number (one shopping trip is usually split across several rows, "
    "one per item, sharing the same invoice_no; manual entries have no invoice number, so "
    "this column is NULL)\n"
    "- merchant: store\n"
    "- item_name: product name\n"
    "- purchased_qty: quantity purchased\n"
    "- unit_price / amount: unit price / line amount\n"
    "- category: (Sugary beverages / Coffee / Prepared meals / Bakery / Desserts / Dairy / Protein / Snacks / Non-food)\n"
    "- is_food: whether it is food (0/1)\n"
    "- estimated_self_consumed: estimated servings the user actually ate\n"
    "- confidence: confidence 0-100\n"
    "- needs_review: whether confirmation is needed (0/1)\n\n"
    "Rules:\n"
    "1. For any data question (\"what/how much/how many times/amount/category breakdown/frequency did I buy\"), "
    "always call query_diet_db to get real numbers first — never guess.\n"
    "2. For \"how many times did I visit store X\" / \"purchase frequency\" questions, a single trip is often "
    "split across rows (one per item, see invoice_no above), so do not COUNT(*) item rows as visits. "
    "Use COUNT(DISTINCT invoice_no); when invoice_no is NULL (manual entries), de-duplicate by purchase_date "
    "(same day = same trip).\n"
    "3. When you have enough data, give the final answer directly: in English, concise and well organized. "
    "You may add light dietary-health suggestions (e.g. cut back on sugary drinks, watch portion sizes), "
    "but no treatment / diagnosis advice.\n"
    "4. For anything outside the scope above (coding / technical questions, other domains, chit-chat unrelated "
    "to the dietary data), do not answer the question itself — politely explain you can only help with the "
    "dietary database and steer the user back to their food / purchase records. Plain greetings (hi, hello, "
    "thanks) get a short reply, no long explanation.\n"
    "5. Converge — don't query endlessly; stop once you can answer."
)


COACH_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "query_diet_db",
            "description": (
                "對使用者電子發票飲食資料庫的 transactions 表執行唯讀 SELECT 查詢。"
                "欄位說明見系統提示。只能 SELECT，不可寫入。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "SQL SELECT 語句",
                    }
                },
                "required": ["sql"],
            },
        },
    }
]


def build_coach_history(
    messages: list[dict], profile: dict, period: str | None = None, lang: str = "zh"
) -> list[dict]:
    profile_lines = [
        f"- 身高: {profile.get('heightCm', 170)} 公分",
        f"- 體重: {profile.get('weightKg', 65)} 公斤",
        f"- 家庭人數: {profile.get('householdSize', 1)}",
        f"- 是否常替他人購買: {profile.get('buysForOthers', 'occasionally')}",
        f"- 一餐典型份量: {profile.get('typicalMealServings', 1)}",
        f"- 一次飲料典型杯數: {profile.get('typicalDrinkServings', 1)}",
    ]
    if period:
        profile_lines.append(
            f"- 目前資料期間（使用者說的「這個月」）: {period}"
        )
    base = COACH_SYSTEM_EN if lang == "en" else COACH_SYSTEM
    header = "\n\nUser dietary profile:\n" if lang == "en" else "\n\n使用者飲食 Profile：\n"
    system = base + header + "\n".join(profile_lines)
    return [{"role": "system", "content": system}, *messages]


def _fmt_rows(cols: list, rows: list) -> str:
    if not rows:
        return "(無資料)"
    return "\n".join(
        json.dumps(dict(zip(cols, r)), ensure_ascii=False) for r in rows
    )


# --------------------------------------------------------------------------- #
#  範圍守門：只放行「飲食資料庫 / 飲食健康」相關的問題                        #
# --------------------------------------------------------------------------- #
# 一開始只是在 COACH_SYSTEM 裡加一條「不要回答無關問題」的規則，實測發現模型
# 對這種埋在一長串系統提示裡的「不要做 X」指令遵從度很差——直接問它寫
# quicksort，它還是很開心地生成一大段程式碼跟解說，完全無視規則。
# 改成獨立的分類呼叫：用一個很短、單一目的的 system prompt，只問「這句話
# 有沒有在問飲食資料庫/飲食建議」，模型對這種單純的二選一分類指令遵從度
# 高很多。不在範圍內的話，直接回固定的婉拒訊息，連主要的 tool-calling
# 迴圈都不會進去——省呼叫、也不會讓模型有機會半途「順便」回答其他問題。
SCOPE_CHECK_SYSTEM = (
    "你是一個嚴格的問題分類器，不是聊天助理。"
    "你會看到一段對話，請只判斷「使用者最後一句話」屬於下面哪一種：\n"
    "IN：跟使用者自己的飲食/購買發票資料庫有關（買了什麼、花多少錢、頻率、"
    "類別分布…），或跟飲食習慣、飲食健康建議有關；也包含單純的招呼語"
    "（嗨、你好、謝謝、掰掰）。\n"
    "OUT：其他任何事情，包含但不限於：寫程式/程式碼/debug/演算法、"
    "解釋技術概念、其他領域的知識問答、跟飲食完全無關的閒聊或請求——即使"
    "使用者說『只是問問』『順便問』也一樣算 OUT。\n"
    "使用者的訊息可能是中文或英文，判斷標準一樣。\n"
    "只回答一個英文單字 IN 或 OUT，不要有任何其他文字、標點、解釋或程式碼。"
)

OUT_OF_SCOPE_REPLY = (
    "這個問題不在我能回答的範圍內喔～我只負責查你的飲食/購買發票資料庫、"
    "聊飲食習慣或健康建議。要不要問問我「這個月都買了什麼」「含糖飲料喝多"
    "少」之類的問題？"
)

OUT_OF_SCOPE_REPLY_EN = (
    "That's outside what I can help with — I only look at your dietary / purchase "
    "invoice database and chat about eating habits or health tips. Try asking me "
    'something like "what did I buy this month" or "how many sugary drinks did I have".'
)


async def _check_in_scope(cfg: dict, messages: list[dict]) -> bool:
    """回傳 False 時代表判定為離題，呼叫端應該直接婉拒、不要進主要對話流程。"""
    url, api_key = resolve_endpoint(cfg)
    if not url.startswith("http"):
        return True  # 沒有可用端點——讓後面的主流程去處理並回報錯誤
    payload = {
        "model": cfg.get("model") or "dsv4-flash",
        "messages": [{"role": "system", "content": SCOPE_CHECK_SYSTEM}, *messages],
        "temperature": 0,
        "max_tokens": 5,
    }
    headers = {"Content-Type": "application/json", **auth_headers(api_key)}
    async with httpx.AsyncClient(timeout=TIMEOUT_SEC) as client:
        data = await post_chat_completion(client, url, headers, payload)
    text = (data["choices"][0]["message"].get("content") or "").strip().upper()
    # 保守預設：分類結果不明確（模型答了奇怪的東西）時，當作 IN，不要誤擋
    # 使用者正常的問題——寧可讓主流程處理，也不要因為分類器本身不穩定而
    # 一直婉拒真的相關的問題。
    return not text.startswith("OUT")


@app.post("/api/ask/chat")
async def ask_chat(req: ChatRequest, request: Request):
    url, api_key = resolve_endpoint(req.modelConfig)
    if not url.startswith("http"):
        return {"error": "缺少 baseUrl"}
    _ensure_schema(req.session_id)

    if req.messages:
        try:
            in_scope = await _check_in_scope(req.modelConfig, req.messages)
        except Exception:
            # 分類呼叫本身失敗（連線問題等）：不要因此擋掉使用者，讓後面
            # 的主流程照常跑，該失敗的話會在那邊回報真正的錯誤原因。
            in_scope = True
        if not in_scope:
            return {
                "answer": OUT_OF_SCOPE_REPLY_EN if req.lang == "en" else OUT_OF_SCOPE_REPLY
            }

    history = build_coach_history(req.messages, req.profile, req.period, req.lang)

    async def once() -> dict:
        payload = {
            "model": req.modelConfig.get("model") or "dsv4-flash",
            "messages": history,
            "temperature": 0.2,
            "tools": COACH_TOOLS,
            "tool_choice": "auto",
        }
        # REASONING_KWARGS（chat_template_kwargs）是內網 vLLM/DeepSeek 才懂
        # 的非標準欄位。原本不分 provider 一律塞進 payload，選「OpenAI API」
        # 時會把這個欄位一起送給 https://api.openai.com/v1/chat/completions，
        # OpenAI 對未知欄位是直接回錯，導致 AI 顧問在 OpenAI 這個 provider
        # 底下每一次呼叫都失敗。
        if req.modelConfig.get("provider") == "local":
            payload.update(REASONING_KWARGS)
        elif req.modelConfig.get("provider") == "google":
            payload["reasoning_effort"] = "minimal"
        headers = {"Content-Type": "application/json", **auth_headers(api_key)}
        async with httpx.AsyncClient(timeout=TIMEOUT_SEC) as client:
            data = await post_chat_completion(client, url, headers, payload)
        return data["choices"][0]["message"]

    used_tools = 0
    for _ in range(MAX_SQL_ITERS):
        # 每輪最多可能再打一次模型 + 一次 SQL，使用者可能早就關掉分頁或
        # AI 顧問面板（前端會 signal.abort()）；沒有這個檢查的話，即使
        # 使用者已經離開，這個迴圈還是會傻傻地跑完剩下的輪次。
        if await request.is_disconnected():
            return {"error": "使用者已中斷連線"}
        try:
            msg = await once()
        except Exception as exc:
            detail = getattr(getattr(exc, "response", None), "text", "")
            print(f"[ask_chat] once() failed: {exc!r} | body: {detail[:500]}")
            return {"error": f"模型呼叫失敗: {exc}"}

        tool_calls = msg.get("tool_calls") or []
        if not tool_calls:
            fallback = (
                "I haven't pulled any data yet — what would you like to ask?"
                if req.lang == "en"
                else "我還沒查到資料，請問你想問什麼？"
            )
            return {"answer": (msg.get("content") or "").strip() or fallback}

        # 回傳 assistant 帶 tool_calls 的訊息（保留 reasoning 供 vllm 續接）
        assistant_msg = {
            "role": "assistant",
            "content": msg.get("content"),
            "tool_calls": tool_calls,
        }
        if msg.get("reasoning_content"):
            assistant_msg["reasoning_content"] = msg["reasoning_content"]
        # Gemini 3 may return a provider-specific thought signature that must
        # be preserved when the next turn contains the tool result.
        if msg.get("extra_content"):
            assistant_msg["extra_content"] = msg["extra_content"]
        history.append(assistant_msg)

        for tc in tool_calls:
            fn = (tc.get("function") or {}).get("name")
            try:
                args = json.loads((tc.get("function") or {}).get("arguments") or "{}")
            except Exception:
                args = {}
            sql = (args.get("sql") or "").strip()
            used_tools += 1
            try:
                cols, rows = _run_sql_ro(sql, req.session_id)
                result = _fmt_rows(cols, rows)
            except Exception as exc:
                result = f"SQL 執行錯誤: {exc}"
            history.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.get("id"),
                    "name": fn,
                    "content": result,
                }
            )

    # 用完迭代次數仍無最終答案 → 回錯誤讓前端提示
    return {
        "error": f"多次查詢後仍無法給出回答（已查詢 {used_tools} 次），請重整後再試。"
    }
