/**
 * 英文對照表：key 是程式裡的中文原文，value 是英文。查不到的 key 會自動
 * 退回顯示中文原文（見 lib/i18n.ts 的 t()），所以漏翻不會讓畫面壞掉。
 *
 * 動態字串用 {name} 佔位，中文 key 跟這裡的英文都要有同樣的佔位符。
 */
export const EN: Record<string, string> = {
  // ---- 導覽 / 框架 (Sidebar, MobileNav, Header) ----
  "總覽": "Overview",
  "上傳資料": "Upload Data",
  "飲食檔案": "Dietary Profile",
  "交易明細": "Transactions",
  "待確認": "Review",
  "設定": "Settings",
  "上傳": "Upload",
  "檔案": "Profile",
  "交易": "Txns",
  "收合側欄": "Collapse sidebar",
  "展開側欄": "Expand sidebar",
  "新增其他使用者": "Add another user",
  "使用中": "Active",
  "點擊切換": "Switch",
  "右鍵可以刪除這個使用者": "Right-click to remove this user",
  "資料 · 已上傳": "Data · Uploaded",
  "資料 · 尚未上傳": "Data · Not uploaded",
  "AI 分析中…": "AI analyzing…",
  "AI 分析失敗": "AI analysis failed",
  "AI 引擎 · {model}": "AI engine · {model}",
  "有紀錄分析失敗（連不上模型、逾時，或回應不完整）。去「設定」確認模型設定後可以重試。":
    "Some records failed to analyze (model unreachable, timeout, or incomplete response). Check the model settings under Settings, then retry.",
  "中文": "中文",
  "切換語言": "Switch language",

  // ---- Dashboard ----
  "歡迎": "Welcome",
  "每月": "Monthly",
  "{range} 飲食總覽": "{range} Dietary Overview",
  "下載": "Download",
  "尚未上傳任何資料": "No data uploaded yet",
  "上傳你的財政部電子發票 CSV（載具匯出格式），我們會解析並開始 推估「實際食用量」。上傳後即可看到分析結果。":
    "Upload your MOF e-invoice CSV (carrier export format). We'll parse it and start estimating your actual intake. Analysis appears once uploaded.",
  "上傳 CSV": "Upload CSV",
  "這個日期範圍內沒有紀錄": "No records in this date range",
  "目前選取的是 {range}，試著調整右上角的日期範圍看看。":
    "Currently showing {range}. Try adjusting the date range in the top right.",
  "{n} 筆尚未完成 AI 分析": "{n} records not yet analyzed by AI",
  "{n} 筆分析失敗": "{n} records failed to analyze",
  "，": ", ",
  "——下面的統計數字還不含這些紀錄。": " — the stats below don't include these records yet.",
  "重試分析": "Retry analysis",
  "食品相關消費": "Food-related purchases",
  "筆食品紀錄": "food records",
  "推估個人份量": "Estimated personal servings",
  "推估本人實際食用份量": "estimated servings you actually ate",
  "高信心紀錄": "High-confidence records",
  "信心 ≥ 80%": "confidence ≥ 80%",
  "等待你協助確認": "waiting for your confirmation",
  "此區間主要飲食類別": "Top food categories this period",
  "推估個人食用份量分布（%）": "estimated personal servings distribution (%)",
  "每週飲食趨勢": "Weekly dietary trend",
  "推估個人食用量逐週變化（份量 / 週）": "estimated personal intake by week (servings / week)",
  "AI 飲食洞察": "AI Dietary Insights",
  "此區間分析 · 僅供參考，不作疾病判斷":
    "this-period analysis · for reference only, not a medical diagnosis",
  "需要你協助確認": "Needs your confirmation",
  "{n} 筆紀錄因信心不足、且可能影響飲食分析，建議你快速確認。":
    "{n} records have low confidence and may affect the analysis — a quick review is recommended.",
  "前往待確認": "Go to Review",

  // ---- 日期 (dateRange) ----
  "{y}年{m}月{d}日": "{y}/{m}/{d}",

  // ---- 食品分類 (colors: CATEGORY_LABELS) ----
  "調理食品": "Prepared meals",
  "咖啡": "Coffee",
  "含糖飲料": "Sugary beverages",
  "烘焙麵包": "Bakery",
  "甜點": "Desserts",
  "乳製品": "Dairy",
  "蛋白質": "Protein",
  "零食": "Snacks",
  "非食品": "Non-food",

  // ---- analytics: 週次 / insight / clinical ----
  "第 {n} 週": "Week {n}",
  "示範使用者": "Demo User",
  "咖啡攝取頻率": "Coffee intake frequency",
  "咖啡相關攝取估計約每週 {n} 次。":
    "Estimated coffee-related intake is about {n} times per week.",
  "含糖飲料週趨勢": "Sugary beverage weekly trend",
  "含糖飲料推估攝取量在後半段{dir}（前半平均每天約 {a} 次，後半平均每天約 {b} 次）。":
    "Estimated sugary-beverage intake {dir} in the second half of the period (first half ~{a}/day, second half ~{b}/day).",
  "上升": "rose",
  "下降": "fell",
  "持平": "held steady",
  "精緻澱粉比例": "Refined-carb share",
  "{n} 筆紀錄（約 {pct}%）屬於精緻澱粉（白飯、白麵包、含糖甜點等精製碳水）。{tail}":
    "{n} records (~{pct}%) are refined carbs (white rice, white bread, sugary desserts, etc.). {tail}",
  "比例偏高，建議適度替換成糙米、全麥等全穀雜糧。":
    "This share is high — consider swapping in brown rice, whole wheat and other whole grains.",
  "比例在合理範圍內。": "This share is within a reasonable range.",
  "原型食物比例": "Whole-food share",
  "{n} 筆紀錄（約 {pct}%）屬於原型食物（未經高度加工，如新鮮蔬果、原型肉類）。{tail}":
    "{n} records (~{pct}%) are whole foods (minimally processed, e.g. fresh produce, unprocessed meat). {tail}",
  "比例偏低，建議增加新鮮蔬果、原型蛋白質的攝取。":
    "This share is low — consider more fresh produce and whole protein sources.",
  "整體攝取型態尚可。": "Overall intake pattern is acceptable.",
  "高 GI 食物比例": "High-GI food share",
  "{n} 筆紀錄（約 {pct}%）屬於高升糖指數食物。{tail}":
    "{n} records (~{pct}%) are high-glycemic-index foods. {tail}",
  "比例偏高，建議搭配蛋白質或蔬菜一起食用，有助平緩血糖波動。":
    "This share is high — pairing with protein or vegetables can help smooth blood-sugar swings.",
  "油炸類攝取": "Fried-food intake",
  "本區間沒有偵測到油炸類食物紀錄。": "No fried-food records detected in this period.",
  "本區間共 {n} 筆紀錄屬於油炸類食物。{tail}":
    "{n} records in this period are fried foods. {tail}",
  "頻率偏高，建議減少油炸、改以蒸煮或烘烤方式為主。":
    "Frequency is high — consider less deep-frying and more steaming or baking.",
  "頻率在合理範圍內。": "Frequency is within a reasonable range.",
  "經常購買咖啡": "Recurrent coffee purchases",
  "經常購買調理食品": "Frequent prepared-food purchases",
  "多筆含糖飲料紀錄": "Several sweetened beverage records",
  "多筆大量採購已依個人消費歸屬調整":
    "Multiple bulk purchases were adjusted using personalized consumption attribution",
  "購買不等於實際攝取。": "Purchase does not necessarily equal actual intake.",
  "共同購買不一定能被辨識。": "Shared purchases may not always be identifiable.",
  "食物浪費無法直接觀察。": "Food waste cannot be directly observed.",
  "目前的電子發票資料不含確切用餐時間。":
    "The current electronic invoice dataset does not contain exact meal time.",
  "飲食推估僅供輔助參考，不作為臨床診斷。":
    "Dietary estimates should be treated as supplementary information, not clinical diagnosis.",

  // ---- ClinicalDocument ----
  "個人飲食歷史摘要": "Personal Dietary History Summary",
  "對象": "Patient",
  "觀察期間": "Observation period",
  "資料來源": "Data source",
  "推估方法": "Method",
  "電子發票紀錄": "Electronic Invoice Records",
  "購買推估攝取量": "Purchase-derived exposure estimation",
  "飲食型態摘要": "Dietary Pattern Summary",
  "次 / 週": "times / week",
  "本期間無食品紀錄。": "No food records for this period.",
  "分類佔比與每週趨勢": "Category Breakdown & Weekly Trend",
  "此區間無足夠資料產生洞察。": "Not enough data in this period to generate insights.",

  // ---- Upload ----
  "解析電子發票": "Parsing e-invoices",
  "清理商品紀錄": "Cleaning item records",
  "送交 AI 理解食品內容": "Sending to AI for food understanding",
  "推估個人實際攝取": "Estimating personal intake",
  "計算信心分數": "Computing confidence scores",
  "更新飲食檔案": "Updating dietary profile",
  "無法辨識為電子發票 CSV 格式，請確認是從財政部載具平台匯出的檔案。":
    "Not recognized as an e-invoice CSV. Please make sure it was exported from the MOF carrier platform.",
  "目前僅支援 CSV 格式，XLSX 轉檔支援即將開放。請匯出為 CSV 後再上傳。":
    "Only CSV is supported for now; XLSX conversion is coming soon. Please export as CSV and upload again.",
  "讓你的消費紀錄，成為長期健康資料的一部分":
    "Turn your spending records into part of your long-term health data",
  "上傳電子發票載具紀錄，將日常食品消費轉換為個人化飲食檔案， 協助你與醫療人員更完整地了解長期飲食行為。":
    "Upload your e-invoice carrier records to turn everyday food spending into a personalized dietary profile, helping you and your care team understand long-term eating patterns.",
  "上傳電子發票 CSV / Excel": "Upload e-invoice CSV / Excel",
  "拖曳檔案到此處，或點擊選擇檔案": "Drag a file here, or click to choose",
  "支援 CSV / XLSX": "CSV / XLSX supported",
  "資料僅在本機分析": "Data analyzed locally only",
  "每月新增一次": "Add once a month",
  "購買 ≠ 實際攝取": "purchase ≠ actual intake",
  "沒有檔案？載入範例資料試試": "No file? Try loading sample data",
  "本月讀取": "This month's read",
  "張發票": "invoices",
  "筆商品紀錄": "item records",
  "將送交 AI 分析": "to be sent to AI",
  "折扣/異常列（略過）": "discount/anomaly rows (skipped)",
  "重新上傳": "Upload again",
  "開始分析": "Start analysis",
  "正在分析": "Analyzing",
  "AI 正在理解你的消費紀錄": "AI is interpreting your spending records",
  "上傳資料分析完成": "Data analysis is complete",
  "AI 正在背景為這些紀錄做食品分類與個人化消費歸因，完成後即可在本月分析看到結果。":
    "AI is classifying these records and attributing personal consumption in the background. Results will appear in this month's analysis when done.",
  "商品紀錄": "item records",
  "送交 AI 分析": "sent to AI",
  "目前已有 {n} 筆低信心紀錄建議你確認":
    "There are already {n} low-confidence records suggested for your review",
  "查看本月分析": "View this month's analysis",

  // ---- Transactions ----
  "每一筆都能展開查看「原始 → 食物理解 → 推估」的完整邏輯。":
    "Expand any row to see the full logic: raw → food understanding → estimate.",
  "食品": "Food",
  "全部紀錄": "All records",
  "低信心": "Low confidence",
  "有尚未分析的新紀錄": "New records not yet analyzed",
  "分析中…": "Analyzing…",
  "重新分析": "Re-analyze",
  "搜尋品名、商店或類別…": "Search item, merchant or category…",
  "沒有符合條件的交易": "No matching transactions",

  // ---- TransactionTable ----
  "日期": "Date",
  "商店": "Merchant",
  "品項": "Item",
  "購買量": "Purchased",
  "推估攝取": "Est. intake",
  "信心": "Confidence",
  "分類": "Category",
  "刪除": "Delete",
  "分析中": "Analyzing",
  "待分析": "Pending",
  "分析失敗": "Failed",
  "查看「{item}」的詳細資料": "View details for \"{item}\"",
  "刪除這筆紀錄": "Delete this record",
  "刪除「{item}」": "Delete \"{item}\"",

  // ---- TransactionDetailPanel ----
  "關閉": "Close",
  "來源": "Source",
  "高信心": "high confidence",
  "中等信心": "moderate confidence",
  "低信心說明": "low confidence",
  "原始交易": "Observed",
  "購買數量": "Purchased quantity",
  "單價": "Unit price",
  "小計金額": "Line amount",
  "AI 尚未分析這一列，稍後重新整理即可看到食品分類與攝取推估。":
    "AI hasn't analyzed this row yet. Refresh later to see the food category and intake estimate.",
  "AI 分析這一列時失敗了（連不上模型、逾時，或回應不完整）。可以到 「設定」確認模型設定後按「重試分析」。":
    "AI failed to analyze this row (model unreachable, timeout, or incomplete response). Check the model settings under Settings, then hit Retry analysis.",
  "食品理解": "Food understanding",
  "可囤貨": "Stockable",
  "是": "Yes",
  "否": "No",
  "保存期限": "Shelf life",
  "常見單位": "Typical unit",
  "很短": "very short",
  "短": "short",
  "中等": "medium",
  "長": "long",
  "推論": "Inference",
  "推估個人食用量": "Estimated personal consumption",
  "分配天數": "Distribution",
  "{n} 天": "{n} days",
  "此列判定為非食品或折扣調整，不納入飲食分析。":
    "This row is classified as non-food or a discount adjustment and is excluded from the dietary analysis.",

  // ---- Review ----
  "需要你的協助確認": "Needs your confirmation",
  "大部分紀錄已由模型自動處理。只有在推估不確定、且可能影響飲食分析時才會詢問你。":
    "Most records are handled automatically. We only ask when an estimate is uncertain and could affect the analysis.",
  "{n} 筆待確認": "{n} records need review",
  "已確認 {n} 筆": "{n} confirmed",
  "沒有待確認的紀錄": "No records to review",
  "本月大部分推估信心足夠，已自動處理。":
    "Most estimates this month were confident enough and handled automatically.",
  "你尚未確認任何紀錄。": "You haven't confirmed any records yet.",

  // ---- ReviewCard ----
  "你選了「不確定」": "You chose \"Not sure\"",
  "我們保留原本的推估——{est} {unit} （信心 {conf}%），不會覆寫成一個假的確認值。":
    "We keep the original estimate — {est} (confidence {conf}%) — rather than overwriting it with a fake confirmed value.",
  "已更新你的個人模型": "Your personal model has been updated",
  "確認前（推估）": "Before (estimated)",
  "確認後（已確認）": "After (confirmed)",
  "本人食用 {n} {unit}": "Ate {n}",
  "來源：使用者確認": "Source: User Confirmed",
  "{d} · 需要你的協助": "{d} · needs your help",
  "模型推估值": "Model estimate",
  "{unit}（本人）": "(self)",
  "推論依據": "Reasoning",
  "這次購買大概有多少份是你自己吃的？":
    "About how many servings of this purchase did you eat yourself?",
  "不確定": "Not sure",
  "確認": "Confirm",
  "選取後此紀錄將標記為「不確定」，保留原本推估":
    "This record will be marked \"Not sure\" and keep its original estimate",
  "選取後此紀錄將視為「本人食用 {n} {unit}」":
    "This record will be treated as \"ate {n}\"",
  "顧問思考中…": "Advisor is thinking…",

  // ---- Settings ----
  "管理你的資料與個人檔案。": "Manage your data and personal profile.",
  "分析引擎": "Analysis engine",
  "選擇用來推估「實際食用量」的模型引擎。改動後會重新分析並更新總覽。":
    "Choose the model engine used to estimate actual intake. Changing it re-runs the analysis and updates the Overview.",
  "正在呼叫模型…": "Calling the model…",
  "AI 分析失敗，部分或全部紀錄未完成分析":
    "AI analysis failed; some or all records were not analyzed",
  "已用 AI 引擎完成分析": "Analysis completed with the AI engine",
  "API Key（本地可留空）": "API Key (leave blank for local)",
  "Google API Key": "Google API Key",
  "API Key": "API Key",
  "無需 key": "No key needed",
  "貼上 Google AI Studio API key": "Paste your Google AI Studio API key",
  "模型名稱": "Model name",
  "資料": "Data",
  "清除所有上傳資料與個人檔案，回到初始狀態。":
    "Clear all uploaded data and your personal profile, returning to the initial state.",
  "重設所有資料": "Reset all data",
  "會清除你上傳的 CSV 與所有確認紀錄":
    "This clears your uploaded CSV and all confirmations",
  "此產品不提供醫療診斷。所有飲食資訊皆為補充性參考。":
    "This product does not provide medical diagnosis. All dietary information is supplementary reference only.",

  // ---- modelConfig ----
  "本機 / 內網模型": "Local / on-prem model",
  "本機 / 內網 DeepSeek": "Local / on-prem DeepSeek",
  "走公司內網 OpenAI 相容端點（不需 key）":
    "Uses the on-prem OpenAI-compatible endpoint (no key)",
  "填你自己的 OpenAI API key": "Use your own OpenAI API key",
  "Google Gemini（免費額度）": "Google Gemini (free tier)",
  "Gemini Flash-Lite，適合快速資料抽取": "Gemini Flash-Lite, good for fast extraction",

  // ---- DietaryProfile / Onboarding ----
  "個人飲食檔案": "Personal Dietary Profile",
  "這些設定用來校正「購買量 ≠ 實際攝取量」的落差，隨時可以調整，AI 分析時會參考這裡的內容。":
    "These settings calibrate the gap between purchase quantity and actual intake. Adjust them anytime; the AI analysis takes them into account.",
  "個人消費檔案已建立": "Personal Consumption Profile created",
  "我們會利用這些資訊，降低「購買量 ≠ 實際攝取量」造成的誤判——例如幫別人代買的餐點、 囤積的飲料，都不會被直接當成你實際吃掉的量。":
    "We use this information to reduce misjudgments from the purchase-vs-intake gap — meals bought for others or stockpiled drinks won't be counted as what you actually ate.",
  "開始建立每月飲食分析": "Start building your monthly dietary analysis",
  "用哪個引擎推估「實際食用量」？": "Which engine estimates actual intake?",
  "模型：": "Model: ",
  "送出": "Submit",
  "這些資料只用來校正「購買與實際攝取」的落差，不會用於疾病判斷。":
    "This information is only used to calibrate the purchase-vs-intake gap, never for medical judgment.",

  // ---- onboardingQuestions ----
  "身體數值": "Body metrics",
  "居住狀況": "Living situation",
  "購物習慣": "Shopping behavior",
  "主餐份量": "Meal serving",
  "飲料份量": "Drink serving",
  "大量採購 · {label}": "Bulk buying · {label}",
  "您的身高（公分）": "Your height (cm)",
  "您的體重（公斤）": "Your weight (kg)",
  "公分": "cm",
  "公斤": "kg",
  "目前同住人數（包含您自己）": "People currently living with you (including yourself)",
  "1 人": "1 person",
  "2 人": "2 people",
  "3–4 人": "3–4 people",
  "5 人以上": "5 or more",
  "您購買的餐點或飲料，通常會包含其他人的份嗎？":
    "Do the meals or drinks you buy usually include portions for others?",
  "幾乎都是自己食用": "Almost always just for me",
  "偶爾": "Occasionally",
  "經常": "Often",
  "一般情況下，一餐通常會食用幾份主餐？":
    "Typically, how many main-dish servings do you eat in one meal?",
  "1 份": "1 serving",
  "2 份": "2 servings",
  "3 份以上": "3 or more",
  "一般情況下，一次通常會飲用幾杯飲料？":
    "Typically, how many drinks do you have at a time?",
  "1 杯": "1 drink",
  "2 杯": "2 drinks",
  "3 杯以上": "3 or more",
  "您是否會一次購買多天份的「{label}」，待不同時間、日期食用？":
    "Do you buy several days' worth of \"{label}\" at once, to consume on different days?",
  "飲料": "Beverages",
  "冷凍食品": "Frozen food",
  "麵包": "Bread",
  "即食餐點": "Ready meals",
  "很少": "Rarely",
  "偶爾採購": "Sometimes",

  // ---- DietCoach ----
  "嗨！我是你的 AI 飲食顧問 👋 我可以直接查你今天上傳的發票資料，回答像是\n「我這個月含糖飲料喝得多嗎？」「我最常在哪家買吃的？」「咖啡攝取有沒有變多？」\n需要我幫你分析看看嗎？":
    "Hi! I'm your AI dietary advisor 👋 I can look straight at the invoice data you uploaded today and answer things like\n\"Am I drinking a lot of sugary drinks this month?\" \"Where do I buy food most often?\" \"Is my coffee intake going up?\"\nWant me to take a look?",
  "AI 飲食顧問": "AI Dietary Advisor",
  "直接問，我會查你的發票資料回答": "Just ask — I'll check your invoice data",
  "同步最新發票資料中…": "Syncing latest invoice data…",
  "清除對話": "Clear chat",
  "問我你的飲食…": "Ask me about your diet…",
  "同步資料中，稍等一下…": "Syncing data, one moment…",
  "AI 顧問暫時連不上：{msg}。請確認後端與模型已啟動。":
    "The AI advisor is temporarily unreachable: {msg}. Please make sure the backend and model are running.",

  // ---- AddManualEntryDialog ----
  "手動記錄食物": "Log food manually",
  "發票涵蓋不到的食物（自己煮的、別人請的…）可以在這裡補記，一樣會納入飲食分析。":
    "Foods invoices don't cover (home-cooked, treated by others…) can be added here and will be included in the analysis.",
  "食物品項": "Food item",
  "例如：滷肉飯": "e.g. braised pork rice",
  "實際食用份量": "Actual servings eaten",
  "例如：1": "e.g. 1",
  "單位": "Unit",
  "例如：碗 / 份 / 杯": "e.g. bowl / serving / cup",

  // ---- AddUserDialog ----
  "新增使用者": "Add user",
  "建立一個全新的使用者，飲食資料會跟其他使用者完全獨立。":
    "Create a brand-new user; their dietary data is fully separate from other users.",
  "使用者名稱": "User name",
  "例如：小明": "e.g. Alex",
  "建立並開始問卷": "Create and start questionnaire",

  // ---- DeleteUserDialog ----
  "刪除使用者": "Delete user",
  "這是目前唯一的使用者，至少要保留一個，沒辦法刪除。":
    "This is the only user. At least one must remain, so it can't be deleted.",
  "確定要刪除「{name}」嗎？他的所有飲食資料（發票、個人檔案、記錄…）都會一併清除，無法復原。":
    "Delete \"{name}\"? All their dietary data (invoices, profile, records…) will be removed and cannot be recovered.",
  "取消": "Cancel",
  "確定刪除": "Delete",

  // ---- DateRangePicker ----
  "選擇日期範圍": "Select date range",
  "點選任一天可以重新選取範圍。": "Click any day to start a new range.",
  "已選開始日期 {d}，請點選結束日期。": "Start date {d} selected — now pick the end date.",
  "先點選開始日期，再點選結束日期。": "Pick a start date, then an end date.",
  "涵蓋所有資料的日期範圍": "Date range covering all data",
  "全部": "All",

  // ---- 其他補充 ----
  "直接紀錄": "Observed",
  "模型推估": "Inferred",
  "使用者確認": "User Confirmed",
  "例如 170": "e.g. 170",
  "例如 65": "e.g. 65",
  "待處理": "Pending",
  "已確認": "Confirmed",
  "Base URL（OpenAI 相容）": "Base URL (OpenAI-compatible)",

  // ---- 日曆 ----
  "上個月": "Previous month",
  "下個月": "Next month",
  "{y} 年 {m} 月": "{m}/{y}",

  // ---- 資料 pipeline 產生的文字 ----
  "手動輸入": "Manual entry",
  "AI 已分析此列，但未提供詳細推論說明。":
    "AI analyzed this row but did not provide detailed reasoning.",
  "使用者手動輸入的實際食用量，非 AI 推估。":
    "Actual servings entered manually by the user, not an AI estimate.",
  "份": "serving",
};
