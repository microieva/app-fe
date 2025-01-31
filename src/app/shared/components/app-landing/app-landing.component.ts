import { Subscription } from "rxjs";
import { trigger, transition, style, animate, state } from "@angular/animations";
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { MatExpansionPanel } from "@angular/material/expansion";
import { MatDialog } from "@angular/material/dialog";
import { BreakpointObserver } from "@angular/cdk/layout";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { LoginMenuComponent } from "../app-login-menu/app-login-menu.component";
import { AlertComponent } from "../app-alert/app-alert.component";
import { FeedbackInput } from "../../../graphql/feedback/feedback.input";
import { AppErrorStateMatcher } from "../../errorStateMatcher";

@Component({
    selector: 'app-landing',
    templateUrl: 'app-landing.component.html',
    styleUrls: ['app-landing.component.scss'],
    animations: [
        trigger('slideInOut', [
            state('in', style({ transform: 'translateY(0)', opacity: 1 })),
            transition(':enter', [
                style({ transform: 'translateY(80%)', opacity: 0.1 }),
                animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
            ]),
            transition(':leave', [
                animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(100%)', opacity: 0.1 }))
            ])
        ])      
    ]
})
export class AppLandingComponent implements OnInit, OnDestroy, AfterViewInit{
    isDesktop:boolean = true;
    isTablet:boolean = false;
    isMobile:boolean = false;
    isMobileSmall:boolean = false;

    scrollOffset: number = 0;
    setVisible1:boolean = false;
    setVisible2:boolean = false;
    setVisible3:boolean = false;
    isDisabled:boolean = true;
    isSent:boolean = false;
    isAnonymous:boolean = false;
    isContactDisabled:boolean = false;
    requireContact: boolean = false; 
    rows: number = 2;
    feedback:string | null = null;
    isSendingFeedback:boolean = false;

    isPanelOpen:boolean = false;

    newsletter = new FormControl();
    feedbackForm: FormGroup =  new FormGroup({
        name: new FormControl<string | null>(null),
        email: new FormControl<string | null>(null),
        text: new FormControl<string | null>(null),
    });
    matcher = new AppErrorStateMatcher();

    private subscriptions: Subscription = new Subscription();
    @ViewChild('textarea') textarea: ElementRef | undefined;
    @ViewChild('textBlock') textBlock!: ElementRef;
    @ViewChild('viewContainer') viewContainer!: ElementRef;
    @ViewChild('feedbackPanel') feedbackPanel!: MatExpansionPanel;

    @HostListener('window:scroll', [])
    onWindowScroll(): void {
      const scrollPosition = window.scrollY || document.documentElement.scrollTop;

      this.scrollOffset = scrollPosition * -3.1;
      
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;  
      this.setVisible1 = scrollPosition + clientHeight >= (scrollHeight-575);
      this.setVisible2 = scrollPosition + clientHeight >= (scrollHeight-625);
      this.setVisible3 = scrollPosition + clientHeight >= (scrollHeight-685);
    }

    constructor (
        private dialog: MatDialog,
        private graphQLService: AppGraphQLService,
        private formBuilder: FormBuilder,
        private breakpointObserver: BreakpointObserver
    ) {}

    async ngOnInit() {
        this.breakpointObserver.observe(['(min-width: 1024px)']).subscribe(result => {
            this.isDesktop = result.matches;
            this.isTablet = this.breakpointObserver.isMatched('(min-width: 768px) and (max-width: 1023px)');
            this.isMobile =  this.breakpointObserver.isMatched('(max-width: 430px)');
            this.isMobileSmall = this.breakpointObserver.isMatched('(max-width: 410px)');
        });
        this.dialog.closeAll();
        this.buildFeebackForm();
    }

