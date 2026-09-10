import type satori from "satori"

import type { PageMeta } from "./pages"

type SatoriNode = Parameters<typeof satori>[0]

function titleBlock(title: string, description: string): SatoriNode {
  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", gap: 20, marginBottom: 40 },
      children: [
        {
          type: "div",
          props: {
            style: { color: "#cdd6f4", fontSize: 88, fontWeight: 700, lineHeight: 1.1 },
            children: title,
          },
        },
        {
          type: "div",
          props: { style: { color: "#6c7086", fontSize: 34 }, children: description },
        },
      ],
    },
  }
}

export function ogCard(meta: PageMeta): SatoriNode {
  return {
    type: "div",
    props: {
      style: {
        background: "#1e1e2e",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "80px 72px 60px",
        fontFamily: "BerkeleyMono",
      },
      children: [
        {
          type: "div",
          props: { style: { color: "#a6e3a1", fontSize: 26 }, children: meta.ogPrompt },
        },
        titleBlock(meta.title, meta.ogDescription ?? meta.description),
      ],
    },
  }
}
