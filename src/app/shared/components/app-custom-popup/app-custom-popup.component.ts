import { Component, HostListener, Inject, Input, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-custom-popup',
  templateUrl: './app-custom-popup.component.html',
  styleUrls: ['app-custom-popup.component.scss']
})
export class CustomPopupComponent implements OnDestroy{
  text: string = '';
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
    if (data.text) {
      this.text = data.text;
      this.topPosition = data.position.top;
      this.leftPosition = data.position.left;
      this.rightPosition = data.position.right;
      this.bottomPosition = data.position.bottom;
    }
    if (data.size) {
      //this.dialogRef.updateSize(data.size.width, data.size.height);
      this.width = data.size.width;
      this.height = data.size.height;
    }
  }

  close(){
    this.dialogRef.close();
  }
  ngOnDestroy() {
    // Cleanup if necessary
    this.width = undefined;
    this.height = undefined;
    this.topPosition = undefined;
    this.leftPosition = undefined;
    this.rightPosition = undefined;
    this.bottomPosition = undefined;
  }
}