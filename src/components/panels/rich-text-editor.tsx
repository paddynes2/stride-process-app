"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
      }),
      Placeholder.configure({
        placeholder: "Add notes...",
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none min-h-[120px] px-3 py-2 text-[13px] text-[var(--text-secondary)] focus:outline-none " +
          "bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] " +
          "hover:border-[var(--border-hover)] focus-within:border-[var(--signal)]",
      },
    },
    onUpdate: ({ editor }) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const html = editor.getHTML();
        onChange(html === "<p></p>" ? "" : html);
      }, 500);
    },
  });

  // Sync external content changes (e.g., switching steps)
  React.useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor]);

  return <EditorContent editor={editor} />;
}
