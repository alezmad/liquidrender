import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  connectionStatusSchema,
  connectionTypeSchema,
  connectionWithHealthSchema,
  createConnectionInputSchema,
  deleteConnectionInputSchema,
  getConnectionInputSchema,
  getConnectionsInputSchema,
  testConnectionInputSchema,
} from "./schemas";

describe("connectionTypeSchema", () => {
  it.each(["postgres", "mysql", "snowflake", "bigquery", "redshift", "duckdb"])(
    "should accept valid type: %s",
    (type) => {
      expect(connectionTypeSchema.parse(type)).toBe(type);
    }
  );

  it("should reject invalid type", () => {
    expect(() => connectionTypeSchema.parse("invalid")).toThrow(ZodError);
  });

  it("should reject empty string", () => {
    expect(() => connectionTypeSchema.parse("")).toThrow(ZodError);
  });

  it("should reject null", () => {
    expect(() => connectionTypeSchema.parse(null)).toThrow(ZodError);
  });

  it("should reject undefined", () => {
    expect(() => connectionTypeSchema.parse(undefined)).toThrow(ZodError);
  });

  it("should reject number", () => {
    expect(() => connectionTypeSchema.parse(123)).toThrow(ZodError);
  });
});

describe("connectionStatusSchema", () => {
  it.each(["connected", "error", "stale"])(
    "should accept valid status: %s",
    (status) => {
      expect(connectionStatusSchema.parse(status)).toBe(status);
    }
  );

  it("should reject invalid status", () => {
    expect(() => connectionStatusSchema.parse("pending")).toThrow(ZodError);
  });

  it("should reject empty string", () => {
    expect(() => connectionStatusSchema.parse("")).toThrow(ZodError);
  });
});

describe("testConnectionInputSchema", () => {
  const validInput = {
    type: "postgres",
    host: "localhost",
    database: "testdb",
    username: "user",
    password: "pass123",
  };

  it("should accept valid input with required fields only", () => {
    const result = testConnectionInputSchema.parse(validInput);
    expect(result).toEqual({
      ...validInput,
      schema: "public", // default value
      ssl: true, // default value
    });
  });

  it("should accept valid input with all fields", () => {
    const fullInput = {
      ...validInput,
      port: 5432,
      schema: "custom_schema",
      ssl: false,
    };
    const result = testConnectionInputSchema.parse(fullInput);
    expect(result).toEqual(fullInput);
  });

  it("should apply default values for schema and ssl", () => {
    const result = testConnectionInputSchema.parse(validInput);
    expect(result.schema).toBe("public");
    expect(result.ssl).toBe(true);
  });

  describe("type field", () => {
    it("should reject invalid connection type", () => {
      expect(() =>
        testConnectionInputSchema.parse({ ...validInput, type: "oracle" })
      ).toThrow(ZodError);
    });

    it("should reject missing type", () => {
      const { type: _, ...inputWithoutType } = validInput;
      expect(() => testConnectionInputSchema.parse(inputWithoutType)).toThrow(
        ZodError
      );
    });
  });

  describe("host field", () => {
    it("should reject empty host", () => {
      expect(() =>
        testConnectionInputSchema.parse({ ...validInput, host: "" })
      ).toThrow(ZodError);
    });

    it("should reject missing host", () => {
      const { host: _, ...inputWithoutHost } = validInput;
      expect(() => testConnectionInputSchema.parse(inputWithoutHost)).toThrow(
        ZodError
      );
    });

    it("should accept various host formats", () => {
      const hosts = [
        "localhost",
        "127.0.0.1",
        "db.example.com",
        "my-database-server.region.rds.amazonaws.com",
      ];
      hosts.forEach((host) => {
        const result = testConnectionInputSchema.parse({ ...validInput, host });
        expect(result.host).toBe(host);
      });
    });
  });

  describe("port field", () => {
    it("should accept valid port number", () => {
      const result = testConnectionInputSchema.parse({
        ...validInput,
        port: 5432,
      });
      expect(result.port).toBe(5432);
    });

    it("should accept port as optional (undefined)", () => {
      const result = testConnectionInputSchema.parse(validInput);
      expect(result.port).toBeUndefined();
    });

    it("should reject negative port", () => {
      expect(() =>
        testConnectionInputSchema.parse({ ...validInput, port: -1 })
      ).toThrow(ZodError);
    });

    it("should reject zero port", () => {
      expect(() =>
        testConnectionInputSchema.parse({ ...validInput, port: 0 })
      ).toThrow(ZodError);
    });

    it("should reject non-integer port", () => {
      expect(() =>
        testConnectionInputSchema.parse({ ...validInput, port: 5432.5 })
      ).toThrow(ZodError);
    });

    it("should reject string port", () => {
      expect(() =>
        testConnectionInputSchema.parse({ ...validInput, port: "5432" })
      ).toThrow(ZodError);
    });
  });

  describe("database field", () => {
    it("should reject empty database", () => {
      expect(() =>
        testConnectionInputSchema.parse({ ...validInput, database: "" })
      ).toThrow(ZodError);
    });

    it("should reject missing database", () => {
      const { database: _, ...inputWithoutDatabase } = validInput;
      expect(() =>
        testConnectionInputSchema.parse(inputWithoutDatabase)
      ).toThrow(ZodError);
    });
  });

  describe("username field", () => {
    it("should reject empty username", () => {
      expect(() =>
        testConnectionInputSchema.parse({ ...validInput, username: "" })
      ).toThrow(ZodError);
    });

    it("should reject missing username", () => {
      const { username: _, ...inputWithoutUsername } = validInput;
      expect(() =>
        testConnectionInputSchema.parse(inputWithoutUsername)
      ).toThrow(ZodError);
    });
  });

  describe("password field", () => {
    it("should reject empty password", () => {
      expect(() =>
        testConnectionInputSchema.parse({ ...validInput, password: "" })
      ).toThrow(ZodError);
    });

    it("should reject missing password", () => {
      const { password: _, ...inputWithoutPassword } = validInput;
      expect(() =>
        testConnectionInputSchema.parse(inputWithoutPassword)
      ).toThrow(ZodError);
    });
  });

  describe("ssl field", () => {
    it("should accept boolean true", () => {
      const result = testConnectionInputSchema.parse({
        ...validInput,
        ssl: true,
      });
      expect(result.ssl).toBe(true);
    });

    it("should accept boolean false", () => {
      const result = testConnectionInputSchema.parse({
        ...validInput,
        ssl: false,
      });
      expect(result.ssl).toBe(false);
    });

    it("should reject non-boolean ssl", () => {
      expect(() =>
        testConnectionInputSchema.parse({ ...validInput, ssl: "true" })
      ).toThrow(ZodError);
    });
  });
});

