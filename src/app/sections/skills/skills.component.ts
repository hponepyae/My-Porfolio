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

type HeadingSegment = {
  text: string;
  outlined?: boolean;
};

type HeadingChar = {
  char: string;
  outlined: boolean;
};

type HeadingLine = {
  text: string;
  chars: HeadingChar[];
  compact: boolean;
};

const HIGHLIGHT_COLOR = '#ffbe0c';
const HIGHLIGHT_SHADOW = 'none';
const OUTLINE_COLOR = '#FF8C42';
const OUTLINE_STROKE = 'transparent';
const CHAR_STAGGER = 0.092;
const CHAR_REVEAL_DURATION = 0.34;

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

  // Marker strokes in the brush SVG's 400x28 viewBox: rounded start, tapering to a point on the right.
  // Lines alternate between a stroke that rises to the right and a gentler one that dips.
  readonly brushStrokes = {
    up: {
      shape:
        'M8 16.5 C 60 12.5, 140 9.5, 230 7.5 C 300 6, 360 4.6, 397 5 C 362 10.5, 302 14.2, 230 17.8 ' +
        'C 150 21.4, 70 24.6, 13 25.2 C 3 25.4, 1.5 17.2, 8 16.5 Z',
      reveal: 'M-30 22 C 100 17, 250 11, 430 5',
    },
    down: {
      shape:
        'M8 4.65 C 60 5.5, 140 6.6, 230 7.85 C 300 9.6, 360 14.4, 397 17 C 362 18.8, 302 18.6, 230 18.15 ' +
        'C 150 16.8, 70 14.6, 13 13.6 C 3 13.8, 1.5 5.4, 8 4.65 Z',
      reveal: 'M-30 8 C 100 11, 250 14, 430 19',
    },
  };

  // Long lines are compact so they fit on one line on small screens.
  readonly headingLines: HeadingLine[] = [
    this.createHeadingLine([{ text: 'Mastering' }]),
    this.createHeadingLine([{ text: 'The Tools', outlined: true }]),
    this.createHeadingLine([{ text: 'Digital Experiences' }], true),
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

  private createHeadingLine(segments: HeadingSegment[], compact = false): HeadingLine {
    return {
      text: segments.map((segment) => segment.text).join(''),
      chars: segments.flatMap((segment) =>
        Array.from(segment.text.toUpperCase()).map((char) => ({
          char,
          outlined: !!segment.outlined,
        })),
      ),
      compact,
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
      textShadow: 'none',
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

    timeline.to(revealChars, {
      color: (_: number, target: Element) => this.finalColor(target as HTMLElement),
      WebkitTextFillColor: (_: number, target: Element) =>
        this.finalFillColor(target as HTMLElement),
      WebkitTextStrokeColor: (_: number, target: Element) =>
        this.finalStrokeColor(target as HTMLElement),
      textShadow: HIGHLIGHT_SHADOW,
      duration: CHAR_REVEAL_DURATION,
      ease: 'sine.inOut',
      stagger: {
        each: CHAR_STAGGER,
        from: 'start',
      },
    });

    this.addUnderlineTweens(timeline, headingGroups, revealChars);

    // Badges stay invisible through the text phase, then slowly fall from behind the heading.
    const badgeDropStart = revealChars.length * CHAR_STAGGER + 0.72;

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

  // Each line's brush stroke is painted in lockstep with its letters by drawing the mask path.
  private addUnderlineTweens(
    timeline: gsap.core.Timeline,
    headingGroups: HTMLElement[][],
    revealChars: HTMLElement[],
  ): void {
    this.getBrushReveals().forEach((reveal, lineIndex) => {
      const lineChars = (headingGroups[lineIndex] ?? []).filter((char) => char.textContent?.trim());

      if (!lineChars.length) {
        return;
      }

      const start = revealChars.indexOf(lineChars[0]) * CHAR_STAGGER;
      const end =
        revealChars.indexOf(lineChars[lineChars.length - 1]) * CHAR_STAGGER + CHAR_REVEAL_DURATION;

      gsap.set(reveal, { attr: { 'stroke-dashoffset': 1 } });
      timeline.to(
        reveal,
        { attr: { 'stroke-dashoffset': 0 }, duration: end - start, ease: 'none' },
        start,
      );
    });
  }

  private getBrushReveals(): SVGPathElement[] {
    const section = this.elementRef.nativeElement as HTMLElement;
    return Array.from(
      section.querySelectorAll('.skills-brush__reveal') as NodeListOf<SVGPathElement>,
    );
  }

  private showReducedMotionState(headingChars: HTMLElement[], badgeElements: HTMLElement[]): void {
    gsap.set(this.getBrushReveals(), { attr: { 'stroke-dashoffset': 0 } });
    gsap.set(headingChars, {
      color: (_: number, target: Element) => this.finalColor(target as HTMLElement),
      WebkitTextFillColor: (_: number, target: Element) =>
        this.finalFillColor(target as HTMLElement),
      WebkitTextStrokeColor: (_: number, target: Element) =>
        this.finalStrokeColor(target as HTMLElement),
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
    return target.dataset['outlined'] === 'true' ? OUTLINE_COLOR : HIGHLIGHT_COLOR;
  }

  private finalFillColor(target: HTMLElement): string {
    return target.dataset['outlined'] === 'true' ? OUTLINE_COLOR : HIGHLIGHT_COLOR;
  }

  private finalStrokeColor(target: HTMLElement): string {
    return target.dataset['outlined'] === 'true' ? OUTLINE_STROKE : HIGHLIGHT_COLOR;
  }
}
