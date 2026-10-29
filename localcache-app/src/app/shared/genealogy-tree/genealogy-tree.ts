import { Component, afterNextRender, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate, TreeNode } from 'primeng/api';
import { TreeNodeExpandEvent } from 'primeng/types/tree';
import { Tree } from 'primeng/tree';

import { GenealogyNode, GenealogyTreeDataSource } from './genealogy-node';

@Component({
  selector: 'genealogy-tree',
  imports: [FormsModule, PrimeTemplate, Tree],
  templateUrl: './genealogy-tree.html',
  styleUrl: './genealogy-tree.css',
})
export class GenealogyTree {
  readonly dataSource = input.required<GenealogyTreeDataSource>();
  readonly title = input('Genealogy Tree');

  protected readonly nodes = signal<TreeNode<GenealogyNode>[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editingRecordId = signal<number | null>(null);
  protected readonly addingChildToId = signal<number | null>(null);
  protected readonly confirmDeleteId = signal<number | null>(null);
  protected readonly savingRecordId = signal<number | null>(null);
  protected readonly savingOperation = signal<'update' | 'create' | 'delete' | null>(null);
  protected draft = { name: '', birthYear: 0, generationTitle: '' };
  protected childDraft: { name: string; birthYear: number | null; generationTitle: string } = {
    name: '',
    birthYear: null,
    generationTitle: '',
  };

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
        record.hasChildren = mapped.length > 0;
        this.nodes.update((nodes) => [...nodes]);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to load children');
        this.loading.set(false);
      },
    });
  }

  protected beginEdit(node: TreeNode<GenealogyNode>): void {
    const record = node.data;
    if (!record || this.savingRecordId() !== null) {
      return;
    }

    this.draft = {
      name: record.name,
      birthYear: record.birthYear,
      generationTitle: record.generationTitle,
    };
    this.editingRecordId.set(record.recordID);
    this.error.set(null);
  }

  protected cancelEdit(): void {
    if (this.savingRecordId() === null) {
      this.editingRecordId.set(null);
    }
  }

  protected beginAddChild(node: TreeNode<GenealogyNode>): void {
    const record = node.data;
    if (!record || this.savingRecordId() !== null) {
      return;
    }

    this.childDraft = { name: '', birthYear: null, generationTitle: '' };
    this.addingChildToId.set(record.recordID);
    this.confirmDeleteId.set(null);
    this.error.set(null);
  }

  protected cancelAddChild(): void {
    if (this.savingRecordId() === null) {
      this.addingChildToId.set(null);
    }
  }

  protected saveChild(node: TreeNode<GenealogyNode>): void {
    const parent = node.data;
    if (!parent || this.savingRecordId() !== null) {
      return;
    }

    const child = { ...this.childDraft, name: this.childDraft.name.trim() };
    if (!child.name) {
      this.error.set('Name is required');
      return;
    }
    if (child.birthYear === null || !Number.isInteger(child.birthYear)) {
      this.error.set('Birth year must be a whole number');
      return;
    }
    const newChild = {
      name: child.name,
      birthYear: child.birthYear,
      generationTitle: child.generationTitle,
    };

    this.savingRecordId.set(parent.recordID);
    this.savingOperation.set('create');
    this.error.set(null);

    this.dataSource().createChild(String(parent.recordID), newChild).subscribe({
      next: (result) => {
        if (!result.success) {
          this.error.set(result.message || 'Failed to add child');
          this.savingRecordId.set(null);
          this.savingOperation.set(null);
          return;
        }

        parent.hasChildren = true;
        node.leaf = false;
        this.addingChildToId.set(null);
        this.loading.set(true);

        this.dataSource().getChildren(parent).subscribe({
          next: (children) => {
            node.children = children.map((record) => this.toTreeNode(record));
            parent.hasChildren = node.children.length > 0;
            node.leaf = !parent.hasChildren;
            this.nodes.update((nodes) => [...nodes]);
            this.loading.set(false);
            this.savingRecordId.set(null);
            this.savingOperation.set(null);
          },
          error: (err: unknown) => {
            this.error.set(
              err instanceof Error
                ? `Child added, but failed to refresh children: ${err.message}`
                : 'Child added, but failed to refresh children',
            );
            this.loading.set(false);
            this.savingRecordId.set(null);
            this.savingOperation.set(null);
          },
        });
      },
      error: (err: unknown) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to add child');
        this.savingRecordId.set(null);
        this.savingOperation.set(null);
      },
    });
  }

  protected requestDelete(node: TreeNode<GenealogyNode>): void {
    if (!node.data || this.savingRecordId() !== null) {
      return;
    }

    this.confirmDeleteId.set(node.data.recordID);
    this.addingChildToId.set(null);
    this.editingRecordId.set(null);
    this.error.set(null);
  }

  protected cancelDelete(): void {
    if (this.savingRecordId() === null) {
      this.confirmDeleteId.set(null);
    }
  }

  protected deleteNode(node: TreeNode<GenealogyNode>): void {
    const record = node.data;
    if (!record || this.savingRecordId() !== null) {
      return;
    }

    this.savingRecordId.set(record.recordID);
    this.savingOperation.set('delete');
    this.error.set(null);

    this.dataSource().deleteRecord(record.recordID).subscribe({
      next: (result) => {
        this.savingRecordId.set(null);
        this.savingOperation.set(null);
        if (!result.success) {
          this.error.set(result.message || 'Failed to delete record');
          return;
        }

        this.nodes.update((nodes) => this.removeNode(nodes, record.recordID));
        this.confirmDeleteId.set(null);
      },
      error: (err: unknown) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to delete record');
        this.savingRecordId.set(null);
        this.savingOperation.set(null);
      },
    });
  }

  protected saveChanges(node: TreeNode<GenealogyNode>): void {
    const record = node.data;
    if (!record || this.savingRecordId() !== null) {
      return;
    }

    const changes = { ...this.draft, name: this.draft.name.trim() };
    if (!changes.name) {
      this.error.set('Name is required');
      return;
    }

    this.savingRecordId.set(record.recordID);
    this.savingOperation.set('update');
    this.error.set(null);

    this.dataSource().updateRecord(record.recordID, changes).subscribe({
      next: (result) => {
        this.savingRecordId.set(null);
        this.savingOperation.set(null);
        if (!result.success) {
          this.error.set(result.message || 'Failed to save changes');
          return;
        }

        node.data = { ...record, ...changes };
        node.label = `${changes.name} (${changes.birthYear})`;
        this.nodes.update((nodes) => [...nodes]);
        this.editingRecordId.set(null);
      },
      error: (err: unknown) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to save changes');
        this.savingRecordId.set(null);
        this.savingOperation.set(null);
      },
    });
  }

  protected operationStatus(): string {
    switch (this.savingOperation()) {
      case 'update':
        return 'Saving changes...';
      case 'create':
        return 'Adding child...';
      case 'delete':
        return 'Deleting record...';
      default:
        return '';
    }
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

  private removeNode(
    nodes: TreeNode<GenealogyNode>[],
    recordID: number,
  ): TreeNode<GenealogyNode>[] {
    return nodes
      .filter((node) => node.data?.recordID !== recordID)
      .map((node) => {
        if (!node.children) {
          return node;
        }

        const children = this.removeNode(node.children, recordID);
        if (children.length === node.children.length) {
          return node;
        }

        const hasChildren = children.length > 0;
        return {
          ...node,
          data: node.data ? { ...node.data, hasChildren } : node.data,
          children,
          leaf: !hasChildren,
        };
      });
  }
}
