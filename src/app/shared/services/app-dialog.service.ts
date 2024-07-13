import { Injectable } from "@angular/core";
import {
    MatDialog,
    MatDialogConfig,
    MatDialogRef,
  } from '@angular/material/dialog';
import { AppDialogComponent } from "../components/app-dialog/app-dialog.component";

@Injectable({
    providedIn: 'root',
  })
  export class AppDialogService {

    dialogConfig: MatDialogConfig = {
      panelClass: 'app-dialog',
    }; 
    dialogRef?: MatDialogRef<AppDialogComponent>;
    
    constructor(private dialog: MatDialog) {}
  
    /**
     *
     * @param @Optional dialogConfig Component wise dialog config.
     *  Components can pass down data in this config or they can assign the data to dialogState
     */
    open(dialogConfig?: MatDialogConfig): MatDialogRef<AppDialogComponent> {
      this.dialogRef = this.dialog.open(AppDialogComponent, {
        ...this.dialogConfig,
        ...dialogConfig,
      });
  
      return this.dialogRef;
    }

    close() {
        this.dialog.closeAll();
    }
  }