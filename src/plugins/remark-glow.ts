import type { Heading, Parent, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

const remarkGlow: Plugin<[], Root> = () => {
  return (tree, file: { readonly history: readonly string[] }) => {
    const [filename = ""] = file.history;
    const isPage = filename.includes("/content/pages/");
    visit(tree, "text", (node) => {
      if (node.value.includes("{year}")) {
        node.value = node.value.replaceAll("{year}", String(new Date().getFullYear()));
      }
    });

    if (isPage) {
      visit(
        tree,
        "heading",
        (node: Heading, index: number | undefined, parent: Parent | undefined) => {
          const position = index ?? -1;

          if (!parent || position < 0) return;
          const prefix = "#".repeat(node.depth) + " ";
          parent.children[position] = {
            type: "paragraph",
            data: { hProperties: { className: ["glow-heading"] } },
            children: [{ type: "text", value: prefix }, ...node.children],
          };
        },
      );
    }
  };
};

export default remarkGlow;
