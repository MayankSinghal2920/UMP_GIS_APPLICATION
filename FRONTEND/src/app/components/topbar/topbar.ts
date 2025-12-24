import { Component } from '@angular/core';
import { UiState } from '../../services/ui-state';
import { EditState } from '../../services/edit-state';



@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {

  constructor(
    public ui: UiState,
    private edit: EditState
  ){}


 toggle(panel: string) {

   if (panel === 'edit') {
    if (this.ui.isOpen('edit')) {
      this.edit.disable();
    } else {
      this.edit.enable();
    }
  }

  this.ui.toggle(panel);

 }

}
