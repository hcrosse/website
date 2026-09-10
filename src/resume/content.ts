export type ResumeContent = {
  identity: {
    name: string
    email: string
    phone: string
    linkedin: {
      handle: string
      url: string
    }
    github: {
      handle: string
      url: string
    }
    location: string
  }
  employment: Array<{
    company: string
    url: string
    roles: Array<{
      title: string
      start: string
      end: string
    }>
    highlights: string[]
  }>
  education: {
    institution: string
    degree: string
    minor: string
    year: string
  }
  tools: Array<{
    category: string
    items: string[]
  }>
  selectedWork: Array<{
    name: string
    description: string
    links: Array<{
      label: string
      url: string
    }>
  }>
}

export function sortToolItems(items: readonly string[]): string[] {
  return items.toSorted((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))
}

export const generalResume: ResumeContent = {
  identity: {
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
  },
  employment: [
    {
      company: "Docker",
      url: "https://www.docker.com/",
      roles: [{ title: "Senior Software Engineer", start: "2025", end: "Present" }],
      highlights: [
        "Co-designed Marlin, Docker's event platform, to handle tens of thousands of events per second. Established its SDK and ingestion architecture and guided expansion into stream processing and audit-log analytics.",
        "Built Marlin SDKs for browser, Node.js, and Rust around shared protobuf contracts. Productionized them with batching, retries, integration tests, and release automation.",
        "Designed Marlin's privacy architecture and annotation-driven PII handling across SDKs, ingestion workers, and Iceberg, supporting Docker's ISO 27701 certification.",
      ],
    },
    {
      company: "Calendly",
      url: "https://calendly.com/",
      roles: [
        { title: "Senior Data Engineer", start: "2024", end: "2025" },
        { title: "Data Engineer", start: "2022", end: "2024" },
      ],
      highlights: [
        "Built Calendly's data platform from the ground up, migrating Postgres and event data from Redshift to BigQuery and establishing Airflow, CI/CD, data quality, and developer tooling.",
        "Processed 50 TB of malformed Segment replay data with Spark for BigQuery.",
        "Built production Flink pipelines processing thousands of records per second with hundreds of gigabytes of state. Added observability, blue-green deployments, data-quality checks for cutovers, and E2E tests.",
        "Replaced unreliable Google Sheets-defined schemas with a GitOps Data Contracts workflow across hundreds of Segment event types.",
      ],
    },
    {
      company: "Amobee",
      url: "https://www.amobee.com/",
      roles: [{ title: "Software Engineer, Data Systems", start: "2021", end: "2022" }],
      highlights: [
        "Migrated clickstream processing from batch Spark to Structured Streaming, making data continuously available downstream.",
        "Moved Spark workloads from EMR to Kubernetes with Spark Operator, standardizing deployments and eliminating EMR service charges.",
      ],
    },
    {
      company: "Sayari",
      url: "https://sayari.com/",
      roles: [{ title: "Data Engineer", start: "2020", end: "2021" }],
      highlights: [
        "Built scraping and fastText NER pipelines to transform corporate registry data into structured entities and social graphs.",
        "Migrated Sayari's cloud infrastructure from GCP to AWS GovCloud using Terraform and Docker.",
      ],
    },
    {
      company: "Booz Allen Hamilton",
      url: "https://www.boozallen.com/",
      roles: [{ title: "Data Scientist", start: "2019", end: "2020" }],
      highlights: [
        "Modeled Marine Corps unit performance for the Inspector General using clustering and gradient-boosted trees.",
      ],
    },
  ],
  education: {
    institution: "University of Mary Washington",
    degree: "B.S. Computer Science",
    minor: "Minor in Data Science",
    year: "2019",
  },
  tools: [
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
  ],
  selectedWork: [
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
  ],
}
