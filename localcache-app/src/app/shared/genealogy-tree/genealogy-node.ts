import { Observable } from 'rxjs';

export interface GenealogyNode {
  recordID: number;
  parentID: string;
  name: string;
  birthYear: number;
  generationTitle: string;
  hasChildren: boolean;
  isDeleted: boolean;
}

export interface GenealogyChange {
  recordID: number;
  parentID: string;
  name: string;
  birthYear: number;
  generationTitle: string;
  isNew: boolean;
  isDeleted: boolean;
}

export interface GenealogyChangeSet {
  nodes: GenealogyChange[];
}

export interface GenealogyActionResult {
  success: boolean;
  message: string;
}

export interface GenealogyApplyResult extends GenealogyActionResult {
  createdRecords: Array<{ clientRecordID: number; recordID: number }>;
}

export interface GenealogyDataSource {
  getRoots(): Observable<GenealogyNode[]>;
  getChildren(parent: GenealogyNode): Observable<GenealogyNode[]>;
  applyChanges(changes: GenealogyChangeSet): Observable<GenealogyApplyResult>;
  reset(): Observable<GenealogyActionResult>;
}
