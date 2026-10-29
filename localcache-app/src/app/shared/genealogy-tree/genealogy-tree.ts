import { Component, afterNextRender, effect, input, output, signal } from '@angular/core';
import { PrimeTemplate, TreeNode } from 'primeng/api';
import { TreeNodeExpandEvent } from 'primeng/types/tree';
import { Tree } from 'primeng/tree';

import { GenealogyNode, GenealogyDataSource } from './genealogy-node';

@Component({
  selector: 'genealogy-tree',
  imports: [PrimeTemplate, Tree],
  templateUrl: './genealogy-tree.html',
  styleUrl: './genealogy-tree.css',
})
export class GenealogyTree {
  readonly dataSource = input.required<GenealogyDataSource>();
  readonly title = input('Genealogy Tree');
  readonly reloadVersion = input(0);
  readonly recordSelected = output<GenealogyNode[]>();

  protected readonly nodes = signal<TreeNode<GenealogyNode>[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private lastReloadVersion: number | null = null;
  private readonly loadedRecords = new Map<number, GenealogyNode>();

  constructor() {
    effect(() => {
      const version = this.reloadVersion();
      if (this.lastReloadVersion === null) {
        this.lastReloadVersion = version;
      } else if (this.lastReloadVersion !== version) {
        this.lastReloadVersion = version;
        this.loadRoots();
      }
    });

    afterNextRender(() => this.loadRoots());
  }

  protected onNodeExpand(event: TreeNodeExpandEvent): void {
    const node = event.node as TreeNode<GenealogyNode>;
    const record = node.data;
    if (!record || node.children?.length) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.dataSource().getChildren(record).subscribe({
      next: (children) => {
        node.children = children.map((child) => this.toTreeNode(child));
        node.leaf = node.children.length === 0;
        record.hasChildren = node.children.length > 0;
        this.nodes.update((nodes) => [...nodes]);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load children');
        this.loading.set(false);
      },
    });
  }

  protected selectNode(node: TreeNode<GenealogyNode>): void {
    const recordID = node.data?.recordID;
    if (recordID === undefined) {
      return;
    }

    const path = this.findPath(recordID) ?? this.pathFromNode(node);
    if (path) {
      this.recordSelected.emit(path);
    }
  }

  private loadRoots(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadedRecords.clear();

    this.dataSource().getRoots().subscribe({
      next: (roots) => {
        this.nodes.set(roots.map((root) => this.toTreeNode(root)));
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load tree');
        this.loading.set(false);
      },
    });
  }

  private findPath(recordID: number): GenealogyNode[] | null {
    let record = this.loadedRecords.get(recordID);
    if (!record) {
      return null;
    }

    const path = [record];
    const visited = new Set<number>([recordID]);
    while (Number(record.parentID) > 0) {
      const parentID = Number(record.parentID);
      if (visited.has(parentID)) {
        return null;
      }

      const parent = this.loadedRecords.get(parentID);
      if (!parent) {
        break;
      }

      visited.add(parentID);
      path.unshift(parent);
      record = parent;
    }

    return path;
  }

  private pathFromNode(node: TreeNode<GenealogyNode>): GenealogyNode[] | null {
    const path: GenealogyNode[] = [];
    let current: TreeNode<GenealogyNode> | undefined = node;
    while (current?.data) {
      path.unshift(current.data);
      current = current.parent;
    }

    return path.length ? path : null;
  }

  private toTreeNode(record: GenealogyNode): TreeNode<GenealogyNode> {
    this.loadedRecords.set(record.recordID, record);
    return {
      key: String(record.recordID),
      label: `${record.name} (${record.birthYear})`,
      data: record,
      leaf: !record.hasChildren,
      children: [],
    };
  }
}
