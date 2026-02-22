import { visit } from 'unist-util-visit';

export default function remarkGlow() {
  return (tree, file) => {
    const isPage = file.history?.[0]?.includes('/content/pages/');
    visit(tree, 'text', (node) => {
      if (node.value.includes('{year}')) {
        node.value = node.value.replace(
          /\{year\}/g,
          String(new Date().getFullYear()),
        );
      }
    });

    if (isPage) {
      visit(tree, 'heading', (node, index, parent) => {
        const prefix = '#'.repeat(node.depth) + ' ';
        parent.children[index] = {
          type: 'paragraph',
          data: { hProperties: { className: ['glow-heading'] } },
          children: [{ type: 'text', value: prefix }, ...node.children],
        };
      });
    }
  };
}
