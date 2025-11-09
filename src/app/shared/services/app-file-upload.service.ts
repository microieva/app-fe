    import { Injectable } from '@angular/core';
    import { MatDialog } from '@angular/material/dialog';
    import { AppGraphQLService } from './app-graphql.service';
    import { AlertComponent } from '../components/app-alert/app-alert.component';
import imageCompression from 'browser-image-compression';

    @Injectable({ providedIn: 'root' })
    export class AppUploadService {
    constructor(private graphQLService: AppGraphQLService, private dialog:MatDialog) {}

    // uploadImage(file: File) {
    //     return new Promise<string>((resolve, reject) => {

    //     if (!(file instanceof Blob)) {
    //         reject(new Error('Invalid file object'));
    //         return;
    //     }
    //     const name:string = file.name;
    //     const reader = new FileReader();
    //     reader.onload = async () => {
    //         const base64 = reader.result as string;
    //         await this.uploadProfilePicture(base64, name)
    //             .then((url: string | null) => resolve(url as string))
    //             .catch(err => this.dialog.open(AlertComponent, {data: {message:err}}));
    //     };
    //     reader.onerror = (error) => {
    //         console.error('FileReader error:', error);
    //         reject(new Error('Failed to read file'));
    //     };
    //     reader.readAsDataURL(file);
    //     });
    // }
     async uploadImage(file: File): Promise<string | null> {
        try {
            if (!(file instanceof Blob)) {
                throw new Error('Invalid file object');
            }
            const compressedFile = await this.compressImage(file);
            const name: string = compressedFile.name;

            const base64 = await this.fileToBase64(compressedFile);
            const url = await this.uploadProfilePicture(base64, name);
            
            return url;

        } catch (error) {
            this.dialog.open(AlertComponent, { data: { message: error } });
            throw null;
        }
    }

    private async compressImage(file: File): Promise<File> {
        const options = {
            maxSizeMB: 0.05, // 50KB
            maxWidthOrHeight: 800, // Optional: resize to max dimension
            useWebWorker: true, // Use web worker for better performance
            fileType: 'image/jpeg', // Convert to JPEG for better compression
            initialQuality: 0.7, // Quality level (0.7 = 70%)
        };

        try {
            return await imageCompression(file, options);
        } catch (error) {
            console.warn('Compression failed, using original file:', error);
        return file; 
        }
    }
   private fileToBase64(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
    private async uploadProfilePicture(base64: string, name:string): Promise<string | null>{
            const mutation = `mutation ($base64: String!, $name:String!) {
                uploadProfilePicture(base64: $base64, name:$name) {
                    success
                    message
                    url
                }
            }`
            const variables = {base64, name}
            try {
                const response = await this.graphQLService.mutate(mutation, variables);
                return response.data.uploadProfilePicture.url;
            } catch (error) {
                this.dialog.open(AlertComponent, { data: {message: "Error uploading profile picture: "+ error}});
                return null;
            }
        }
    }