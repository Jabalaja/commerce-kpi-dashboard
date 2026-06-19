/// <reference types="vite/client" />

declare module 'elkjs/lib/elk.bundled.js' {
  export interface ElkNode {
    id: string;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    children?: ElkNode[];
    edges?: ElkExtendedEdge[];
    layoutOptions?: Record<string, string>;
  }
  export interface ElkExtendedEdge {
    id: string;
    sources: string[];
    targets: string[];
  }
  export default class ELK {
    constructor(options?: unknown);
    layout(graph: ElkNode): Promise<ElkNode>;
  }
}
