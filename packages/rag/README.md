# @ahamie/rag

Wraps `@mastra/rag` (`MDocument`, vector tools, rerankers). v0 ingest path: PDF / markdown / plaintext.

```ts
import { ingestText } from "@ahamie/rag";
await ingestText(db, { orgId, source: markdownText });
```
