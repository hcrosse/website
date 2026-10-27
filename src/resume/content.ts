export const resume = {
  identity: {
    name: "Harrison Crosse",
    email: "harrison@crosse.dev",
    phone: {
      number: "703-472-7202",
      url: "tel:+17034727202",
    },
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
        "Co-designed Marlin, the event and audit log platform behind Docker's product analytics and AI governance audit logs, on Go, Kafka, and Iceberg.",
        "Led the backend for Audit Insights, Docker's AI governance analytics, through launch, then designed an exactly-once streaming rewrite using ClickHouse.",
        "Raised audit log ingestion throughput 8× per worker by batching and pipelining Postgres writes.",
        "Built Marlin's browser, Node.js, and Rust SDKs on shared protobuf data contracts and moved Docker's web and inference services onto them, which let Docker retire Heap and cut Segment volume >75%.",
        "Designed and built automatic, schema-driven PII management for Marlin, part of Docker's ISO 27701 certification.",
        "Built the service that delivers customers' audit logs to their SIEMs, such as Splunk and Datadog, and made its Postgres work queue 3.5× cheaper to poll.",
        "Deployed the Flink infrastructure for real-time risk scoring of AI agent activity, and took its alerting service from design to a working demo in less than a week.",
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
        "Built Calendly's data platform from the ground up: Redshift to BigQuery migration, Airflow, CI/CD, data quality, and developer tooling.",
        "Ran production Flink pipelines on Kubernetes over Debezium CDC to power AI-transcribed meeting notes, with 6TB of state and peaks of 50k records/s.",
        "Replaced spreadsheet-defined schemas with GitOps data contracts for hundreds of Segment events, and reprocessed 50TB of replays in Spark.",
      ],
    },
    {
      company: "Amobee",
      url: "https://www.amobee.com/",
      roles: [{ title: "Software Engineer, Data Systems", start: "2021", end: "2022" }],
      highlights: [
        "Moved clickstream processing from batch Spark to Structured Streaming, and Spark from EMR to Kubernetes, eliminating EMR service charges.",
      ],
    },
    {
      company: "Sayari",
      url: "https://sayari.com/",
      roles: [{ title: "Data Engineer", start: "2020", end: "2021" }],
      highlights: [
        "Built scraping and fastText NER pipelines for corporate registry data, and migrated infrastructure from GCP to AWS GovCloud with Terraform.",
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
      items: ["Bash", "Go", "Java", "Python", "Rust", "SQL", "TLA+", "TypeScript"],
    },
    {
      category: "Data Systems",
      items: [
        "Airflow",
        "Arrow",
        "BigQuery",
        "ClickHouse",
        "DataFusion",
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

export type ResumeContent = typeof resume
