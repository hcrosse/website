export type PageMeta = {
  title: string;
  description: string;
  ogPrompt: string;
};

export const pagesMeta = {
  index: {
    title: 'Harrison Crosse',
    description:
      'Harrison Crosse — software engineer building data infrastructure and tooling.',
    ogPrompt: 'crosse.dev ~ $ eza',
  },
  about: {
    title: 'About',
    description: 'Background and interests.',
    ogPrompt: 'crosse.dev ~ $ glow about.md',
  },
  work: {
    title: 'Work',
    description: 'Work history and projects.',
    ogPrompt: 'crosse.dev ~ $ glow work.md',
  },
  contact: {
    title: 'Contact',
    description: 'Get in touch.',
    ogPrompt: 'crosse.dev ~ $ bat -pp contact.yaml',
  },
  colophon: {
    title: 'Colophon',
    description: 'How this site is built.',
    ogPrompt: 'crosse.dev ~ $ glow colophon.md',
  },
  blog: {
    title: 'Blog',
    description: 'Writing on data, software, and tooling.',
    ogPrompt: 'crosse.dev ~/blog $ eza -lr -s date -t created',
  },
} satisfies Record<string, PageMeta>;

export type PageKey = keyof typeof pagesMeta;

export const blogPostOgPrompt = (id: string) =>
  `crosse.dev ~/blog $ glow -s blog ${id}.md`;
