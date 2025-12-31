import { sql } from "drizzle-orm";

import { db } from "../server";

async function checkEmbeddings() {
  // Check total embeddings
  const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM pdf.embedding`);
  console.log("Total embeddings:", countResult);

  // Check recent documents with embeddings
  const docsResult = await db.execute(sql`
    SELECT 
      d.id as doc_id,
      d.name,
      d.created_at,
      COUNT(e.id) as embedding_count
    FROM pdf.document d
    LEFT JOIN pdf.embedding e ON e.document_id = d.id
    GROUP BY d.id, d.name, d.created_at
    ORDER BY d.created_at DESC
    LIMIT 5
  `);
  console.log("\nRecent documents with embedding counts:");
  console.log(docsResult);

  // Check a sample embedding content
  const sampleResult = await db.execute(sql`
    SELECT id, LEFT(content, 200) as content_preview, page_number
    FROM pdf.embedding
    ORDER BY created_at DESC
    LIMIT 3
  `);
  console.log("\nSample embedding content:");
  console.log(sampleResult);

  process.exit(0);
}

checkEmbeddings().catch(console.error);
