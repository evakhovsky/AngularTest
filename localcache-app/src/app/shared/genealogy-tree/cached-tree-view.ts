import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate, TreeNode } from 'primeng/api';
import { Tree } from 'primeng/tree';

import {
  GenealogyChange,
  GenealogyChangesApplied,
  GenealogyNode,
} from './genealogy-node';
import { GenealogyDataService } from './genealogy-data.service';

interface CachedTreeEntry extends Omit<GenealogyNode, 'birthYear'> {
  birthYear: number | null;
  isContext: boolean;
  isNew: boolean;
}

@Component({
  selector: 'cached-tree-view',
  imports: [FormsModule, PrimeTemplate, Tree],
  templateUrl: './cached-tree-view.html',
  styleUrl: './cached-tree-view.css',
})
export class CachedTreeView {
  readonly selectionPath = input<GenealogyNode[]>([]);

  private readonly genealogyData = inject(GenealogyDataService);
  protected readonly applying = signal(false);
  protected readonly resetting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly confirmReset = signal(false);
  private readonly version = signal(0);
  private readonly entries = new Map<number, CachedTreeEntry>();
  private readonly contextRecords = new Map<number, GenealogyNode>();
  private readonly originals = new Map<
    number,
    Pick<GenealogyNode, 'parentID' | 'name' | 'birthYear' | 'generationTitle'>
  >();
  private nextTemporaryId = -1;

  protected readonly treeNodes = computed(() => {
    this.version();
    return this.buildTree();
  });

  protected readonly changedCount = computed(() => {
    this.version();
    return [...this.entries.values()].filter(
      (entry) => this.isChanged(entry) && !this.isSuppressedByDeletedAncestor(entry),
    ).length;
  });

  constructor() {
    effect(() => this.cacheSelectedPath(this.selectionPath()));
  }

  protected addChild(parent: CachedTreeEntry): void {
    this.addNewEntry(String(parent.recordID));
  }

  protected addSibling(sibling: CachedTreeEntry): void {
    this.addNewEntry(sibling.parentID);
  }

  protected removeFromCache(entry: CachedTreeEntry): void {
    if (entry.isContext || this.applying() || this.resetting()) {
      return;
    }

    this.removeEntry(entry);
    this.error.set(null);
    this.message.set(null);
    this.touch();
  }

  protected toggleDeleted(entry: CachedTreeEntry): void {
    if (entry.isContext) {
      return;
    }

    if (entry.isNew) {
      this.removeEntry(entry);
    } else {
      entry.isDeleted = !entry.isDeleted;
    }

    this.touch();
  }

  protected onFieldChanged(): void {
    this.touch();
  }

  protected isChanged(entry: CachedTreeEntry): boolean {
    if (entry.isContext) {
      return false;
    }
    if (entry.isNew || entry.isDeleted) {
      return true;
    }

    const original = this.originals.get(entry.recordID);
    return !!original && (
      entry.parentID !== original.parentID ||
      entry.name !== original.name ||
      entry.birthYear !== original.birthYear ||
      entry.generationTitle !== original.generationTitle
    );
  }

  protected isMarkedForDeletion(entry: CachedTreeEntry): boolean {
    return entry.isDeleted || this.isSuppressedByDeletedAncestor(entry);
  }

  protected applyChanges(): void {
    if (this.applying() || this.resetting()) {
      return;
    }

    const changes: GenealogyChange[] = [...this.entries.values()]
      .filter(
        (entry) => this.isChanged(entry) && !this.isSuppressedByDeletedAncestor(entry),
      )
      .map((entry) => ({
        recordID: entry.recordID,
        parentID: entry.parentID,
        name: entry.name.trim(),
        birthYear: entry.birthYear ?? 0,
        generationTitle: entry.generationTitle.trim(),
        isNew: entry.isNew,
        isDeleted: entry.isDeleted,
      }));

    const invalidEntry = changes.find(
      (entry) => !entry.isDeleted &&
        (!entry.name || !Number.isInteger(entry.birthYear)),
    );
    if (invalidEntry) {
      this.error.set(
        `Enter a name and whole-number birth year for ${invalidEntry.name || 'each new or edited entry'}.`,
      );
      return;
    }

    if (!changes.length) {
      this.message.set('There are no staged changes to apply.');
      this.error.set(null);
      return;
    }

    this.applying.set(true);
    this.error.set(null);
    this.message.set(null);

    this.genealogyData.applyChanges({ nodes: changes }).subscribe({
      next: (result) => {
        this.applying.set(false);
        if (!result.success) {
          this.error.set(result.message || 'Failed to apply staged changes.');
          return;
        }

        this.clearCache();
        this.message.set(result.message || 'Staged changes applied.');
        this.genealogyData.notifyChangesApplied({ changes, result });
      },
      error: (err: unknown) => {
        this.applying.set(false);
        this.error.set(this.errorMessage(err, 'Failed to apply staged changes.'));
      },
    });
  }

