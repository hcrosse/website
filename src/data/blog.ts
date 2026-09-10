export type BlogSummary = {
  readonly id: string;
  readonly data: {
    readonly title: string;
    readonly description: string;
    readonly date: Readonly<Date>;
  };
};

export function newestFirst(a: BlogSummary, b: BlogSummary): number {
  return b.data.date.getTime() - a.data.date.getTime();
}
