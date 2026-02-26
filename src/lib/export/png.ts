import { toPng } from "html-to-image";

interface ExportPngOptions {
  canvasElement: HTMLElement;
  workspaceName: string;
}

export async function exportCanvasPng({
  canvasElement,
  workspaceName,
}: ExportPngOptions): Promise<void> {
  const dataUrl = await toPng(canvasElement, {
    backgroundColor: "#0a0a0b",
    pixelRatio: 2,
    filter: (node) => {
      // Exclude React Flow controls, minimap, and toolbar panels from snapshot
      if (node instanceof HTMLElement) {
        const classList = node.classList;
        if (
          classList?.contains("react-flow__controls") ||
          classList?.contains("react-flow__minimap") ||
          classList?.contains("react-flow__panel")
        ) {
          return false;
        }
      }
      return true;
    },
  });

  const safeFilename = workspaceName
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "-");
  const link = document.createElement("a");
  link.download = `${safeFilename}-canvas.png`;
  link.href = dataUrl;
  link.click();
}
