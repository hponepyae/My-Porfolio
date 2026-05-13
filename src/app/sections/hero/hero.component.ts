import { Component, ElementRef, HostListener, signal } from '@angular/core';

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.css'],
})
export class HeroComponent {
  scrollProgress = signal(0);

  constructor(private host: ElementRef<HTMLElement>) {}

  @HostListener('window:scroll')
  onWindowScroll() {
    const section = this.host.nativeElement.querySelector(
      '.hero-section'
    ) as HTMLElement | null;
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const scrollable = section.offsetHeight - window.innerHeight;
    if (scrollable <= 0) {
      this.scrollProgress.set(0);
      return;
    }

    const scrolled = -rect.top;
    const raw = Math.max(0, Math.min(1, scrolled / scrollable));
    this.scrollProgress.set(raw);
  }
}
