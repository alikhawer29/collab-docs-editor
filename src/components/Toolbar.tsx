"use client";

import type { ReactNode } from "react";
import type { Editor } from "@tiptap/react";

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="tool"
      aria-pressed={active}
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Toolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const run = (command: () => void) => {
    if (!disabled) command();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-2">
      <ToolButton label="Bold (Ctrl or Cmd+B)" active={editor.isActive("bold")} disabled={disabled} onClick={() => run(() => editor.chain().focus().toggleBold().run())}>
        B
      </ToolButton>
      <ToolButton label="Italic (Ctrl or Cmd+I)" active={editor.isActive("italic")} disabled={disabled} onClick={() => run(() => editor.chain().focus().toggleItalic().run())}>
        <span className="italic">I</span>
      </ToolButton>
      <ToolButton label="Underline (Ctrl or Cmd+U)" active={editor.isActive("underline")} disabled={disabled} onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}>
        <span className="underline">U</span>
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
      <ToolButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} disabled={disabled} onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}>
        H1
      </ToolButton>
      <ToolButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} disabled={disabled} onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}>
        H2
      </ToolButton>
      <ToolButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} disabled={disabled} onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}>
        H3
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
      <ToolButton label="Bulleted list" active={editor.isActive("bulletList")} disabled={disabled} onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}>
        List
      </ToolButton>
      <ToolButton label="Numbered list" active={editor.isActive("orderedList")} disabled={disabled} onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}>
        1. List
      </ToolButton>
    </div>
  );
}
