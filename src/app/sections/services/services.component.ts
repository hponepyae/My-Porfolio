import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

type Service = {
  title: string;
  points: string[];
};

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [NgFor],
  templateUrl: './services.component.html',
})
export class ServicesComponent {
  protected readonly services: Service[] = [
    {
      title: 'UI/UX Design',
      points: ['Wireframes → hi-fi', 'Clear hierarchy', 'Accessibility-minded'],
    },
    {
      title: 'Frontend Development',
      points: ['Angular / React', 'Tailwind systems', 'Performance & SEO basics'],
    },
    {
      title: 'Design Systems',
      points: ['Tokens & components', 'Consistency at scale', 'Handoff + docs'],
    },
  ];

  protected readonly timeline = [
    {
      role: 'UI/UX Designer',
      company: 'Company Name',
      period: '2024 — Present',
      summary: 'Owned UI delivery across key product flows and design system.',
    },
    {
      role: 'Frontend Developer',
      company: 'Company Name',
      period: '2022 — 2024',
      summary: 'Built responsive pages, components, and interaction patterns.',
    },
  ];
}

