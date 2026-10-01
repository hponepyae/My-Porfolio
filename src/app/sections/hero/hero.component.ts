import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, signal } from '@angular/core';

// Share of the pinned scroll spent moving the name up; the rest holds it over the portrait
// so one more scroll is needed before the page moves on.
const NAME_TRAVEL_SHARE = 0.74;

// Fraction of the remaining distance the thermal effect covers per frame.
const THERMAL_EASE = 0.12;

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.css'],
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  scrollProgress = signal(0);
  nameEnd = signal<string | null>(null);

  private fxTarget = 0;
  private fxCurrent = 0;
  private fxFrame: number | null = null;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    this.onWindowScroll();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.measureNameEnd();
    this.onWindowScroll();
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    const section = this.host.nativeElement.querySelector(
      '.hero-section'
    ) as HTMLElement | null;
    if (!section) return;

    if (this.nameEnd() === null) {
      this.measureNameEnd();
    }

    // The pinned block may stick below the navbar (phones), so measure against it rather than the viewport.
    const pinned = section.querySelector('.hero-pinned') as HTMLElement | null;
    const pinnedTop = pinned ? parseFloat(getComputedStyle(pinned).top) || 0 : 0;
    const pinnedHeight = pinned?.offsetHeight ?? window.innerHeight;

    const rect = section.getBoundingClientRect();
    const scrollable = section.offsetHeight - pinnedHeight;
    if (scrollable <= 0) {
      this.scrollProgress.set(0);
      return;
    }

    const scrolled = pinnedTop - rect.top;
    const raw = Math.max(0, Math.min(1, scrolled / scrollable));
    const progress = Math.min(1, raw / NAME_TRAVEL_SHARE);
    this.scrollProgress.set(progress);
    this.setThermalTarget(progress);
  }

  // Chases the scroll progress frame by frame so the thermal effect glides instead of
  // stepping with each wheel tick.
  private setThermalTarget(progress: number) {
    this.fxTarget = progress * progress * (3 - 2 * progress);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.fxCurrent = this.fxTarget;
      this.applyThermal();
      return;
    }

    if (this.fxFrame === null) {
      this.fxFrame = requestAnimationFrame(this.stepThermal);
    }
  }

  private stepThermal = () => {
    const delta = this.fxTarget - this.fxCurrent;
    if (Math.abs(delta) < 0.001) {
      this.fxCurrent = this.fxTarget;
      this.fxFrame = null;
    } else {
      this.fxCurrent += delta * THERMAL_EASE;
      this.fxFrame = requestAnimationFrame(this.stepThermal);
    }
    this.applyThermal();
  };

  private applyThermal() {
    const pinned = this.host.nativeElement.querySelector('.hero-pinned') as HTMLElement | null;
    pinned?.style.setProperty('--fx', this.fxCurrent.toFixed(4));
  }

  ngOnDestroy() {
    if (this.fxFrame !== null) {
      cancelAnimationFrame(this.fxFrame);
    }
  }

  // Lands the name's vertical centre on the portrait's centre.
  measureNameEnd() {
    const host = this.host.nativeElement;
    const name = host.querySelector('.hpone-name') as HTMLElement | null;
    const portrait = host.querySelector('.hero-portrait') as HTMLElement | null;
    const container = name?.offsetParent as HTMLElement | null;
    if (!name || !portrait || !container) return;

    const portraitRect = portrait.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (!portraitRect.height || !name.offsetHeight) return;

    const portraitCenter = portraitRect.top + portraitRect.height / 2 - containerRect.top;
    const end = containerRect.height - portraitCenter - name.offsetHeight / 2;
    this.nameEnd.set(`${Math.round(end)}px`);
  }
}
