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
  createChild(
    parentID: string,
    child: Pick<GenealogyNode, 'name' | 'birthYear' | 'generationTitle'>,
  ): Observable<GenealogyActionResult>;
  deleteRecord(recordID: number): Observable<GenealogyActionResult>;
  updateRecord(
    recordID: number,
    changes: Pick<GenealogyNode, 'name' | 'birthYear' | 'generationTitle'>,
  ): Observable<GenealogyActionResult>;
}

export interface GenealogyActionResult {
  success: boolean;
  message: string;
}
