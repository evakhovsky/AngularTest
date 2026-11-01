import { Component, afterNextRender, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PrimeTemplate, TreeNode } from 'primeng/api';
import { TreeNodeExpandEvent } from 'primeng/types/tree';
import { Tree } from 'primeng/tree';

import {
  GenealogyChangesApplied,
  GenealogyNode,
} from './genealogy-node';
import { GenealogyDataService } from './genealogy-data.service';

@Component({
  selector: 'genealogy-tree',
  imports: [PrimeTemplate, Tree],
  templateUrl: './genealogy-tree.html',
  styleUrl: './genealogy-tree.css',
})
export class GenealogyTree {
  readonly title = input('Genealogy Tree');
  readonly recordSelected = output<GenealogyNode[]>();

  private readonly genealogyData = inject(GenealogyDataService);
  protected readonly nodes = signal<TreeNode<GenealogyNode>[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly loadedRecords = new Map<number, GenealogyNode>();
  private readonly loadedNodes = new Map<number, TreeNode<GenealogyNode>>();
  private readonly loadedBranches = new Set<number>();

  constructor() {
    this.genealogyData.changesApplied$
      .pipe(takeUntilDestroyed())
      .subscribe((changes) => this.applyChangesToLoadedTree(changes));
    this.genealogyData.databaseReset$
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.loadRoots());

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

    this.genealogyData.getChildren(record).subscribe({
      next: (children) => {
        node.children = children.map((child) => this.toTreeNode(child));
        node.leaf = node.children.length === 0;
        record.hasChildren = node.children.length > 0;
        this.loadedBranches.add(record.recordID);
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
    this.loadedNodes.clear();
    this.loadedBranches.clear();

    this.genealogyData.getRoots().subscribe({
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
    const node: TreeNode<GenealogyNode> = {
      key: String(record.recordID),
      label: `${record.name} (${record.birthYear})`,
      data: record,
      leaf: !record.hasChildren,
      children: [],
    };
    this.loadedNodes.set(record.recordID, node);
    return node;
  }

  private applyChangesToLoadedTree(batch: GenealogyChangesApplied): void {
    const createdIDs = new Map(
      batch.result.createdRecords.map(({ clientRecordID, recordID }) => [
        clientRecordID,
        recordID,
      ]),
    );
    const resolveID = (id: string): number => {
      const parsedID = Number(id);
      return parsedID < 0 ? (createdIDs.get(parsedID) ?? parsedID) : parsedID;
    };
    const deletedIDs = new Set(
      batch.changes
        .filter((change) => change.isDeleted)
        .map((change) => createdIDs.get(change.recordID) ?? change.recordID),
    );

    for (const change of batch.changes) {
      if (change.isNew || change.isDeleted) {
        continue;
      }

      const node = this.loadedNodes.get(change.recordID);
      if (!node?.data) {
        continue;
      }

      node.data.parentID = String(resolveID(change.parentID));
      node.data.name = change.name;
      node.data.birthYear = change.birthYear;
      node.data.generationTitle = change.generationTitle;
      node.label = `${change.name} (${change.birthYear})`;
    }

    const newNodes = new Map<number, TreeNode<GenealogyNode>>();
    for (const change of batch.changes.filter((entry) => entry.isNew)) {
      const recordID = createdIDs.get(change.recordID);
      if (recordID === undefined) {
        continue;
      }

      const hasNewChildren = batch.changes.some(
        (candidate) => candidate.isNew && resolveID(candidate.parentID) === recordID,
      );
      const record: GenealogyNode = {
        recordID,
        parentID: String(resolveID(change.parentID)),
        name: change.name,
        birthYear: change.birthYear,
        generationTitle: change.generationTitle,
        hasChildren: hasNewChildren,
        isDeleted: false,
      };
      newNodes.set(recordID, {
        key: String(recordID),
        label: `${record.name} (${record.birthYear})`,
        data: record,
        expanded: hasNewChildren,
        leaf: !hasNewChildren,
        children: [],
      });
    }

    for (const change of batch.changes.filter((entry) => entry.isNew)) {
      const recordID = createdIDs.get(change.recordID);
      const node = recordID === undefined ? undefined : newNodes.get(recordID);
      if (!node?.data) {
        continue;
      }

      const parentID = Number(node.data.parentID);
      const newParent = newNodes.get(parentID);
      if (newParent) {
        continue;
      }

      const existingParent = this.loadedNodes.get(parentID);
      if (parentID === 0 || (existingParent && this.loadedBranches.has(parentID))) {
        this.registerNewSubtree(node, newNodes);
      }
      if (existingParent?.data) {
        existingParent.data.hasChildren = true;
        existingParent.leaf = false;
      }
    }

    const pendingDeletes = [...deletedIDs];
    while (pendingDeletes.length) {
      const parentID = pendingDeletes.pop();
      if (parentID === undefined) {
        continue;
      }

      for (const node of this.loadedNodes.values()) {
        const childID = node.data?.recordID;
        if (
          childID !== undefined &&
          Number(node.data?.parentID) === parentID &&
          !deletedIDs.has(childID)
        ) {
          deletedIDs.add(childID);
          pendingDeletes.push(childID);
        }
      }
    }

    for (const recordID of deletedIDs) {
      this.loadedNodes.delete(recordID);
      this.loadedRecords.delete(recordID);
      this.loadedBranches.delete(recordID);
    }

    for (const recordID of [...this.loadedBranches]) {
      const parent = this.loadedNodes.get(recordID);
      if (!parent?.data) {
        continue;
      }

      const children = [...this.loadedNodes.values()]
        .filter((node) => Number(node.data?.parentID) === recordID)
        .sort(
          (left, right) =>
            (left.data?.birthYear ?? Number.MAX_SAFE_INTEGER) -
            (right.data?.birthYear ?? Number.MAX_SAFE_INTEGER),
        );
      parent.children = children;
      parent.data.hasChildren = children.length > 0;
      parent.leaf = children.length === 0;
      for (const child of children) {
        child.parent = parent;
      }
    }

    const roots = [...this.loadedNodes.values()]
      .filter((node) => Number(node.data?.parentID) === 0)
      .sort(
        (left, right) =>
          (left.data?.birthYear ?? Number.MAX_SAFE_INTEGER) -
          (right.data?.birthYear ?? Number.MAX_SAFE_INTEGER),
      );
    for (const root of roots) {
      root.parent = undefined;
    }
    this.nodes.set(roots);
  }

  private registerNewSubtree(
    node: TreeNode<GenealogyNode>,
    newNodes: Map<number, TreeNode<GenealogyNode>>,
  ): void {
    const record = node.data;
    if (!record || this.loadedNodes.has(record.recordID)) {
      return;
    }

    this.loadedNodes.set(record.recordID, node);
    this.loadedRecords.set(record.recordID, record);
    for (const child of newNodes.values()) {
      if (Number(child.data?.parentID) === record.recordID) {
        node.children ??= [];
        node.children.push(child);
        node.children.sort(
          (left, right) =>
            (left.data?.birthYear ?? Number.MAX_SAFE_INTEGER) -
            (right.data?.birthYear ?? Number.MAX_SAFE_INTEGER),
        );
        child.parent = node;
        this.loadedBranches.add(record.recordID);
        this.registerNewSubtree(child, newNodes);
      }
    }
  }
}
