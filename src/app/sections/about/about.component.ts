import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';

// Phone-only list spotlight. The whole list is lit one item after another across one long
// stretch of scrolling: it starts when the list's top edge reaches SPOTLIGHT_START of the viewport
// height and ends when its bottom edge reaches SPOTLIGHT_END. Spreading the sequence over that
// distance (instead of over each item's own height) is what keeps it unhurried.
const SPOTLIGHT_START = 0.82;
const SPOTLIGHT_END = 0.3;
// Share of an item's turn spent lighting its letters; the rest holds it fully lit.
const SPOTLIGHT_FILL = 0.7;
// Share of the next item's turn over which the previous item fades out.
const SPOTLIGHT_HANDOVER = 0.3;
// Fraction of the remaining distance covered per frame, so the light glides after the scroll
// instead of jumping with every wheel tick or touch step.
const SPOTLIGHT_EASE = 0.11;
// Extra "letters" the lit head travels past the end of a title so its glow leaves the last letter.
const SPOTLIGHT_HEAD_OVERRUN = 1.5;
const SPOTLIGHT_QUERY = '(max-width: 767px)';

type AboutListItem = { number: string; title: string; text: string; chars: string[] };

const listItem = (number: string, title: string, text: string): AboutListItem => ({
  number,
  title,
  text,
  chars: Array.from(title),
});

@Component({
  selector: 'app-about',
  standalone: true,
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
})
export class AboutComponent implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private sectionObserver?: IntersectionObserver;
  private statsObserver?: IntersectionObserver;
  private animationFrame?: number;
  private hasAnimatedStats = false;
  private listElement: HTMLElement | null = null;
  private listItemElements: HTMLElement[] = [];
  private spotlightFrame?: number;
  private spotlightEnabled = false;
  // Position in the sequence, in items: 0 = nothing lit yet, 1.5 = halfway through the second.
  private spotlightTarget = 0;
  private spotlightCurrent = 0;

  readonly listItems: AboutListItem[] = [
    listItem('01', 'UX Research', 'User research, interviews, usability testing and analysis'),
    listItem('02', 'Visual Design', 'UI design, design systems, brand identity'),
    listItem('03', 'Prototyping', 'Interactive prototypes and micro-interaction design'),
    listItem('04', 'Handoff', 'Developer-ready specs, documentation, QA'),
  ];

  readonly isVisible = signal(false);
  readonly projectsDone = signal(0);
  readonly happyClients = signal(0);
  readonly yearsActive = signal(0);

  ngAfterViewInit(): void {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.listElement = this.elementRef.nativeElement.querySelector('.about-list');
    this.listItemElements = Array.from(
      this.elementRef.nativeElement.querySelectorAll('.about-list-item'),
    );
    this.spotlightEnabled = !reduceMotion;
    this.queueSpotlight();

    if (reduceMotion || !('IntersectionObserver' in window)) {
      this.showSection();
      this.setFinalStats();
      return;
    }

    this.sectionObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.showSection();
          this.sectionObserver?.disconnect();
        }
      },
      { threshold: this.revealThreshold() },
    );

    this.sectionObserver.observe(this.elementRef.nativeElement);

    const statsElement = this.elementRef.nativeElement.querySelector('.about-stats');

    if (!statsElement) {
      this.animateStats();
      return;
    }

    this.statsObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.animateStats();
          this.statsObserver?.disconnect();
        }
      },
      {
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.55,
      },
    );

    this.statsObserver.observe(statsElement);
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
    this.statsObserver?.disconnect();

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    if (this.spotlightFrame) {
      cancelAnimationFrame(this.spotlightFrame);
    }
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  queueSpotlight(): void {
    if (!this.spotlightEnabled || this.spotlightFrame) {
      return;
    }

    this.spotlightFrame = requestAnimationFrame(() => {
      this.spotlightFrame = undefined;
      this.updateSpotlight();
    });
  }

  // Works out how far through the sequence the scroll position is, eases towards it, and writes
  // the result per item: --f letters lit so far, --fill the same as 0..1, --on 1 while the item
  // is the current one (it fades as the next one starts, so only one title is lit at a time).
  private updateSpotlight(): void {
    const list = this.listElement;
    if (!list) {
      return;
    }

    const active = window.matchMedia(SPOTLIGHT_QUERY).matches;
    list.classList.toggle('about-list--spotlight', active);
    if (!active) {
      return;
    }

    const count = this.listItemElements.length;
    const viewport = window.innerHeight;
    const listRect = list.getBoundingClientRect();
    const clamp = (value: number) => Math.max(0, Math.min(1, value));

    const distance = listRect.height + viewport * (SPOTLIGHT_START - SPOTLIGHT_END);
    const scrolled = viewport * SPOTLIGHT_START - listRect.top;
    this.spotlightTarget = clamp(scrolled / distance) * count;

    const delta = this.spotlightTarget - this.spotlightCurrent;
    if (Math.abs(delta) < 0.002) {
      this.spotlightCurrent = this.spotlightTarget;
    } else {
      this.spotlightCurrent += delta * SPOTLIGHT_EASE;
      this.queueSpotlight();
    }

    this.listItemElements.forEach((item, index) => {
      // 0 when this item's turn starts, 1 when the next item's turn starts.
      const turn = this.spotlightCurrent - index;
      const fill = clamp(turn / SPOTLIGHT_FILL);
      const on = 1 - clamp((turn - 1) / SPOTLIGHT_HANDOVER);
      const chars = this.listItems[index]?.chars.length ?? 0;

      item.style.setProperty('--f', (fill * (chars + SPOTLIGHT_HEAD_OVERRUN)).toFixed(3));
      item.style.setProperty('--fill', fill.toFixed(3));
      item.style.setProperty('--on', on.toFixed(3));
    });
  }

  // When the section is much taller than the screen (stacked phone layout, landscape phones) a 24%
  // visible share can never be reached, so ask for no more than a third of a screen instead.
  private revealThreshold(): number {
    const height = this.elementRef.nativeElement.offsetHeight || window.innerHeight;
    return Math.min(0.24, (window.innerHeight / height) * 0.33);
  }

  private showSection(): void {
    this.isVisible.set(true);
  }

  private setFinalStats(): void {
    this.projectsDone.set(80);
    this.happyClients.set(74);
    this.yearsActive.set(3);
  }

  private animateStats(): void {
    if (this.hasAnimatedStats) {
      return;
    }

    this.hasAnimatedStats = true;
    const start = performance.now();
    const duration = 4200;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.projectsDone.set(Math.round(80 * eased));
      this.happyClients.set(Math.round(74 * eased));
      this.yearsActive.set(Math.round(3 * eased));

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(tick);
      } else {
        this.setFinalStats();
      }
    };

    this.animationFrame = requestAnimationFrame(tick);
  }
}
