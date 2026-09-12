import { ReactNode } from "react";
import { ChatPrefs, chatVars, wallpaperStyle } from "@/lib/chat-theme";
import { cn } from "@/lib/utils";

/**
 * A themed chat panel: applies the user's palette, wallpaper and density
 * as CSS custom properties for everything rendered inside it.
 */
export function ChatSurface({
  prefs,
  className,
  children,
  flat,
}: {
  prefs: ChatPrefs;
  className?: string;
  children: ReactNode;
  flat?: boolean;
}) {
  return (
    <div
      className={cn("chat-surface", flat && "chat-surface--flat", className)}
      style={chatVars(prefs)}
      data-density={prefs.density}
      data-bubble={prefs.bubble_style}
    >
      <div className="chat-wallpaper" style={wallpaperStyle(prefs)} aria-hidden />
      <div className="chat-content">{children}</div>
    </div>
  );
}
