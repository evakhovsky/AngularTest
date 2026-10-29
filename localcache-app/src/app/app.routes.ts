import { Routes } from '@angular/router';

import { DBTreeView } from './db-tree-view/db-tree-view';

export const routes: Routes = [
  { path: '', component: DBTreeView },
  { path: 'db-tree-view', component: DBTreeView },
];
