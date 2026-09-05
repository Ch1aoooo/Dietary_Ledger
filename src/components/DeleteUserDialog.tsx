import { TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUsers, type UserRecord } from "@/lib/users";
import { t } from "@/lib/i18n";

/**
 * 刪除使用者的確認對話框——右鍵選單點「刪除使用者」後跳出來
 * （見 components/Sidebar.tsx）。這是不可逆的操作（連同該使用者的所有
 * 飲食資料一起清掉，見 lib/users.tsx 的 removeUser），跟這個 app 其他
 * 破壞性操作（Settings 的「重設所有資料」）不同——那個只清「目前使用者
 * 自己」的資料，這個是整個刪掉一個使用者身分，影響範圍更大，所以額外
 * 多一步確認。
 */
export function DeleteUserDialog({
  user,
  onOpenChange,
}: {
  /** 要刪除的使用者；null 代表對話框關閉。 */
  user: UserRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { removeUser, users } = useUsers();
  const onlyOneLeft = users.length <= 1;

  function confirm() {
    if (!user) return;
    removeUser(user.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-4 w-4" /> {t("刪除使用者")}
          </DialogTitle>
          <DialogDescription>
            {onlyOneLeft
              ? t("這是目前唯一的使用者，至少要保留一個，沒辦法刪除。")
              : t("確定要刪除「{name}」嗎？他的所有飲食資料（發票、個人檔案、記錄…）都會一併清除，無法復原。", { name: t(user?.name ?? "") })}
          </DialogDescription>
        </DialogHeader>
        {!onlyOneLeft && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("取消")}
            </Button>
            <Button variant="destructive" onClick={confirm}>
              {t("確定刪除")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
