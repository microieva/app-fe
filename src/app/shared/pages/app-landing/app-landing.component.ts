import { Subscription } from "rxjs";
import { trigger, transition, style, animate, state } from "@angular/animations";
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { MatExpansionPanel } from "@angular/material/expansion";
import { MatDialog } from "@angular/material/dialog";
import { BreakpointObserver } from "@angular/cdk/layout";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppErrorStateMatcher } from "../../errorStateMatcher";
import { LoginMenuComponent } from "../../components/app-login-menu/app-login-menu.component";
import { AlertComponent } from "../../components/app-alert/app-alert.component";
import { FeedbackInput } from "../../../graphql/feedback/feedback.input";
import { CustomPopupComponent } from "../../components/app-custom-popup/app-custom-popup.component";
import { POPUP_CREDENTIALS } from "../../constants";

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
        ]), 
        trigger('fadeInOut', [
            state('void', style({ opacity: 0})),
            state('0', style({ opacity: 0 })),
            state('1', style({ opacity: 1})),
            // Fade in (top to bottom)
            transition('0 => 1', animate('300ms ease-out')),
            // Fade out (bottom to top)
            transition('1 => 0', animate('300ms ease-in')),
            // Initial state
            transition('void => *', animate(0))
          ]), 
    ]
})
export class AppLandingComponent implements OnInit, OnDestroy, AfterViewInit{
    isDesktop:boolean = true;

    scrollOffset: number = 0;

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
    @ViewChild('wrapper') wrapper!: ElementRef;
    @ViewChild('feedbackPanel') feedbackPanel!: ElementRef;

    parallaxOffset = 0;
    parallaxFactor = -1.5; 
    wrapperHeight: string = 'calc(220vh + 20rem)';
    textBlockHeight: string = '140vh';

    visibility = {
        item1: '0',
        item2: '0',
        item3: '0'
    };

    visibilityThresholds = {
        item1: { start: 0.65, end: 0.85 },
        item2: { start: 0.65, end: 0.75 },
        item3: { start: 0.65, end: 0.45 }
    };

    @HostListener('window:scroll')
    onWindowScroll() {
        this.calculateHeights();
        this.calculateParallax();
        this.calculateVisibility();
    }
    
    @HostListener('window:resize')
    onWindowResize() {
        this.calculateHeights();
        this.calculateParallax();
        this.calculateVisibility();
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
        });
        this.calculateHeights();
        this.calculateParallax();
        this.calculateVisibility();
        this.dialog.closeAll();
        //this.buildFeebackForm();
    }

    calculateHeights() {
       if (!this.isDesktop) {
            const viewportHeight = window.innerHeight;
            const isMobile = window.innerWidth < 768;
            
            this.wrapperHeight = `calc(${isMobile ? 1.6 : 1.4} * ${viewportHeight}px + ${isMobile ? '6rem' : '20rem'})`; 
            this.textBlockHeight = `calc(${isMobile ? 0.8 : 0.85} * ${viewportHeight}px)`; 
        }
        this.wrapperHeight = 'calc(220vh + 20rem)';
        this.textBlockHeight = '140vh';
      }

    calculateParallax() {
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        const viewportHeight = window.innerHeight;
        this.parallaxOffset = scrollPosition * this.parallaxFactor;
        const heightFactor = viewportHeight / 600; // reference height
        this.parallaxOffset *= heightFactor;
    }
    togglePanel() {
        this.isPanelOpen = !this.isPanelOpen;
        if (this.isPanelOpen) {
            this.buildFeebackForm();
            this.parallaxFactor = -4;

            this.visibilityThresholds = {
                item1: { start: 0.35, end: 0.45 },
                item2:{ start: 0.25, end: 0.35 },
                item3: { start: 0.25, end: 0.35 }
            };
        } else {
            this.parallaxFactor = -1.5;

            this.visibilityThresholds = {
                item1: { start: 0.65, end: 0.85 },
                item2: { start: 0.65, end: 0.75 },
                item3: { start: 0.65, end: 0.45 }
            };
        }
        this.calculateHeights();
        this.calculateParallax();
        this.calculateVisibility();
    }

    calculateVisibility() {
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        
        const scrollProgress = scrollPosition / (scrollHeight - clientHeight);
    
        this.visibility.item1 = this.calculateItemVisibility(
          scrollProgress, 
          this.visibilityThresholds.item1.start,
          this.visibilityThresholds.item1.end
        );
        
        this.visibility.item2 = this.calculateItemVisibility(
          scrollProgress, 
          this.visibilityThresholds.item2.start,
          this.visibilityThresholds.item2.end
        );
        
        this.visibility.item3 = this.calculateItemVisibility(
          scrollProgress, 
          this.visibilityThresholds.item3.start,
          this.visibilityThresholds.item3.end
        );
    }
    
    calculateItemVisibility(progress: number, start: number, end: number): string {
        if (progress < start) return '0';
        if (progress > end) return '1';
        return ((progress - start) / (end - start)).toString();
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
        this.dialog.open(CustomPopupComponent, {
            hasBackdrop: false, 
            data: {
                text: POPUP_CREDENTIALS,
                position: {
                    top: '50%',
                    left: '72%',
                    right: 'auto',
                    bottom: 'auto'          
                }
            }});
    }
    onCancelSubscribe(panel: MatExpansionPanel){
        panel.close();
        this.newsletter.reset();
    }
    onCancelFeedback(panel: MatExpansionPanel){
        this.requireContact = false;
        this.feedbackForm.reset();
        panel.close();
        this.isPanelOpen = false;
    }
    onSendSubscription(panel: MatExpansionPanel) {
        this.newsletter.reset();
        this.isSent = true;
    }
    ngAfterViewInit(): void {
        this.calculateHeights();
        this.calculateParallax();
        this.calculateVisibility();
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
        //this.resizeObserver.disconnect();
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