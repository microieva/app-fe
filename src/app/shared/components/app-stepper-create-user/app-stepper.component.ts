import {Component, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { AppGraphQLService } from '../../services/app-graphql.service';
import { AlertComponent } from '../app-alert/app-alert.component';
import { User } from '../../../graphql/user/user';

@Component({
    selector: 'app-stepper',
    templateUrl: 'app-stepper.component.html',
    styleUrls: ['app-stepper.component.scss']
})
export class AppStepperComponent implements OnInit {
  @ViewChild(MatStepper) stepper!: MatStepper;
  isLoading = false;
  isLinear = true;
  userRoleId: number | undefined;
  form: FormGroup | undefined;
  newUser: Partial<User> | undefined;

  constructor(
    private formBuilder: FormBuilder,
    private graphQLService: AppGraphQLService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.form = this.formBuilder.group({
      firstName: this.formBuilder.control<string>('', [Validators.required, Validators.minLength(2)]),
      lastName: this.formBuilder.control<string>('', [Validators.required, Validators.minLength(2)]),
      dob: this.formBuilder.control<string>('', [Validators.required]),
      email: this.formBuilder.control<string>('', [Validators.required, Validators.email]),
    });
  } 

  onSelect(userRoleId: number) {
    this.userRoleId = userRoleId; 
    this.stepper.next(); 
  }
  onNext() {
    if (this.form && this.form.valid) {
      this.newUser = {
        ...this.form.value,
        userRoleId: this.userRoleId,
        password: 'demo'
      };
    }
  }
  async onSave() {
    const mutation = `mutation ($userInput: UserInput!){
      saveUser(userInput: $userInput) {
        success
        message
        }
      }`
        
    try {          
        this.isLoading = true;
        const response = await this.graphQLService.mutate(mutation, { userInput: this.newUser });
        if (response.data.saveUser.success) {
          this.isLoading = false;
          this.dialog.closeAll();
          this.dialog.open(AlertComponent, { data: {message: "New user account created successfully!"}});
        } else {
          this.isLoading = false;
          this.dialog.open(AlertComponent, { data: {message:response.data.saveUser.message}});
        }
    } catch (error) {
        this.isLoading = false;
        this.dialog.open(AlertComponent, { data: {message: "Error saving user details: "+ error}})
    }
  }
}
