import { Component, afterNextRender, input, signal } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { TreeNodeExpandEvent } from 'primeng/types/tree';
import { Tree } from 'primeng/tree';

import { GenealogyNode, GenealogyTreeDataSource } from './genealogy-node';

@Component({
  selector: 'genealogy-tree',
  imports: [Tree],
  templateUrl: './genealogy-tree.html',
  styleUrl: './genealogy-tree.css',
})
export class GenealogyTree {
  readonly dataSource = input.required<GenealogyTreeDataSource>();
  readonly title = input('Genealogy Tree');

  protected readonly nodes = signal<TreeNode<GenealogyNode>[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    afterNextRender(() => this.loadRoots());
  }

  protected onNodeExpand(event: TreeNodeExpandEvent): void {
    const node = event.node as TreeNode<GenealogyNode>;
    if (node.children?.length) {
      return;
    }

    const record = node.data;
    if (!record) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.dataSource().getChildren(record).subscribe({
      next: (children) => {
        const mapped = children.map((child) => this.toTreeNode(child));
        node.children = mapped;
        node.leaf = mapped.length === 0;
        this.nodes.update((nodes) => [...nodes]);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to load children');
        this.loading.set(false);
      },
    });
  }

  private loadRoots(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dataSource().getRoots().subscribe({
      next: (roots) => {
        this.nodes.set(roots.map((root) => this.toTreeNode(root)));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to load tree');
        this.loading.set(false);
      },
    });
  }

  private toTreeNode(record: GenealogyNode): TreeNode<GenealogyNode> {
    return {
      key: String(record.recordID),
      label: `${record.name} (${record.birthYear})`,
      data: record,
      leaf: !record.hasChildren,
      children: [],
    };
  }
}
