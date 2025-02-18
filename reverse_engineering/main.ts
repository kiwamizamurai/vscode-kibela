import * as fs from 'fs';
import * as path from 'path';
import { buildClientSchema, getIntrospectionQuery, printSchema } from 'graphql';

const INTROSPECTION_QUERY = getIntrospectionQuery();

async function fetchSchema(endpoint: string, token: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: INTROSPECTION_QUERY,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(json.errors, null, 2)}`);
  }

  return json.data;
}

async function main() {
  const team = process.env.KIBELA_TEAM;
  const token = process.env.KIBELA_TOKEN;

  if (!team || !token) {
    throw new Error(
      'KIBELA_TEAM and KIBELA_TOKEN environment variables are required'
    );
  }

  const endpoint = `https://${team}.kibe.la/api/v1`;

  try {
    const introspectionResult = await fetchSchema(endpoint, token);
    const schema = buildClientSchema(introspectionResult);
    const sdlSchema = printSchema(schema);

    const dir = path.join(__dirname);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const schemaPath = path.join(dir, 'schema.graphql');
    fs.writeFileSync(schemaPath, sdlSchema);
    console.log(`Schema saved to ${schemaPath}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
