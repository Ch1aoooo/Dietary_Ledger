import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUsers } from "@/lib/users";
import { t } from "@/lib/i18n";

/**
 * 新增使用者：只問名字，建立後立刻切成使用中（見 lib/users.tsx 的
 * addUser），並導去 /onboarding 讓新使用者從問卷開始——資料完全獨立，
 * 因為 lib/store.tsx 的所有 localStorage key 都會依使用中的使用者 id
 * 加上不同的 namespace，不會跟其他使用者共用。
 */
export function AddUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addUser } = useUsers();
  const [name, setName] = useState("");
  const navigate = useNavigate();

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) setName("");
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    addUser(trimmed);
    setName("");
    onOpenChange(false);
    navigate("/onboarding");
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("新增使用者")}</DialogTitle>
          <DialogDescription>
            {t("建立一個全新的使用者，飲食資料會跟其他使用者完全獨立。")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="new-user-name">{t("使用者名稱")}</Label>
          <Input
            id="new-user-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("例如：小明")}
            autoFocus
            onKeyDown={(e) => {
              // 中文輸入法選字那次 Enter 不算送出，見 components/DietCoach.tsx
              // 的說明——這裡同樣的道理。
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>
        <Button className="w-full" onClick={submit} disabled={!name.trim()}>
          {t("建立並開始問卷")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
