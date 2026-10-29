import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { GenealogyNode, GenealogyTreeDataSource } from '../shared/genealogy-tree/genealogy-node';
import { GenealogyTree } from '../shared/genealogy-tree/genealogy-tree';

@Component({
  selector: 'db-tree-view',
  imports: [GenealogyTree],
  template: `<genealogy-tree title="Genealogy Tree" [dataSource]="dataSource" />`,
})
export class DBTreeView {
  private readonly http = inject(HttpClient);

  protected readonly dataSource: GenealogyTreeDataSource = {
    getRoots: () => this.http.get<GenealogyNode[]>('/api/genealogy/roots'),
    getChildren: (parent) =>
      this.http.get<GenealogyNode[]>(`/api/genealogy/${parent.recordID}/children`),
    createChild: (parentID, child) =>
      this.http.post<{ success: boolean; message: string }>('/api/genealogy', {
        parentID,
        ...child,
      }),
    deleteRecord: (recordID) =>
      this.http.delete<{ success: boolean; message: string }>(
        `/api/genealogy/${recordID}`,
      ),
    updateRecord: (recordID, changes) =>
      this.http.patch<{ success: boolean; message: string }>(
        `/api/genealogy/${recordID}`,
        changes,
      ),
  };
}
