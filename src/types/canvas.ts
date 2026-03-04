import { createContext } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { Step, Section, Stage, Touchpoint, Tool, ToolSection } from "./database";

// Context providing unresolved top-level comment counts (entityId → count) to canvas nodes.
// Canvas views (canvas-view, journey-canvas-view) fetch all workspace comments once and
// provide this context, avoiding prop-drilling through FlowCanvas.
export const CommentCountsContext = createContext<Map<string, number>>(new Map());

// Context providing task completion counts (stepId → { completed, total }) to canvas nodes.
// canvas-view fetches all workspace tasks once, builds this map, and provides it to node components.
export const TaskCountsContext = createContext<Map<string, { completed: number; total: number }>>(new Map());

// Context providing coloring rule tints (stepId → hex color) to canvas step nodes.
// canvas-view evaluates workspace coloring rules against steps and provides this context,
// avoiding prop-drilling through FlowCanvas (same pattern as CommentCountsContext).
export const ColoringTintContext = createContext<Map<string, string>>(new Map());

// Custom node data types for React Flow — Process canvas
export interface StepNodeData extends Record<string, unknown> {
  step: Step;
  selected?: boolean;
  heatMapMode?: boolean;
  annotationColor?: string | null;
}

export interface SectionNodeData extends Record<string, unknown> {
  section: Section;
  averageMaturity: number | null;
  averageTargetMaturity: number | null;
  heatMapMode?: boolean;
  annotationColor?: string | null;
}

export type StepNode = Node<StepNodeData, "step">;
export type SectionNode = Node<SectionNodeData, "section">;
export type CanvasNode = StepNode | SectionNode;
export type CanvasEdge = Edge;

// Custom node data types for React Flow — Journey canvas
export interface StageNodeData extends Record<string, unknown> {
  stage: Stage;
  averagePainScore: number | null;
  heatMapMode?: boolean;
  annotationColor?: string | null;
}

export interface TouchpointNodeData extends Record<string, unknown> {
  touchpoint: Touchpoint;
  selected?: boolean;
  heatMapMode?: boolean;
  annotationColor?: string | null;
}

export type StageNode = Node<StageNodeData, "stage">;
export type TouchpointNode = Node<TouchpointNodeData, "touchpoint">;
export type JourneyCanvasNode = StageNode | TouchpointNode;
export type JourneyCanvasEdge = Edge;

// Custom node data types for React Flow — Tools canvas
export interface ToolNodeData extends Record<string, unknown> {
  tool: Tool;
  selected?: boolean;
}

export interface ToolSectionNodeData extends Record<string, unknown> {
  toolSection: ToolSection;
  onResizeEnd?: (sectionId: string, width: number, height: number) => void;
}

export type ToolNode = Node<ToolNodeData, "tool">;
export type ToolSectionNode = Node<ToolSectionNodeData, "tool-section">;
