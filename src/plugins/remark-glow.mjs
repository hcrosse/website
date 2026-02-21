import { visit } from 'unist-util-visit';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const DARK_COLORS = ['#1e1e2e', '#313244', '#45475a'];

export default function remarkGlow() {
  return (tree, file) => {
    const isPage = file.history?.[0]?.includes('/content/pages/');
    visit(tree, 'text', (node) => {
      if (node.value.includes('{year}')) {
        node.value = node.value.replace(/\{year\}/g, String(new Date().getFullYear()));
      }
    });

    if (isPage) {
      visit(tree, 'heading', (node, index, parent) => {
        const prefix = '#'.repeat(node.depth) + ' ';
        parent.children[index] = {
          type: 'paragraph',
          data: { hProperties: { className: ['glow-heading'] } },
          children: [
            { type: 'text', value: prefix },
            ...node.children,
          ],
        };
      });
    }

    visit(tree, 'list', (node) => {
      const isColorList = node.children.every((item) => {
        if (item.type !== 'listItem') return false;
        const para = item.children[0];
        if (!para || para.type !== 'paragraph') return false;
        const last = para.children[para.children.length - 1];
        return last && last.type === 'inlineCode' && HEX_RE.test(last.value);
      });

      if (!isColorList) return;

      node.data = { hProperties: { className: ['color-swatches'] } };

      for (const item of node.children) {
        const para = item.children[0];
        const last = para.children[para.children.length - 1];
        const hex = last.value;
        const border = DARK_COLORS.includes(hex) ? ';border:1px solid #585b70' : '';
        para.children.unshift({
          type: 'html',
          value: `<span class="inline-block w-3 h-3 rounded-sm mr-2 align-middle" style="background:${hex}${border}"></span>`,
        });
      }
    });
  };
}
