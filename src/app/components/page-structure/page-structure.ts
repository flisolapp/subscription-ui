import { Component, signal, WritableSignal } from '@angular/core';

// FIX: Avoid named import for soon-to-be ESM-only default exports
import packageInfo from '../../../../package.json';
import { Toolbar } from '../toolbar/toolbar';

@Component({
  selector: 'app-page-structure',
  imports: [Toolbar],
  templateUrl: './page-structure.html',
  styleUrl: './page-structure.scss',
})
export class PageStructure {
  /* v8 ignore next -- @preserve */
  public version: WritableSignal<string> = signal<string>(packageInfo.version);
}
