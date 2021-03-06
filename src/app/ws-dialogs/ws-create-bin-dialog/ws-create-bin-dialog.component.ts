import { WsMamError } from './../../shared/services/ws-base-mam/ws-mam-error';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { WsAppManagementService } from './../../ws-app-management.service';
import { WsAppStateService } from './../../ws-app-state.service';
import { NewBinParams } from './new-bin-params';
import { Component, OnInit, OnDestroy, Inject } from '@angular/core';

@Component({
  selector: 'app-ws-create-bin-dialog',
  templateUrl: './ws-create-bin-dialog.component.html',
  styleUrls: ['./ws-create-bin-dialog.component.css']
})
export class WsCreateBinDialogComponent implements OnInit, OnDestroy {
  public subscribers: any[];
  public result = new NewBinParams();

  constructor(
    public appState: WsAppStateService,
    private management: WsAppManagementService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<WsCreateBinDialogComponent>) {
    this.subscribers = [];
  }

  ngOnInit() {
    const descriptors = this.appState.descriptors[this.data.type];
    this.setMediaGroupDescriptors(descriptors);
  }

  ngOnDestroy() {
    this.subscribers.forEach(element => {
      element.unsubscribe();
    });
  }

  private setMediaGroupDescriptors(descriptors: any) {
    // tslint:disable-next-line:prefer-const
    for (let descriptor of descriptors) {
      if (descriptor.nameInternal === 'media_group_id') {
        this.result.descriptor = descriptor;
        return;
      }
    }
  }
}
