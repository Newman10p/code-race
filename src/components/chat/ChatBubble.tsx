import { ReactNode } from "react";
import { initials } from "@/lib/chat-theme";
import { cn } from "@/lib/utils";

export function ChatAvatar({ name, mine }: { name?: string | null; mine?: boolean }) {
  return (
    <span className={cn("chat-avatar", mine && "chat-avatar--mine")} aria-hidden>
      {initials(name)}
    </span>
  );
}

/**
 * A premium chat bubble: avatar, sender line, tail, and hover actions.
 */
export function ChatBubble({
  mine,
  name,
  meta,
  time,
  children,
  actions,
  footer,
  reply,
  wide,
}: {
  mine: boolean;
  name?: string | null;
  meta?: ReactNode;
  time?: string;
  children: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  reply?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("chat-row group", mine && "chat-row--mine")}>
      <ChatAvatar name={name} mine={mine} />
      <div className={cn("chat-col", wide && "chat-col--wide")}>
        <div className="chat-meta">
          <span className="chat-name">{mine ? "You" : name || "Student"}</span>
          {meta}
          {time && <time className="chat-time">{time}</time>}
        </div>
        <div className={cn("chat-bubble", mine ? "chat-bubble--mine" : "chat-bubble--other")}>
          {reply}
          {children}
        </div>
        {footer && <div className="chat-footer">{footer}</div>}
      </div>
      {actions && <div className="chat-actions">{actions}</div>}
    </div>
  );
}
