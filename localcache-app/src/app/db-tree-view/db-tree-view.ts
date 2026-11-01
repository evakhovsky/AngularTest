import { Component, signal } from '@angular/core';

import { GenealogyNode } from '../shared/genealogy-tree/genealogy-node';
import { CachedTreeView } from '../shared/genealogy-tree/cached-tree-view';
import { GenealogyDataService } from '../shared/genealogy-tree/genealogy-data.service';
import { GenealogyTree } from '../shared/genealogy-tree/genealogy-tree';

@Component({
  selector: 'db-tree-view',
  imports: [CachedTreeView, GenealogyTree],
  providers: [GenealogyDataService],
  template: `
    <genealogy-tree
      title="Database Tree View"
      (recordSelected)="onRecordSelected($event)"
    />
    <cached-tree-view
      [selectionPath]="selectedPath()"
    />
  `,
})
export class DBTreeView {
  protected readonly selectedPath = signal<GenealogyNode[]>([]);

  protected onRecordSelected(path: GenealogyNode[]): void {
    this.selectedPath.set(path);
  }
}