  protected discardChanges(): void {
    if (this.applying() || this.resetting()) {
      return;
    }

    this.clearCache();
    this.message.set('Staged changes discarded.');
    this.error.set(null);
  }

  protected resetDatabase(): void {
    if (!this.confirmReset()) {
      this.confirmReset.set(true);
      return;
    }

    this.resetting.set(true);
    this.error.set(null);
    this.message.set(null);

    this.genealogyData.reset().subscribe({
      next: (result) => {
        this.resetting.set(false);
        this.confirmReset.set(false);
        if (!result.success) {
          this.error.set(result.message || 'Failed to reset the genealogy tree.');
          return;
        }

        this.clearCache();
        this.message.set(result.message || 'The genealogy tree was reset.');
        this.genealogyData.notifyDatabaseReset();
      },
      error: (err: unknown) => {
        this.resetting.set(false);
        this.error.set(this.errorMessage(err, 'Failed to reset the genealogy tree.'));
      },
    });
  }

  protected cancelReset(): void {
    this.confirmReset.set(false);
  }

  private cacheSelectedPath(path: GenealogyNode[]): void {
    if (!path.length) {
      return;
    }

    for (const record of path.slice(0, -1)) {
      if (!this.entries.has(record.recordID)) {
        this.contextRecords.set(record.recordID, record);
      }
    }

    const selected = path[path.length - 1];
    if (!this.entries.has(selected.recordID)) {
      this.entries.set(selected.recordID, {
        ...selected,
        isContext: false,
        isNew: false,
      });
      this.originals.set(selected.recordID, {
        parentID: selected.parentID,
        name: selected.name,
        birthYear: selected.birthYear,
        generationTitle: selected.generationTitle,
      });
    }

    this.error.set(null);
    this.message.set(null);
    this.touch();
  }

  private addNewEntry(parentID: string): void {
    const recordID = this.nextTemporaryId--;
    const entry: CachedTreeEntry = {
      recordID,
      parentID,
      name: '',
      birthYear: null,
      generationTitle: '',
      hasChildren: false,
      isDeleted: false,
      isContext: false,
      isNew: true,
    };

    this.entries.set(recordID, entry);
    this.error.set(null);
    this.message.set(null);
    this.touch();
  }

  private isSuppressedByDeletedAncestor(entry: CachedTreeEntry): boolean {
    let parentID = Number(entry.parentID);
    const visited = new Set<number>([entry.recordID]);

    while (parentID > 0 && !visited.has(parentID)) {
      visited.add(parentID);
      const parentEntry = this.entries.get(parentID);
      if (parentEntry?.isDeleted) {
        return true;
      }

      const parentContext = this.contextRecords.get(parentID);
      parentID = Number(parentEntry?.parentID ?? parentContext?.parentID ?? 0);
    }

    return false;
  }

  private removeEntry(entry: CachedTreeEntry): void {
    if (entry.isNew) {
      for (const child of this.entries.values()) {
        if (child.parentID === String(entry.recordID)) {
          child.parentID = entry.parentID;
        }
      }
    } else {
      const original = this.originals.get(entry.recordID);
      if (original) {
        this.contextRecords.set(entry.recordID, {
          recordID: entry.recordID,
          ...original,
          hasChildren: entry.hasChildren,
          isDeleted: false,
        });
      }
    }

    this.entries.delete(entry.recordID);
    this.originals.delete(entry.recordID);
    this.pruneContextRecords();
  }

  private pruneContextRecords(): void {
    const required = new Set<number>();

    for (const entry of this.entries.values()) {
      let parentID = Number(entry.parentID);
      const visited = new Set<number>([entry.recordID]);

      while (parentID > 0 && !visited.has(parentID)) {
        visited.add(parentID);
        const parentEntry = this.entries.get(parentID);
        if (parentEntry) {
          parentID = Number(parentEntry.parentID);
          continue;
        }

        const context = this.contextRecords.get(parentID);
        if (context) {
          required.add(parentID);
          parentID = Number(context.parentID);
          continue;
        }

        break;
      }
    }

    for (const recordID of this.contextRecords.keys()) {
      if (!required.has(recordID)) {
        this.contextRecords.delete(recordID);
      }
    }
  }

