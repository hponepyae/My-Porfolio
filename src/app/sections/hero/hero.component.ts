import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy } from '@angular/core';

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
  private pinned: HTMLElement | null = null;

  // Layout numbers cached by measure() so scrolling itself never has to read layout.
  private scrollStart = 0;
  private scrollable = 0;

  private progress = 0;
  private fxCurrent = 0;
  private frame: number | null = null;
  private reduceMotion = false;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    this.pinned = this.host.nativeElement.querySelector('.hero-pinned');
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.onWindowResize();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.measure();
    this.onWindowScroll();
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (this.scrollable <= 0) {
      this.progress = 0;
    } else {
      const raw = (window.scrollY - this.scrollStart) / this.scrollable;
      this.progress = Math.max(0, Math.min(1, raw / NAME_TRAVEL_SHARE));
    }

    // --p follows the scroll exactly (scroll events already arrive once per frame).
    this.pinned?.style.setProperty('--p', this.progress.toFixed(4));

    if (this.frame === null) {
      this.frame = requestAnimationFrame(this.render);
    }
  }

  // --fx chases the scroll progress frame by frame so the colour ghosts glide instead of
  // stepping with each wheel tick.
  private render = () => {
    this.frame = null;
    if (!this.pinned) return;

    const target = this.progress * this.progress * (3 - 2 * this.progress);
    const delta = target - this.fxCurrent;
    if (this.reduceMotion || Math.abs(delta) < 0.001) {
      this.fxCurrent = target;
    } else {
      this.fxCurrent += delta * THERMAL_EASE;
      this.frame = requestAnimationFrame(this.render);
    }

    this.pinned.style.setProperty('--fx', this.fxCurrent.toFixed(4));
  };

  private measure() {
    const host = this.host.nativeElement;
    const section = host.querySelector('.hero-section') as HTMLElement | null;
    const pinned = this.pinned;
    if (!section || !pinned) return;

    // The pinned block may stick below the navbar (phones, tablets), so the scroll range is
    // measured against it rather than the viewport.
    const pinnedTop = parseFloat(getComputedStyle(pinned).top) || 0;
    this.scrollStart = section.getBoundingClientRect().top + window.scrollY - pinnedTop;
    this.scrollable = section.offsetHeight - pinned.offsetHeight;

    this.measureNameTravel(host, pinned);
  }

  // Distance the name rises so its vertical centre lands on the portrait's centre.
  private measureNameTravel(host: HTMLElement, pinned: HTMLElement) {
    const name = host.querySelector('.hpone-name') as HTMLElement | null;
    const portrait = host.querySelector('.hero-portrait') as HTMLElement | null;
    const container = name?.offsetParent as HTMLElement | null;
    if (!name || !portrait || !container) return;

    const portraitRect = portrait.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (!portraitRect.height || !name.offsetHeight) return;

    const portraitCenter = portraitRect.top + portraitRect.height / 2 - containerRect.top;
    const end = containerRect.height - portraitCenter - name.offsetHeight / 2;
    const start = parseFloat(getComputedStyle(name).bottom) || 0;
    pinned.style.setProperty('--name-travel', `${Math.round(end - start)}px`);
  }

  ngOnDestroy() {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
    }
  }
}
