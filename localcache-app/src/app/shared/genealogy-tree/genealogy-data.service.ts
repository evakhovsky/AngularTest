import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import {
  GenealogyActionResult,
  GenealogyApplyResult,
  GenealogyChangeSet,
  GenealogyChangesApplied,
  GenealogyNode,
} from './genealogy-node';

@Injectable()
export class GenealogyDataService {
  private readonly http = inject(HttpClient);
  private readonly changesAppliedSubject = new Subject<GenealogyChangesApplied>();
  private readonly databaseResetSubject = new Subject<void>();

  readonly changesApplied$ = this.changesAppliedSubject.asObservable();
  readonly databaseReset$ = this.databaseResetSubject.asObservable();

  getRoots(): Observable<GenealogyNode[]> {
    return this.http.get<GenealogyNode[]>('/api/genealogy/roots');
  }

  getChildren(parent: GenealogyNode): Observable<GenealogyNode[]> {
    return this.http.get<GenealogyNode[]>(`/api/genealogy/${parent.recordID}/children`);
  }

  applyChanges(changes: GenealogyChangeSet): Observable<GenealogyApplyResult> {
    return this.http.post<GenealogyApplyResult>('/api/genealogy/changes', changes);
  }

  reset(): Observable<GenealogyActionResult> {
    return this.http.post<GenealogyActionResult>('/api/genealogy/reset', {});
  }

  notifyChangesApplied(batch: GenealogyChangesApplied): void {
    this.changesAppliedSubject.next(batch);
  }

  notifyDatabaseReset(): void {
    this.databaseResetSubject.next();
  }
}
