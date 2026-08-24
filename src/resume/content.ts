export type ResumeContent = {
  identity: {
    name: string;
    email: string;
    phone: string;
    linkedin: {
      handle: string;
      url: string;
    };
    github: {
      handle: string;
      url: string;
    };
    location: string;
  };
  employment: Array<{
    company: string;
    roles: Array<{
      title: string;
      start: string;
      end: string;
    }>;
    highlights: string[];
  }>;
  education: {
    institution: string;
    degree: string;
    minor: string;
    year: string;
  };
  tools: Array<{
    category: string;
    items: string[];
  }>;
  selectedWork: Array<{
    name: string;
    description: string;
    url?: string;
  }>;
};

function assertRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
}

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${path} must be a non-empty string`);
  }
}

function assertArray(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${path} must be a non-empty array`);
  }
}

function assertResumeContent(value: unknown): asserts value is ResumeContent {
  assertRecord(value, "resume");

  assertRecord(value.identity, "identity");
  assertString(value.identity.name, "identity.name");
  assertString(value.identity.email, "identity.email");
  assertString(value.identity.phone, "identity.phone");
  assertRecord(value.identity.linkedin, "identity.linkedin");
  assertString(value.identity.linkedin.handle, "identity.linkedin.handle");
  assertString(value.identity.linkedin.url, "identity.linkedin.url");
  assertRecord(value.identity.github, "identity.github");
  assertString(value.identity.github.handle, "identity.github.handle");
  assertString(value.identity.github.url, "identity.github.url");
  assertString(value.identity.location, "identity.location");

  assertArray(value.employment, "employment");
  value.employment.forEach((job, jobIndex) => {
    const path = `employment[${jobIndex}]`;
    assertRecord(job, path);
    assertString(job.company, `${path}.company`);
    assertArray(job.roles, `${path}.roles`);
    job.roles.forEach((role, roleIndex) => {
      const rolePath = `${path}.roles[${roleIndex}]`;
      assertRecord(role, rolePath);
      assertString(role.title, `${rolePath}.title`);
      assertString(role.start, `${rolePath}.start`);
      assertString(role.end, `${rolePath}.end`);
    });
    assertArray(job.highlights, `${path}.highlights`);
    job.highlights.forEach((highlight, highlightIndex) => {
      assertString(highlight, `${path}.highlights[${highlightIndex}]`);
    });
  });

  assertRecord(value.education, "education");
  assertString(value.education.institution, "education.institution");
  assertString(value.education.degree, "education.degree");
  assertString(value.education.minor, "education.minor");
  assertString(value.education.year, "education.year");

  assertArray(value.tools, "tools");
  value.tools.forEach((group, groupIndex) => {
    const path = `tools[${groupIndex}]`;
    assertRecord(group, path);
    assertString(group.category, `${path}.category`);
    assertArray(group.items, `${path}.items`);
    group.items.forEach((item, itemIndex) => {
      assertString(item, `${path}.items[${itemIndex}]`);
    });
  });

  assertArray(value.selectedWork, "selectedWork");
  value.selectedWork.forEach((work, workIndex) => {
    const path = `selectedWork[${workIndex}]`;
    assertRecord(work, path);
    assertString(work.name, `${path}.name`);
    assertString(work.description, `${path}.description`);
    if (work.url !== undefined) {
      assertString(work.url, `${path}.url`);
    }
  });
}

export function parseResumeContent(value: unknown): ResumeContent {
  assertResumeContent(value);
  return value;
}

export function sortToolItems(items: string[]): string[] {
  return items.toSorted((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

const loremIpsum = "Lorem ipsum dolor sit amet.";

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
      roles: [{ title: "Senior Software Engineer", start: "2025", end: "Present" }],
      highlights: [loremIpsum],
    },
    {
      company: "Calendly",
      roles: [
        { title: "Senior Data Engineer", start: "2024", end: "2025" },
        { title: "Data Engineer", start: "2022", end: "2024" },
      ],
      highlights: [loremIpsum],
    },
    {
      company: "Amobee",
      roles: [{ title: "Software Engineer, Data Systems", start: "2021", end: "2022" }],
      highlights: [loremIpsum],
    },
    {
      company: "Sayari Labs",
      roles: [{ title: "Data Engineer", start: "2020", end: "2021" }],
      highlights: [loremIpsum],
    },
    {
      company: "Booz Allen Hamilton",
      roles: [{ title: "Data Scientist", start: "2019", end: "2020" }],
      highlights: [loremIpsum],
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
      name: "crosse.dev",
      description: loremIpsum,
      url: "https://crosse.dev",
    },
  ],
};
