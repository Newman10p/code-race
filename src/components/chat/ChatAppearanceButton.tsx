import { useState } from "react";
import { Palette } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChatAppearancePanel } from "./ChatAppearancePanel";
import { ChatPrefs } from "@/lib/chat-theme";

export function ChatAppearanceButton({
  prefs,
  onChange,
}: {
  prefs: ChatPrefs;
  onChange: (patch: Partial<ChatPrefs>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Chat appearance"
          className="chat-icon-btn"
          title="Chat appearance"
        >
          <Palette className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chat appearance</DialogTitle>
          <DialogDescription>Pick a palette, wallpaper and bubble style. It follows you across every chat.</DialogDescription>
        </DialogHeader>
        <ChatAppearancePanel prefs={prefs} onChange={onChange} />
      </DialogContent>
    </Dialog>
  );
}
