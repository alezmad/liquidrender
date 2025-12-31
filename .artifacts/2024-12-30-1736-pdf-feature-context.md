# PDF Feature Development Context

## Core Files

### Frontend (PDF Viewer & Chat UI)
```
apps/web/src/app/[locale]/pdf/[id]/page.tsx     # Page route
apps/web/src/modules/pdf/layout/                 # PDF layout components
├── index.tsx                                    # Main layout
├── preview/
│   ├── index.tsx                               # PDF viewer (lector + pdfjs)
│   ├── pdf-viewer.css                          # Text layer styles
│   ├── zoom-menu.tsx
│   ├── page-navigation.tsx
│   └── document-menu.tsx
└── chat/
    ├── index.tsx                               # Chat container
    ├── messages.tsx                            # Message list
    └── input.tsx                               # Chat input
```

### API Routes
```
packages/api/src/modules/ai/pdf.ts              # Hono routes for PDF chat
```

### AI/Embeddings Logic
```
packages/ai/src/modules/pdf/
├── api.ts                                      # createChat, streamChatWithDocuments
├── embeddings.ts                               # generateDocumentEmbeddings, findRelevantContent
├── strategies.ts                               # Model config (gpt-4o-mini, text-embedding-3-small)
├── constants.ts                                # PROMPTS.SYSTEM
├── schema.ts                                   # Zod schemas
└── types.ts                                    # Type definitions
```

### Database Schema
```
packages/db/src/schema/pdf.ts                   # Tables: pdf.chat, pdf.message, pdf.document, pdf.embedding
```

### Storage
```
packages/storage/src/providers/s3/index.ts      # getSignedUrl, getUploadUrl (MinIO/S3)
```

## Database Tables (pdf schema)

| Table | Purpose |
|-------|---------|
| `pdf.chat` | Chat sessions (id, name, userId) |
| `pdf.message` | Messages (id, chatId, content, role) |
| `pdf.document` | Uploaded PDFs (id, chatId, name, path) |
| `pdf.embedding` | Vector embeddings (id, documentId, content, embedding[1536]) |

## Key Flows

### 1. PDF Upload Flow
```
Frontend upload → S3 signed URL → createChat() → createDocument() → async generateDocumentEmbeddings()
```

### 2. Chat Message Flow
```
POST /api/ai/pdf/chats/:id/messages
→ getChatDocuments(chatId)
→ streamChatWithDocuments({ documentIds })
→ AI calls findRelevantContent tool
→ Vector similarity search in pdf.embedding
→ Stream response back
```

### 3. Embedding Generation
```
generateDocumentEmbeddings(path)
→ getSignedUrl(path) from S3
→ PDFLoader.load()
→ RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
→ embedMany() with text-embedding-3-small
→ Insert into pdf.embedding
```

## Environment Variables
```
OPENAI_API_KEY          # For embeddings & chat
S3_BUCKET=knosia        # MinIO bucket
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

## Dependencies
```
@anaralabs/lector       # PDF viewer components
pdfjs-dist              # PDF.js core
@langchain/community    # PDFLoader
@langchain/textsplitters # Text chunking
ai                      # Vercel AI SDK
```

## Dev Cache (clear when debugging)
```
apps/web/.cache/ai.json  # AI response cache (dev only)
```

## Common Issues

1. **Text layer overlay**: Requires pdf-viewer.css with `.textLayer` styles
2. **Embeddings not found**: Check pdf.embedding table has rows for documentId
3. **Cached responses**: Clear apps/web/.cache/ai.json
4. **S3 bucket errors**: Verify S3_BUCKET in .env.local
