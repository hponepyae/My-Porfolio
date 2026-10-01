import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';

// Share of the pinned scroll spent moving the name up; the rest holds it over the portrait
// so one more scroll is needed before the page moves on.
const NAME_TRAVEL_SHARE = 0.74;

// Fraction of the remaining distance the thermal effect covers per frame.
const THERMAL_EASE = 0.12;
const CHARACTER_SVG_URL = '/character-entrance/character.svg';
const MAX_PUPIL_X = 20;
const MAX_PUPIL_Y = 16;
const MAX_HEAD_TILT = 7;
const ENTRANCE_LOADING_DURATION = 8000;
const ENTRANCE_BLACKOUT_DURATION = 280;

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.css'],
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  @ViewChild('characterMount') private characterMount!: ElementRef<HTMLDivElement>;
  @ViewChild('loadingBar') private loadingBar!: ElementRef<HTMLDivElement>;
  @ViewChild('loadingFill') private loadingFill!: ElementRef<HTMLDivElement>;

  entranceVisible = true;
  entranceExiting = false;
  bulbReady = false;
  blackoutActive = false;

  private pinned: HTMLElement | null = null;

  private characterSvg: SVGSVGElement | null = null;
  private character: SVGGElement | null = null;
  private headFollowLayer: SVGGElement | null = null;
  private leftPupil: SVGCircleElement | null = null;
  private rightPupil: SVGCircleElement | null = null;
  private leftCatchlight: SVGCircleElement | null = null;
  private rightCatchlight: SVGCircleElement | null = null;
  private headHitArea: SVGEllipseElement | null = null;
  private entranceFrame: number | null = null;
  private loadingFrame: number | null = null;
  private reactionTimer: number | null = null;
  private exitTimer: number | null = null;
  private loadingStartedAt = 0;
  private lastEntranceFrame = 0;
  private entranceListenersAttached = false;
  private orientationListenerAttached = false;
  private orientationDataActive = false;
  private orientationPermissionRequested = false;
  private orientationBaseline: { beta: number; gamma: number } | null = null;
  private orientationSensorWaiting = false;
  private orientationFallbackTimer: number | null = null;
  private entranceTarget = { x: 0, y: 0, active: false };
  private entranceCurrent = { x: 0, y: 0 };
  private entranceTilt = 0;
  private entranceReacting = false;
  private readonly characterAbortController = new AbortController();

  // Layout numbers cached by measure() so scrolling itself never has to read layout.
  private scrollStart = 0;
  private scrollable = 0;

  private progress = 0;
  private fxCurrent = 0;
  private frame: number | null = null;
  private reduceMotion = false;

  constructor(
    private host: ElementRef<HTMLElement>,
    private zone: NgZone,
  ) {}

  ngAfterViewInit() {
    this.pinned = this.host.nativeElement.querySelector('.hero-pinned');
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.onWindowResize();
    this.zone.runOutsideAngular(() => {
      this.startEntranceLoading();
      void this.loadCharacter();
    });
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

  onEntrancePointerDown() {
    void this.requestOrientationPermission();
  }

  private async loadCharacter() {
    this.attachEntranceListeners();

    try {
      const response = await fetch(CHARACTER_SVG_URL, {
        signal: this.characterAbortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Character SVG request failed with ${response.status}`);
      }

      const svgText = await response.text();
      const documentRoot = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
      if (documentRoot.tagName.toLowerCase() !== 'svg') {
        throw new Error('Character asset is not an SVG document');
      }

      const svg = document.importNode(documentRoot, true) as unknown as SVGSVGElement;
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('id', 'characterSvg');
      svg.setAttribute('role', 'button');
      svg.setAttribute('tabindex', '0');
      svg.setAttribute('focusable', 'true');
      svg.setAttribute('aria-label', 'Interactive character. Activate to enter the portfolio.');
      svg.querySelector('title')?.remove();
      svg.querySelector('desc')?.remove();

      this.characterMount.nativeElement.replaceChildren(svg);
      this.characterSvg = svg;
      this.character = svg.querySelector<SVGGElement>('#character');
      this.leftPupil = svg.querySelector<SVGCircleElement>('#leftPupil');
      this.rightPupil = svg.querySelector<SVGCircleElement>('#rightPupil');
      this.leftCatchlight = svg.querySelector<SVGCircleElement>('#leftCatchlight');
      this.rightCatchlight = svg.querySelector<SVGCircleElement>('#rightCatchlight');
      this.headHitArea = svg.querySelector<SVGEllipseElement>('#headHitArea');

      if (!this.character || !this.leftPupil || !this.rightPupil || !this.headHitArea) {
        throw new Error('Character SVG is missing its interactive elements');
      }

      this.configureEyeOverlay(svg);

      this.headHitArea.addEventListener('pointerup', this.activateFromPointer, { passive: false });
      svg.addEventListener('keydown', this.activateFromKeyboard);

      if (!this.reduceMotion) {
        this.entranceFrame = requestAnimationFrame(this.renderEntrance);
      }
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return;

      // The portfolio should remain usable if an optional entrance asset fails to load.
      this.zone.run(() => {
        this.entranceVisible = false;
      });
      this.stopEntrance();
    }
  }

  private attachEntranceListeners() {
    if (this.entranceListenersAttached) return;

    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', this.handlePointerDown, { passive: true });
    window.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    window.addEventListener('blur', this.resetEntranceTarget, { passive: true });
    this.attachOrientationListenerIfAvailable();
    this.entranceListenersAttached = true;
  }

  private startEntranceLoading() {
    this.loadingStartedAt = performance.now();
    this.loadingFrame = requestAnimationFrame(this.renderEntranceLoading);
  }

  private readonly renderEntranceLoading = (timestamp: number) => {
    if (!this.loadingFill || !this.loadingBar || !this.entranceVisible) return;

    const progress = Math.min(1, (timestamp - this.loadingStartedAt) / ENTRANCE_LOADING_DURATION);
    const percentage = Math.round(progress * 100);
    this.loadingFill.nativeElement.style.width = `${percentage}%`;
    this.loadingBar.nativeElement.setAttribute('aria-valuenow', String(percentage));

    if (progress < 1) {
      this.loadingFrame = requestAnimationFrame(this.renderEntranceLoading);
      return;
    }

    this.loadingFrame = null;
    this.loadingBar.nativeElement.classList.add('is-complete');
    this.host.nativeElement.querySelector('.bulb-instruction')?.classList.add('is-visible');
    this.zone.run(() => {
      this.bulbReady = true;
    });
  };

  private attachOrientationListenerIfAvailable() {
    if (typeof window.DeviceOrientationEvent === 'undefined') return;

    const orientationConstructor = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof orientationConstructor.requestPermission === 'function') return;

    this.attachOrientationListener();
  }

  private attachOrientationListener() {
    if (this.orientationListenerAttached) return;

    this.orientationBaseline = null;
    window.addEventListener('deviceorientation', this.handleOrientation, { passive: true });
    window.addEventListener('deviceorientationabsolute', this.handleOrientation, { passive: true });
    this.orientationListenerAttached = true;
    this.orientationSensorWaiting = true;
    if (this.orientationFallbackTimer !== null) window.clearTimeout(this.orientationFallbackTimer);
    this.orientationFallbackTimer = window.setTimeout(() => {
      this.orientationSensorWaiting = false;
      this.orientationFallbackTimer = null;
    }, 1800);
  }

  private async requestOrientationPermission() {
    if (this.orientationPermissionRequested || typeof window.DeviceOrientationEvent === 'undefined') {
      return;
    }

    const orientationConstructor = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof orientationConstructor.requestPermission !== 'function') return;

    this.orientationPermissionRequested = true;
    this.orientationSensorWaiting = true;

    try {
      const permission = await orientationConstructor.requestPermission();
      if (permission === 'granted') {
        this.attachOrientationListener();
      } else {
        this.orientationSensorWaiting = false;
      }
    } catch {
      // Pointer/touch tracking remains active when motion permission is unavailable.
      this.orientationSensorWaiting = false;
    }
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    if (this.entranceExiting || this.orientationDataActive || this.orientationSensorWaiting || !this.characterSvg) return;
    this.setEntranceTargetFromClient(event.clientX, event.clientY);
  };

  private readonly handlePointerDown = () => {
    void this.requestOrientationPermission();
  };

  private readonly handleTouchStart = () => {
    void this.requestOrientationPermission();
  };

  private readonly handleOrientation = (event: DeviceOrientationEvent) => {
    if (this.entranceExiting || event.beta === null || event.gamma === null) return;

    this.orientationDataActive = true;
    this.orientationSensorWaiting = false;
    if (this.orientationFallbackTimer !== null) {
      window.clearTimeout(this.orientationFallbackTimer);
      this.orientationFallbackTimer = null;
    }
    if (!this.orientationBaseline) {
      this.orientationBaseline = { beta: event.beta, gamma: event.gamma };
      this.entranceTarget = { x: 0, y: 0, active: true };
      return;
    }

    // Calibrate from the phone's resting pose so portrait/landscape devices start centered.
    this.entranceTarget.x = this.clamp((event.gamma - this.orientationBaseline.gamma) / 24, -1, 1);
    this.entranceTarget.y = this.clamp((event.beta - this.orientationBaseline.beta) / 24, -1, 1);
    this.entranceTarget.active = true;
  };

  private readonly resetEntranceTarget = () => {
    this.entranceTarget.active = false;
  };

  private setEntranceTargetFromClient(clientX: number, clientY: number) {
    if (!this.characterSvg) return;

    const rect = this.characterSvg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    this.entranceTarget.x = this.clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    this.entranceTarget.y = this.clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    this.entranceTarget.active = true;
  }

  private readonly renderEntrance = (timestamp: number) => {
    this.entranceFrame = null;
    if (!this.character || !this.characterSvg || !this.entranceVisible) return;

    const deltaTime = this.lastEntranceFrame
      ? Math.min((timestamp - this.lastEntranceFrame) / 1000, 0.05)
      : 1 / 60;
    this.lastEntranceFrame = timestamp;

    const targetX = this.entranceTarget.active ? this.entranceTarget.x : 0;
    const targetY = this.entranceTarget.active ? this.entranceTarget.y : 0;
    const interpolation = 1 - Math.exp(-8 * deltaTime);
    this.entranceCurrent.x += (targetX - this.entranceCurrent.x) * interpolation;
    this.entranceCurrent.y += (targetY - this.entranceCurrent.y) * interpolation;

    const targetTilt = this.entranceCurrent.x * MAX_HEAD_TILT;
    this.entranceTilt += (targetTilt - this.entranceTilt) * interpolation;
    const pupilX = this.entranceCurrent.x * MAX_PUPIL_X;
    const pupilY = this.entranceCurrent.y * MAX_PUPIL_Y;
    const pupilTransform = `translate(${pupilX.toFixed(2)} ${pupilY.toFixed(2)})`;

    this.leftPupil?.setAttribute('transform', pupilTransform);
    this.rightPupil?.setAttribute('transform', pupilTransform);
    this.leftCatchlight?.setAttribute('transform', pupilTransform);
    this.rightCatchlight?.setAttribute('transform', pupilTransform);

    const bob = this.entranceReacting ? 0 : Math.sin(timestamp / 850) * 2.5;
    const headFollowY = this.entranceReacting ? 0 : this.entranceCurrent.y * 3;
    this.headFollowLayer?.setAttribute(
      'transform',
      `translate(0 ${(bob + headFollowY).toFixed(2)}) rotate(${this.entranceTilt.toFixed(2)} 425 430)`,
    );

    this.entranceFrame = requestAnimationFrame(this.renderEntrance);
  };

  private readonly activateFromPointer = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.enterPortfolio();
  };

  private readonly activateFromKeyboard = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    this.enterPortfolio();
  };

  onBulbActivate() {
    this.enterPortfolio();
  }

  onBulbKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    this.enterPortfolio();
  }

  private enterPortfolio() {
    if (!this.characterSvg || !this.bulbReady || this.entranceExiting) return;

    this.entranceReacting = true;
    this.entranceTarget = { x: 0, y: 0, active: false };
    this.entranceCurrent = { x: 0, y: 0 };
    this.entranceTilt = 0;
    this.leftPupil?.setAttribute('transform', 'translate(0 0)');
    this.rightPupil?.setAttribute('transform', 'translate(0 0)');
    this.leftCatchlight?.setAttribute('transform', 'translate(0 0)');
    this.rightCatchlight?.setAttribute('transform', 'translate(0 0)');
    this.characterSvg.classList.add('is-reacting');
    this.zone.run(() => {
      this.blackoutActive = true;
    });

    this.reactionTimer = window.setTimeout(() => {
      const entrance = this.host.nativeElement.querySelector<HTMLElement>('.character-entrance');
      entrance?.classList.remove('is-blackening', 'is-exiting');
      entrance?.setAttribute('aria-hidden', 'true');
      this.zone.run(() => {
        this.resetHomePosition();
        this.entranceVisible = false;
        this.entranceExiting = false;
        this.blackoutActive = false;
      });
      this.entranceReacting = false;
      this.stopEntrance();
    }, this.reduceMotion ? 80 : ENTRANCE_BLACKOUT_DURATION);
  }

  private configureEyeOverlay(svg: SVGSVGElement) {
    this.createCharacterLayers(svg);
    const eyeWhites = Array.from(svg.querySelectorAll<SVGEllipseElement>('#eyeWhites ellipse'));
    const whiteSizes = [
      { rx: '112', ry: '88', cy: '452' },
      { rx: '124', ry: '96', cy: '470' },
    ];

    eyeWhites.forEach((eye, index) => {
      const size = whiteSizes[index];
      if (!size) return;
      eye.setAttribute('rx', size.rx);
      eye.setAttribute('ry', size.ry);
      eye.setAttribute('cy', size.cy);
    });

    this.leftPupil?.setAttribute('r', '48');
    this.rightPupil?.setAttribute('r', '48');
    this.rightPupil?.setAttribute('cy', '470');
    this.rightCatchlight?.setAttribute('cy', '457');
  }

  private createCharacterLayers(svg: SVGSVGElement) {
    const artwork = svg.querySelector<SVGImageElement>('#artwork');
    const character = svg.querySelector<SVGGElement>('#character');
    const eyeWhites = svg.querySelector<SVGGElement>('#eyeWhites');
    const eyes = svg.querySelector<SVGGElement>('#eyes');
    const headHitArea = svg.querySelector<SVGEllipseElement>('#headHitArea');
    const defs = svg.querySelector('defs');

    if (!artwork || !character || !eyeWhites || !eyes || !headHitArea || !defs) return;

    const namespace = 'http://www.w3.org/2000/svg';
    const headClip = document.createElementNS(namespace, 'clipPath');
    const headClipShape = document.createElementNS(namespace, 'path');
    headClip.setAttribute('id', 'characterHeadClip');
    headClipShape.setAttribute(
      'd',
      'M 0 0 H 850 V 642 C 805 657 760 669 710 675 C 620 686 530 690 425 691 C 320 690 230 686 140 675 C 90 669 45 657 0 642 Z',
    );
    // The moving silhouette ends on the jaw line, so the neck and shirt never follow the pointer.
    headClip.append(headClipShape);

    const bodyClip = document.createElementNS(namespace, 'clipPath');
    const bodyClipShape = document.createElementNS(namespace, 'path');
    bodyClip.setAttribute('id', 'characterBodyClip');
    bodyClipShape.setAttribute(
      'd',
      'M 0 625 C 45 642 90 654 140 660 C 230 671 320 675 425 676 C 530 675 620 671 710 660 C 760 654 805 642 850 625 V 778 H 0 Z',
    );
    bodyClip.append(bodyClipShape);
    defs.append(headClip, bodyClip);

    artwork.setAttribute('clip-path', 'url(#characterBodyClip)');

    const headLayer = document.createElementNS(namespace, 'g');
    const headArtwork = artwork.cloneNode(true) as SVGImageElement;
    const reactionMouth = document.createElementNS(namespace, 'g');
    const mouthCover = document.createElementNS(namespace, 'path');
    const mouthOpening = document.createElementNS(namespace, 'path');
    const mouthTongue = document.createElementNS(namespace, 'path');

    reactionMouth.setAttribute('id', 'reactionMouth');
    reactionMouth.setAttribute('aria-hidden', 'true');
    reactionMouth.setAttribute('pointer-events', 'none');
    mouthCover.setAttribute(
      'd',
      'M 372 557 C 397 544 453 544 478 557 C 482 598 463 635 425 648 C 387 635 368 598 372 557 Z',
    );
    mouthCover.setAttribute('fill', '#dcae94');
    mouthOpening.setAttribute(
      'd',
      'M 392 572 C 410 560 440 560 458 572 C 458 610 444 636 425 642 C 406 636 392 610 392 572 Z',
    );
    mouthOpening.setAttribute('fill', '#241116');
    mouthOpening.setAttribute('stroke', '#160b0d');
    mouthOpening.setAttribute('stroke-width', '7');
    mouthTongue.setAttribute(
      'd',
      'M 400 625 C 414 615 436 615 450 625 C 447 638 438 645 425 646 C 412 645 403 638 400 625 Z',
    );
    mouthTongue.setAttribute('fill', '#d76567');
    reactionMouth.append(mouthCover, mouthOpening, mouthTongue);
    headArtwork.removeAttribute('id');
    headArtwork.setAttribute('clip-path', 'url(#characterHeadClip)');
    headLayer.setAttribute('id', 'headFollowLayer');
    headLayer.append(headArtwork, eyeWhites, eyes, reactionMouth, headHitArea);
    // Draw the stationary body after the moving layer so the small overlap hides any jaw gap.
    character.insertBefore(headLayer, artwork);
    this.headFollowLayer = headLayer;
  }

  private resetHomePosition() {
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
    this.progress = 0;
    this.fxCurrent = 0;
    this.pinned?.style.setProperty('--p', '0');
    this.pinned?.style.setProperty('--fx', '0');
  }

  private stopEntrance() {
    if (this.entranceFrame !== null) {
      cancelAnimationFrame(this.entranceFrame);
      this.entranceFrame = null;
    }
    if (this.loadingFrame !== null) {
      cancelAnimationFrame(this.loadingFrame);
      this.loadingFrame = null;
    }
    if (this.reactionTimer !== null) window.clearTimeout(this.reactionTimer);
    if (this.exitTimer !== null) window.clearTimeout(this.exitTimer);
    this.reactionTimer = null;
    this.exitTimer = null;

    if (this.entranceListenersAttached) {
      window.removeEventListener('pointermove', this.handlePointerMove);
      window.removeEventListener('pointerdown', this.handlePointerDown);
      window.removeEventListener('touchstart', this.handleTouchStart);
      window.removeEventListener('blur', this.resetEntranceTarget);
      this.entranceListenersAttached = false;
    }
    if (this.orientationListenerAttached) {
      window.removeEventListener('deviceorientation', this.handleOrientation);
      window.removeEventListener('deviceorientationabsolute', this.handleOrientation);
      this.orientationListenerAttached = false;
    }
    if (this.orientationFallbackTimer !== null) {
      window.clearTimeout(this.orientationFallbackTimer);
      this.orientationFallbackTimer = null;
    }
    this.headHitArea?.removeEventListener('pointerup', this.activateFromPointer);
    this.characterSvg?.removeEventListener('keydown', this.activateFromKeyboard);
    this.characterMount?.nativeElement.replaceChildren();
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  ngOnDestroy() {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
    }
    this.characterAbortController.abort();
    this.stopEntrance();
  }
}
