import { Pipe, PipeTransform, OnDestroy } from '@angular/core';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Pipe({
  name: 'animateTrigger',
  pure: false 
})
export class AppAnimateTriggerPipe implements PipeTransform, OnDestroy {
  private destroy$ = new Subject<void>();
  private currentValue: any;
  private shouldAnimate = false;
  constructor(){}

  transform(value: any, animationDuration: number = 0, debounceTime: number = 300): boolean {
  
  if (value !== this.currentValue) {
    this.currentValue = value;
    this.triggerAnimation(animationDuration, debounceTime);
  }
  return this.shouldAnimate;
}

private triggerAnimation(duration: number, debounceTime: number): void {
  timer(debounceTime).pipe(
    takeUntil(this.destroy$)
  ).subscribe(() => {
    this.shouldAnimate = true;
    
    timer(duration).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.shouldAnimate = false;
    });
  });
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}