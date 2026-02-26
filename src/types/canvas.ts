import type { Node, Edge } from "@xyflow/react";
import type { Step, Section, Stage, Touchpoint } from "./database";

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
