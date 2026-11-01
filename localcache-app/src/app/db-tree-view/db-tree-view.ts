import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  GenealogyActionResult,
  GenealogyApplyResult,
  GenealogyChangeSet,
  GenealogyChangesApplied,
  GenealogyNode,
  GenealogyDataSource,
} from '../shared/genealogy-tree/genealogy-node';
import { CachedTreeView } from '../shared/genealogy-tree/cached-tree-view';
import { GenealogyTree } from '../shared/genealogy-tree/genealogy-tree';

@Component({
  selector: 'db-tree-view',
  imports: [CachedTreeView, GenealogyTree],
  template: `
    <genealogy-tree
      title="Database Tree View"
      [dataSource]="dataSource"
      [reloadVersion]="reloadVersion()"
      [appliedChanges]="appliedChanges()"
      (recordSelected)="onRecordSelected($event)"
    />
    <cached-tree-view
      [dataSource]="dataSource"
      [selectionPath]="selectedPath()"
      (changesApplied)="onChangesApplied($event)"
      (databaseReset)="onDatabaseReset()"
    />
  `,
})
export class DBTreeView {
  private readonly http = inject(HttpClient);

  protected readonly selectedPath = signal<GenealogyNode[]>([]);
  protected readonly reloadVersion = signal(0);
  protected readonly appliedChanges = signal<GenealogyChangesApplied | null>(null);

  protected readonly dataSource: GenealogyDataSource = {
    getRoots: () => this.http.get<GenealogyNode[]>('/api/genealogy/roots'),
    getChildren: (parent: GenealogyNode) =>
      this.http.get<GenealogyNode[]>(`/api/genealogy/${parent.recordID}/children`),
    applyChanges: (changes: GenealogyChangeSet) =>
      this.http.post<GenealogyApplyResult>('/api/genealogy/changes', changes),
    reset: () => this.http.post<GenealogyActionResult>('/api/genealogy/reset', {}),
  };

  protected onRecordSelected(path: GenealogyNode[]): void {
    this.selectedPath.set(path);
  }

  protected onChangesApplied(changes: GenealogyChangesApplied): void {
    this.selectedPath.set([]);
    this.appliedChanges.set(changes);
  }

  protected onDatabaseReset(): void {
    this.selectedPath.set([]);
    this.appliedChanges.set(null);
    this.reloadVersion.update((version) => version + 1);
  }
}