describe("createConnectionInputSchema", () => {
  const validInput = {
    type: "postgres",
    host: "localhost",
    database: "testdb",
    username: "user",
    password: "pass123",
    orgId: "org_123",
  };

  it("should accept valid input with required fields", () => {
    const result = createConnectionInputSchema.parse(validInput);
    expect(result.orgId).toBe("org_123");
    expect(result.schema).toBe("public");
    expect(result.ssl).toBe(true);
  });

  it("should accept valid input with optional name", () => {
    const result = createConnectionInputSchema.parse({
      ...validInput,
      name: "My Database",
    });
    expect(result.name).toBe("My Database");
  });

  it("should reject missing orgId", () => {
    const { orgId: _, ...inputWithoutOrgId } = validInput;
    expect(() => createConnectionInputSchema.parse(inputWithoutOrgId)).toThrow(
      ZodError
    );
  });

  it("should reject empty name", () => {
    expect(() =>
      createConnectionInputSchema.parse({ ...validInput, name: "" })
    ).toThrow(ZodError);
  });

  it("should reject name exceeding 255 characters", () => {
    const longName = "a".repeat(256);
    expect(() =>
      createConnectionInputSchema.parse({ ...validInput, name: longName })
    ).toThrow(ZodError);
  });

  it("should accept name at max length (255 characters)", () => {
    const maxName = "a".repeat(255);
    const result = createConnectionInputSchema.parse({
      ...validInput,
      name: maxName,
    });
    expect(result.name).toBe(maxName);
  });

  it("should inherit all testConnectionInputSchema validations", () => {
    // Test that host validation is inherited
    expect(() =>
      createConnectionInputSchema.parse({ ...validInput, host: "" })
    ).toThrow(ZodError);

    // Test that type validation is inherited
    expect(() =>
      createConnectionInputSchema.parse({ ...validInput, type: "invalid" })
    ).toThrow(ZodError);
  });
});

describe("getConnectionInputSchema", () => {
  it("should accept valid input", () => {
    const result = getConnectionInputSchema.parse({
      id: "conn_123",
      orgId: "org_456",
    });
    expect(result).toEqual({ id: "conn_123", orgId: "org_456" });
  });

  it("should reject missing id", () => {
    expect(() =>
      getConnectionInputSchema.parse({ orgId: "org_456" })
    ).toThrow(ZodError);
  });

  it("should reject missing orgId", () => {
    expect(() =>
      getConnectionInputSchema.parse({ id: "conn_123" })
    ).toThrow(ZodError);
  });

  it("should reject empty object", () => {
    expect(() => getConnectionInputSchema.parse({})).toThrow(ZodError);
  });

  it("should accept any string for id", () => {
    const result = getConnectionInputSchema.parse({
      id: "any-string-format",
      orgId: "org_123",
    });
    expect(result.id).toBe("any-string-format");
  });
});

