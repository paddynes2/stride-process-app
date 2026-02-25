"use client";

import * as React from "react";
import { Video, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface VideoEmbedProps {
  url: string | null;
  onChange: (url: string | null) => void;
}

function parseEmbedUrl(url: string): string | null {
  try {
    const trimmed = url.trim();
    if (!trimmed) return null;

    // Loom: https://www.loom.com/share/xxx → https://www.loom.com/embed/xxx
    const loomMatch = trimmed.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;

    // YouTube: https://youtube.com/watch?v=xxx or https://www.youtube.com/watch?v=xxx
    const ytMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

    // Already an embed URL
    if (trimmed.includes("/embed/")) return trimmed;

    return null;
  } catch {
    return null;
  }
}

export function VideoEmbed({ url, onChange }: VideoEmbedProps) {
  const [inputValue, setInputValue] = React.useState(url ?? "");
  const embedUrl = url ? parseEmbedUrl(url) : null;

  React.useEffect(() => {
    setInputValue(url ?? "");
  }, [url]);

  const handleSave = () => {
    const trimmed = inputValue.trim();
    onChange(trimmed || null);
  };

  const handleClear = () => {
    setInputValue("");
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Paste Loom or YouTube URL"
          leftElement={<Video className="h-3.5 w-3.5" />}
        />
        {url && (
          <Button variant="ghost" size="icon-sm" onClick={handleClear}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {embedUrl && (
        <div className="rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-subtle)]">
          <iframe
            src={embedUrl}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video embed"
          />
        </div>
      )}
    </div>
  );
}
