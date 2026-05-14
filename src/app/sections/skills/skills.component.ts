import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
  inject,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type HeadingLine = {
  text: string;
  chars: string[];
  outlined?: boolean;
};

const HIGHLIGHT_COLOR = '#ffbe0c';
const HIGHLIGHT_SHADOW = '0 0 12px rgba(255, 190, 12, 0.76), 0 0 30px rgba(255, 190, 12, 0.32)';

@Component({
  selector: 'app-skills',
  standalone: true,
  templateUrl: './skills.component.html',
  styleUrl: './skills.component.css',
})
export class SkillsComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('skillBadge') private readonly skillBadges?: QueryList<ElementRef<HTMLElement>>;

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private gsapContext?: gsap.Context;
  private motionDisabled = false;

  readonly headingLines: HeadingLine[] = [
    this.createHeadingLine('Mastering'),
    this.createHeadingLine('The Tools', true),
    this.createHeadingLine('That Shape'),
    this.createHeadingLine('Digital Experiences'),
  ];

  ngAfterViewInit(): void {
    const badgeElements = this.skillBadges?.map((badge) => badge.nativeElement) ?? [];
    const headingGroups = this.getHeadingGroups();

    if (!badgeElements.length || !headingGroups.length) {
      return;
    }

    this.motionDisabled = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.registerPlugin(ScrollTrigger);

    this.gsapContext = gsap.context(() => {
      if (this.motionDisabled) {
        this.showReducedMotionState(headingGroups.flat(), badgeElements);
        return;
      }

      this.buildPinnedTimeline(headingGroups, badgeElements);
    }, this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.gsapContext?.revert();
  }

  private createHeadingLine(text: string, outlined = false): HeadingLine {
    return {
      text,
      chars: Array.from(text.toUpperCase()),
      outlined,
    };
  }

  private getHeadingGroups(): HTMLElement[][] {
    const section = this.elementRef.nativeElement as HTMLElement;
    const lineElements = Array.from(
      section.querySelectorAll('.skills-heading-line') as NodeListOf<HTMLElement>,
    );

    return lineElements.map((line) =>
      Array.from(line.querySelectorAll('.skills-char') as NodeListOf<HTMLElement>),
    );
  }

  private buildPinnedTimeline(headingGroups: HTMLElement[][], badgeElements: HTMLElement[]): void {
    const section = this.elementRef.nativeElement;
    const allHeadingChars = headingGroups.flat();
    const revealChars = allHeadingChars.filter((char) => char.textContent?.trim());

    gsap.set(allHeadingChars, {
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
      WebkitTextStrokeColor: 'rgba(255, 255, 255, 0.88)',
      textShadow: '0 0 18px rgba(255, 255, 255, 0.14)',
    });
    gsap.set(badgeElements, {
      autoAlpha: 0,
      y: -360,
      scale: 0.78,
      rotate: -7,
      filter: 'blur(3px)',
    });

    const timeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=6400',
        pin: true,
        scrub: 1.05,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Characters persist once revealed. THE TOOLS keeps transparent fill and becomes a yellow outline.
    timeline.to(revealChars, {
      color: (_: number, target: Element) => this.finalColor(target as HTMLElement),
      WebkitTextFillColor: (_: number, target: Element) =>
        this.finalFillColor(target as HTMLElement),
      WebkitTextStrokeColor: HIGHLIGHT_COLOR,
      textShadow: HIGHLIGHT_SHADOW,
      duration: 0.34,
      ease: 'sine.inOut',
      stagger: {
        each: 0.092,
        from: 'start',
      },
    });

    // Badges stay invisible through the text phase, then slowly fall from behind the heading.
    const badgeDropStart = revealChars.length * 0.092 + 0.72;

    timeline
      .to(
        badgeElements,
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotate: 0,
          filter: 'blur(0px)',
          duration: 2.9,
          ease: 'power4.out',
          stagger: {
            each: 0.3,
            from: 'start',
          },
        },
        badgeDropStart,
      )
      .to(
        badgeElements,
        {
          y: (index) => (index % 2 === 0 ? -7 : 7),
          duration: 0.28,
          ease: 'power1.out',
          stagger: 0.06,
        },
        badgeDropStart + 2.42,
      )
      .to(badgeElements, {
        y: 0,
        duration: 0.62,
        ease: 'power3.out',
        stagger: 0.04,
      });
  }

  private showReducedMotionState(headingChars: HTMLElement[], badgeElements: HTMLElement[]): void {
    gsap.set(headingChars, {
      color: (_: number, target: Element) => this.finalColor(target as HTMLElement),
      WebkitTextFillColor: (_: number, target: Element) =>
        this.finalFillColor(target as HTMLElement),
      WebkitTextStrokeColor: HIGHLIGHT_COLOR,
      textShadow: HIGHLIGHT_SHADOW,
    });
    gsap.set(badgeElements, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      filter: 'blur(0px)',
    });
  }

  private finalColor(target: HTMLElement): string {
    return target.dataset['outlined'] === 'true' ? 'transparent' : HIGHLIGHT_COLOR;
  }

  private finalFillColor(target: HTMLElement): string {
    return target.dataset['outlined'] === 'true' ? 'transparent' : HIGHLIGHT_COLOR;
  }
}
