import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * 把一個 DOM 節點截圖後轉成「單頁 A4」PDF 下載。呼叫端要自己把來源節點
 * 設計成大致符合 A4 直向比例、內容量抓在一頁內（見
 * components/ClinicalDocument.tsx 開頭的說明）——這裡再用「等比縮放到
 * 版心（頁面扣掉邊界）範圍內、置中」當最後一道防線：不管來源節點的實際
 * 尺寸/比例跟 A4 差多少，輸出永遠只有一頁、四周永遠留有邊界，不會被裁切
 * 也不會頂到頁緣太擠。
 *
 * 用截圖而不是 jsPDF 直接排版文字，是因為內容是中文（jsPDF 內建字型不含
 * 中文字形，嵌入中文字型檔案體積太大不划算）——截圖能保證跟畫面上看到的
 * 排版、字體完全一致，缺點是文字不能反白選取，這份文件的用途（下載給
 * 醫療人員參考）不需要這個。
 */
export async function exportNodeToSinglePageA4Pdf(
  node: HTMLElement,
  filename: string
): Promise<void> {
  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28; // ~1cm，四周留白避免內容直接頂到頁緣
  const boxWidth = pageWidth - margin * 2;
  const boxHeight = pageHeight - margin * 2;

  const aspect = canvas.width / canvas.height;
  let imgWidth = boxWidth;
  let imgHeight = imgWidth / aspect;
  if (imgHeight > boxHeight) {
    imgHeight = boxHeight;
    imgWidth = imgHeight * aspect;
  }
  const x = margin + (boxWidth - imgWidth) / 2;
  const y = margin + (boxHeight - imgHeight) / 2;

  pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, imgWidth, imgHeight);
  pdf.save(filename);
}
