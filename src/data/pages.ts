export type PageMeta = {
  title: string;
  description: string;
  ogDescription?: string;
  ogPrompt: string;
};

export const pagesMeta = {
  index: {
    title: 'Harrison Crosse',
    description: 'Software engineer building data infrastructure and tooling.',
    ogPrompt: 'crosse.dev ~ $ eza',
  },
  about: {
    title: 'About',
    description:
      'Software engineer passionate about data infrastructure and tooling. Fan of music, film, and the outdoors.',
    ogDescription: 'Background and interests.',
    ogPrompt: 'crosse.dev ~ $ glow about.md',
  },
  work: {
    title: 'Work',
    description:
      'Career history in data infrastructure, data engineering, and software at Docker, Calendly, Sayari, and more.',
    ogDescription: 'Career history and projects.',
    ogPrompt: 'crosse.dev ~ $ glow work.md',
  },
  contact: {
    title: 'Contact',
    description:
      'Get in touch with Harrison Crosse via email, GitHub, or LinkedIn.',
    ogDescription: 'Get in touch.',
    ogPrompt: 'crosse.dev ~ $ bat -pp contact.yaml',
  },
  colophon: {
    title: 'Colophon',
    description:
      'How this site is built, with Astro, Tailwind CSS, Berkeley Mono, and Cloudflare Pages.',
    ogDescription: 'How this site is built.',
    ogPrompt: 'crosse.dev ~ $ glow colophon.md',
  },
  blog: {
    title: 'Blog',
    description:
      'Writing on data infrastructure, software engineering, and tooling.',
    ogPrompt: 'crosse.dev ~/blog $ eza -lr -s date -t created',
  },
} satisfies Record<string, PageMeta>;

export type PageKey = keyof typeof pagesMeta;

export const blogPostOgPrompt = (id: string) =>
  `crosse.dev ~/blog $ glow -s blog ${id}.md`;
