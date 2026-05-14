import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal } from '@angular/core';

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

  readonly isVisible = signal(false);
  readonly projectsDone = signal(0);
  readonly happyClients = signal(0);
  readonly yearsActive = signal(0);

  ngAfterViewInit(): void {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      { threshold: 0.24 },
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
