import { Observable } from 'rxjs';

export interface GenealogyNode {
  recordID: number;
  parentID: string;
  name: string;
  birthYear: number;
  generationTitle: string;
  hasChildren: boolean;
}

export interface GenealogyTreeDataSource {
  getRoots(): Observable<GenealogyNode[]>;
  getChildren(parent: GenealogyNode): Observable<GenealogyNode[]>;
}