    buildFeebackForm(){
        this.feedbackForm = this.formBuilder.group({
            name: this.formBuilder.control<string | null>(null),
            email: this.formBuilder.control<string | null>(null),
            text: this.formBuilder.control<string | null>(null)
        });
        this.newsletter = this.formBuilder.control(null, Validators.pattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/));
    }

    onLogIn(){
        this.dialog.open(LoginMenuComponent);
    }
    onCancelSubscribe(panel: MatExpansionPanel){
        panel.close();
        this.newsletter.reset();
    }
    onCancelFeedback(panel: MatExpansionPanel){
        this.requireContact = false;
        this.feedbackForm.reset();
        panel.close();
        if (this.isTablet) this.resetTabletViewHeight();
        else if (this.isMobile) this.resetMobileViewHeight();
        else if (this.isMobileSmall) this.resetMobileSmallViewHeight();
    }
    onSendSubscription(panel: MatExpansionPanel) {
        this.newsletter.reset();
        this.isSent = true;
    }
    ngAfterViewInit(): void {
        this.feedbackPanel.opened.subscribe(() => {
            if (this.isTablet) {
                this.adjustTabletViewHeight()
            } else if (this.isMobile) {
                this.adjustMobileViewHeight();
            } else if (this.isMobileSmall) {
                this.adjustMobileSmallViewHeight();
            } 
        });
        this.feedbackPanel.closed.subscribe(() => {
            if (this.isTablet) {
                this.resetTabletViewHeight();
            } else if (this.isMobile) {
                this.resetMobileViewHeight(); 
            } else if (this.isMobileSmall) {
                this.resetMobileSmallViewHeight();
            }
        });
    }
    adjustTabletViewHeight(){
        this.textBlock.nativeElement.style.height = '284vh'; 
        this.viewContainer.nativeElement.style.height = 'calc(342vh + 25rem)'
    }
    adjustMobileViewHeight(){
        this.textBlock.nativeElement.style.height = '240vh'; 
        this.viewContainer.nativeElement.style.height = 'calc(308vh + 15rem)'
    }
    adjustMobileSmallViewHeight(){
        this.textBlock.nativeElement.style.height = '220vh'; 
        this.viewContainer.nativeElement.style.height = 'calc(264vh + 25rem)'
    }

    resetTabletViewHeight(){
        this.viewContainer.nativeElement.style.height = 'calc(325vh + 25rem)'
        this.textBlock.nativeElement.style.height = '260vh'; 
    }
    resetMobileViewHeight(){
        this.viewContainer.nativeElement.style.height = ' calc(268vh + 15rem)'
        this.textBlock.nativeElement.style.height = '200vh'; 
    }
    resetMobileSmallViewHeight(){
        this.viewContainer.nativeElement.style.height = 'calc(238vh + 25rem);'
        this.textBlock.nativeElement.style.height = '194vh'; 
    }

    onCheckedAnonymous(){
        this.isAnonymous = true;
        this.isContactDisabled = true;
    }
    async onSendFeedback(){ 

        if (this.feedbackForm.valid) {
            const feedback = this.feedbackForm.value
            const input = {
                name: feedback.name || null,
                email: feedback.email || null,
                text: feedback.text || null
            } as FeedbackInput;
    
            if (input) {
                this.isSendingFeedback = true;
                const mutation =  `mutation ($feedbackInput: FeedbackInput!) {
                        saveFeedback (feedbackInput: $feedbackInput) {
                            success
                            message
                        
                        }
                    }`
                try {
                    const response = await this.graphQLService.mutate(mutation, {feedbackInput:feedback});
                    if (response.data.saveFeedback.success) {
                        this.isSendingFeedback = false;
                        this.feedback = response.data.saveFeedback.message;    
                    } else {
                        this.dialog.open(AlertComponent, {data:{message:response.data.saveFeedback.message}})
                    }
    
                } catch (error) {
                    this.isSendingFeedback = false;
                    this.dialog.open(AlertComponent, {data:{message:error}})
                }
            }
        }
    }
    get characterCount(): number {
        const characters = this.feedbackForm.get('text')?.value || '';
        return characters.replace(/\n/g, '').length; 
    }
    adjustHeight(event:any){
        const el = event.target as HTMLTextAreaElement;
        el.style.height='auto';
        el.style.height =`${el.scrollHeight}px`;
    }

    toggleChangeAnonymous(event: any): void {
        if (event.checked) this.requireContact = false;
        this.isAnonymous = event.checked;
        this.updateValidators();
    }
    
    toggleChangeContact(event: any): void {
        this.requireContact = event.checked;
        this.updateValidators();
    }
    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
    updateValidators() {
        const nameControl = this.feedbackForm.get('name');
        const emailControl = this.feedbackForm.get('email');
        const textControl = this.feedbackForm.get('text');
    
        if (this.isAnonymous) {
          nameControl?.clearValidators();
          emailControl?.clearValidators();
          nameControl?.reset();
          emailControl?.reset();
          textControl?.setValidators([Validators.required, Validators.maxLength(1000)]);
        } else {
            nameControl?.setValidators([Validators.required, Validators.pattern(/^[a-zA-Z]+$/)]);
            textControl?.setValidators([Validators.required, Validators.maxLength(1000)]);
            if (this.requireContact) {
                emailControl?.setValidators([Validators.required, Validators.pattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)]);
            } else {
                emailControl?.clearValidators();
                emailControl?.reset();
            }
        }
    
        nameControl?.updateValueAndValidity();
        emailControl?.updateValueAndValidity();
        textControl?.updateValueAndValidity();
      
    }
}