import type { Node, Edge } from "@xyflow/react";
import type { Step, Section } from "./database";

// Custom node data types for React Flow
export interface StepNodeData extends Record<string, unknown> {
  step: Step;
  selected?: boolean;
}

export interface SectionNodeData extends Record<string, unknown> {
  section: Section;
}

export type StepNode = Node<StepNodeData, "step">;
export type SectionNode = Node<SectionNodeData, "section">;
export type CanvasNode = StepNode | SectionNode;
export type CanvasEdge = Edge;
