import { describe, expect, test } from "bun:test";
import { generalResume, parseResumeContent, sortToolItems } from "./content";

describe("parseResumeContent", () => {
  test("accepts the general resume", () => {
    expect(parseResumeContent(generalResume)).toEqual(generalResume);
  });

  test("defines the requested contact details", () => {
    expect(generalResume.identity).toEqual({
      name: "Harrison Crosse",
      email: "harrison@crosse.dev",
      phone: "703-472-7202",
      linkedin: {
        handle: "hcrosse",
        url: "https://linkedin.com/in/hcrosse",
      },
      github: {
        handle: "hcrosse",
        url: "https://github.com/hcrosse",
      },
      location: "Arlington, VA, US",
    });
  });

  test("groups tools by capability", () => {
    expect(generalResume.tools).toEqual([
      {
        category: "Languages",
        items: ["Bash", "C", "Go", "Java", "Python", "Rust", "SQL", "TypeScript"],
      },
      {
        category: "Data Systems",
        items: [
          "Airflow",
          "Arrow",
          "BigQuery",
          "ClickHouse",
          "dbt",
          "Debezium",
          "Flink",
          "Iceberg",
          "Kafka",
          "Parquet",
          "PostgreSQL",
          "Protobuf",
          "Snowflake",
          "Spark",
        ],
      },
      {
        category: "Infrastructure",
        items: [
          "Argo",
          "AWS",
          "Docker",
          "GCP",
          "GitHub Actions",
          "Grafana",
          "Helm",
          "Kubernetes",
          "Linux",
          "Terraform",
        ],
      },
    ]);
  });

  test("sorts rendered tool items without mutating content", () => {
    const items = ["TypeScript", "Bash", "dbt", "AWS"];
    expect(sortToolItems(items)).toEqual(["AWS", "Bash", "dbt", "TypeScript"]);
    expect(items).toEqual(["TypeScript", "Bash", "dbt", "AWS"]);
  });

  test("groups Calendly role progression under one employer", () => {
    const calendly = generalResume.employment.filter((job) => job.company === "Calendly");
    expect(calendly).toHaveLength(1);
    expect(calendly[0].roles).toEqual([
      { title: "Senior Data Engineer", start: "2024", end: "2025" },
      { title: "Data Engineer", start: "2022", end: "2024" },
    ]);
  });

  test("defines the general resume education", () => {
    expect(generalResume.education).toEqual({
      institution: "University of Mary Washington",
      degree: "B.S. Computer Science",
      minor: "Minor in Data Science",
      year: "2019",
    });
  });

  test("highlights grouped upstream contributions", () => {
    expect(generalResume.selectedWork).toEqual([
      {
        name: "DataFusion / Ballista",
        description:
          "Upstreamed non-blocking distributed shuffle execution by exposing async batch partitioning in DataFusion and offloading Ballista shuffle writes from query workers.",
        links: [
          {
            label: "DataFusion #21341",
            url: "https://github.com/apache/datafusion/pull/21341",
          },
          {
            label: "Ballista #1537",
            url: "https://github.com/apache/datafusion-ballista/pull/1537",
          },
        ],
      },
      {
        name: "Apache Iceberg / Arrow Go",
        description:
          "Improved Parquet writer compatibility by adding table-level page-version configuration to Iceberg and fixing invalid root-schema serialization in Arrow Go.",
        links: [
          {
            label: "Iceberg #15700",
            url: "https://github.com/apache/iceberg/pull/15700",
          },
          {
            label: "Arrow Go #723",
            url: "https://github.com/apache/arrow-go/pull/723",
          },
        ],
      },
    ]);
  });

  test.each([
    ["missing name", { ...generalResume, identity: { ...generalResume.identity, name: "" } }],
    ["missing phone", { ...generalResume, identity: { ...generalResume.identity, phone: "" } }],
    ["empty employment", { ...generalResume, employment: [] }],
    [
      "empty highlight",
      {
        ...generalResume,
        employment: [{ ...generalResume.employment[0], highlights: [""] }],
      },
    ],
    ["empty tools", { ...generalResume, tools: [] }],
    [
      "empty selected-work links",
      {
        ...generalResume,
        selectedWork: [{ ...generalResume.selectedWork[0], links: [] }],
      },
    ],
    [
      "empty tool item",
      {
        ...generalResume,
        tools: [{ category: "Languages", items: [""] }],
      },
    ],
  ])("rejects %s", (_name, value) => {
    expect(() => parseResumeContent(value)).toThrow();
  });
});
