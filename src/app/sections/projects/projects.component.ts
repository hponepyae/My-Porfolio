import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

type ProjectCard = {
  title: string;
  tag: string;
  description: string;
};

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [NgFor],
  templateUrl: './projects.component.html',
})
export class ProjectsComponent {
  protected readonly projects: ProjectCard[] = [
    {
      title: 'Case Study One',
      tag: 'UI / UX',
      description: 'Landing page redesign with a bold, modern hero layout.',
    },
    {
      title: 'Case Study Two',
      tag: 'Web App',
      description: 'Dashboard UI with reusable components and clean hierarchy.',
    },
    {
      title: 'Case Study Three',
      tag: 'Brand',
      description: 'Typography-driven identity and responsive layout system.',
    },
    {
      title: 'Case Study Four',
      tag: 'Mobile',
      description: 'Mobile-first flow with polished micro-interactions.',
    },
    {
      title: 'Case Study Five',
      tag: 'E-commerce',
      description: 'Product listing and checkout UX with strong conversion focus.',
    },
    {
      title: 'Case Study Six',
      tag: 'Prototype',
      description: 'High-fidelity prototype and motion spec handoff.',
    },
  ];
}