describe("deleteConnectionInputSchema", () => {
  it("should accept valid input", () => {
    const result = deleteConnectionInputSchema.parse({
      id: "conn_123",
      orgId: "org_456",
    });
    expect(result).toEqual({ id: "conn_123", orgId: "org_456" });
  });

  it("should reject missing id", () => {
    expect(() =>
      deleteConnectionInputSchema.parse({ orgId: "org_456" })
    ).toThrow(ZodError);
  });

  it("should reject missing orgId", () => {
    expect(() =>
      deleteConnectionInputSchema.parse({ id: "conn_123" })
    ).toThrow(ZodError);
  });

  it("should reject null values", () => {
    expect(() =>
      deleteConnectionInputSchema.parse({ id: null, orgId: "org_456" })
    ).toThrow(ZodError);
  });
});

describe("getConnectionsInputSchema", () => {
  it("should accept valid input", () => {
    const result = getConnectionsInputSchema.parse({ orgId: "org_123" });
    expect(result).toEqual({ orgId: "org_123" });
  });

  it("should reject missing orgId", () => {
    expect(() => getConnectionsInputSchema.parse({})).toThrow(ZodError);
  });

  it("should reject non-string orgId", () => {
    expect(() => getConnectionsInputSchema.parse({ orgId: 123 })).toThrow(
      ZodError
    );
  });

  it("should accept empty string orgId", () => {
    // Note: The schema doesn't have min(1), so empty string is valid
    const result = getConnectionsInputSchema.parse({ orgId: "" });
    expect(result.orgId).toBe("");
  });
});

describe("connectionWithHealthSchema", () => {
  const now = new Date();
  const validConnection = {
    id: "conn_123",
    orgId: "org_456",
    name: "Production DB",
    type: "postgres",
    host: "db.example.com",
    port: 5432,
    database: "production",
    schema: "public",
    sslEnabled: true,
    createdAt: now,
    updatedAt: now,
    health: null,
  };

  it("should accept valid connection without health", () => {
    const result = connectionWithHealthSchema.parse(validConnection);
    expect(result.id).toBe("conn_123");
    expect(result.health).toBeNull();
  });

  it("should accept valid connection with health info", () => {
    const lastCheck = new Date();
    const connectionWithHealth = {
      ...validConnection,
      health: {
        status: "connected",
        lastCheck,
        errorMessage: null,
        latencyMs: 42,
      },
    };
    const result = connectionWithHealthSchema.parse(connectionWithHealth);
    expect(result.health?.status).toBe("connected");
    expect(result.health?.latencyMs).toBe(42);
  });

  it("should accept health with error status", () => {
    const connectionWithError = {
      ...validConnection,
      health: {
        status: "error",
        lastCheck: new Date(),
        errorMessage: "Connection refused",
        latencyMs: null,
      },
    };
    const result = connectionWithHealthSchema.parse(connectionWithError);
    expect(result.health?.status).toBe("error");
    expect(result.health?.errorMessage).toBe("Connection refused");
  });

  it("should accept nullable port", () => {
    const result = connectionWithHealthSchema.parse({
      ...validConnection,
      port: null,
    });
    expect(result.port).toBeNull();
  });

  it("should accept nullable schema", () => {
    const result = connectionWithHealthSchema.parse({
      ...validConnection,
      schema: null,
    });
    expect(result.schema).toBeNull();
  });

  it("should accept nullable sslEnabled", () => {
    const result = connectionWithHealthSchema.parse({
      ...validConnection,
      sslEnabled: null,
    });
    expect(result.sslEnabled).toBeNull();
  });

  it("should reject invalid health status", () => {
    expect(() =>
      connectionWithHealthSchema.parse({
        ...validConnection,
        health: {
          status: "unknown",
          lastCheck: null,
          errorMessage: null,
          latencyMs: null,
        },
      })
    ).toThrow(ZodError);
  });

  it("should reject missing required fields", () => {
    const { id: _, ...withoutId } = validConnection;
    expect(() => connectionWithHealthSchema.parse(withoutId)).toThrow(ZodError);
  });

  it("should reject invalid connection type", () => {
    expect(() =>
      connectionWithHealthSchema.parse({
        ...validConnection,
        type: "oracle",
      })
    ).toThrow(ZodError);
  });
});