  private clearCache(): void {
    this.entries.clear();
    this.contextRecords.clear();
    this.originals.clear();
    this.nextTemporaryId = -1;
    this.confirmReset.set(false);
    this.touch();
  }

  private touch(): void {
    this.version.update((version) => version + 1);
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body: unknown = error.error;
      if (
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof body.message === 'string'
      ) {
        return body.message;
      }
    }

    return error instanceof Error ? error.message : fallback;
  }

  private buildTree(): TreeNode<CachedTreeEntry>[] {
    const records = new Map<number, CachedTreeEntry>();

    for (const [recordID, record] of this.contextRecords) {
      if (!this.entries.has(recordID)) {
        records.set(recordID, {
          ...record,
          isContext: true,
          isNew: false,
        });
      }
    }
    for (const [recordID, entry] of this.entries) {
      records.set(recordID, entry);
    }

    for (const entry of [...records.values()]) {
      const parentID = Number(entry.parentID);
      if (parentID > 0 && !records.has(parentID)) {
        records.set(parentID, {
          recordID: parentID,
          parentID: '0',
          name: `Record ${parentID}`,
          birthYear: null,
          generationTitle: '',
          hasChildren: true,
          isDeleted: false,
          isContext: true,
          isNew: false,
        });
      }
    }

    const treeNodes = new Map<number, TreeNode<CachedTreeEntry>>();
    for (const entry of records.values()) {
      treeNodes.set(entry.recordID, {
        key: String(entry.recordID),
        label: entry.isContext
          ? '...'
          : `${entry.name} (${entry.birthYear ?? 'year needed'})`,
        data: entry,
        expanded: true,
        leaf: true,
        children: [],
      });
    }

    const sourceChildren = new Map<number, TreeNode<CachedTreeEntry>[]>();
    const roots: TreeNode<CachedTreeEntry>[] = [];
    for (const entry of records.values()) {
      const node = treeNodes.get(entry.recordID);
      if (!node) {
        continue;
      }

      const parentID = Number(entry.parentID);
      const parent = treeNodes.get(parentID);
      if (parent && parent !== node) {
        const children = sourceChildren.get(parentID) ?? [];
        children.push(node);
        sourceChildren.set(parentID, children);
      } else {
        roots.push(node);
      }
    }

    const projectedRoots: TreeNode<CachedTreeEntry>[] = [];
    const project = (
      node: TreeNode<CachedTreeEntry>,
      visibleParent: TreeNode<CachedTreeEntry> | null,
      gapNode: TreeNode<CachedTreeEntry> | null,
      visited: Set<number>,
    ): void => {
      const entry = node.data;
      if (!entry || visited.has(entry.recordID)) {
        return;
      }

      const nextVisited = new Set(visited);
      nextVisited.add(entry.recordID);
      let nextParent = visibleParent;
      let nextGap = gapNode;

      if (entry.isContext) {
        if (!nextGap) {
          nextGap = node;
          if (visibleParent) {
            visibleParent.children ??= [];
            visibleParent.children.push(node);
            visibleParent.leaf = false;
          } else {
            projectedRoots.push(node);
          }
          nextParent = node;
        }
      } else {
        if (visibleParent) {
          visibleParent.children ??= [];
          visibleParent.children.push(node);
          visibleParent.leaf = false;
        } else {
          projectedRoots.push(node);
        }
        nextParent = node;
        nextGap = null;
      }

      for (const child of sourceChildren.get(entry.recordID) ?? []) {
        project(child, nextParent, nextGap, nextVisited);
      }
    };

    for (const root of roots) {
      project(root, null, null, new Set<number>());
    }

    const sortNodes = (nodes: TreeNode<CachedTreeEntry>[]): void => {
      nodes.sort((left, right) =>
        (left.data?.birthYear ?? Number.MAX_SAFE_INTEGER) -
        (right.data?.birthYear ?? Number.MAX_SAFE_INTEGER),
      );
      for (const node of nodes) {
        sortNodes(node.children ?? []);
      }
    };
    sortNodes(projectedRoots);
    return projectedRoots;
  }
}
