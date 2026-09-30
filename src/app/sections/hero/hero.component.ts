import { AfterViewInit, Component, ElementRef, HostListener, signal } from '@angular/core';

// Share of the pinned scroll spent moving the name up; the rest holds it over the portrait
// so one more scroll is needed before the page moves on.
const NAME_TRAVEL_SHARE = 0.74;

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.css'],
})
export class HeroComponent implements AfterViewInit {
  scrollProgress = signal(0);
  nameEnd = signal<string | null>(null);

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

    const rect = section.getBoundingClientRect();
    const scrollable = section.offsetHeight - window.innerHeight;
    if (scrollable <= 0) {
      this.scrollProgress.set(0);
      return;
    }

    const scrolled = -rect.top;
    const raw = Math.max(0, Math.min(1, scrolled / scrollable));
    this.scrollProgress.set(Math.min(1, raw / NAME_TRAVEL_SHARE));
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
