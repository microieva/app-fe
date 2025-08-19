import { Component, EventEmitter, HostListener, Inject, Input, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-custom-popup',
  templateUrl: './app-custom-popup.component.html',
  styleUrls: ['app-custom-popup.component.scss']
})
export class CustomPopupComponent implements OnDestroy{
  innerHTML: string = '';
  width: string | undefined;
  height: string | undefined;
  @Input() topPosition?: string;
  @Input() leftPosition?: string;
  @Input() rightPosition?: string;
  @Input() bottomPosition?: string;

  @HostListener('document:click', ['$event.target'])
    public onClick(target: any) {
      if (target.classList.contains('cdk-overlay-backdrop') ) {
        this.close(); 
      }
    }

  constructor(
    public dialogRef: MatDialogRef<CustomPopupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    if (data.innerHTML) {
      this.innerHTML = data.innerHTML;
      this.topPosition = data.position.top;
      this.leftPosition = data.position.left;
      this.rightPosition = data.position.right;
      this.bottomPosition = data.position.bottom;
    }
    if (data.size) {
      this.width = data.size.width;
      this.height = data.size.height;
    }
  }

  close(){
    this.dialogRef.close();
  }
  ngOnDestroy() {
    this.width = undefined;
    this.height = undefined;
    this.topPosition = undefined;
    this.leftPosition = undefined;
    this.rightPosition = undefined;
    this.bottomPosition = undefined;
  }
}