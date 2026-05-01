# @ahamie/cas

Content-addressed object store. v0 ships `put`, `get`, `link`, `parents`. The full DAG primitives (`walk`, `fork`, `refs`) ship at v1 with snapshot+marketplace.

```ts
import { createLocalBlobstore } from "@ahamie/blobstore";
import { createCas } from "@ahamie/cas";

const cas = createCas(createLocalBlobstore("./.ahamie/cas"));
const obj = await cas.put("org_abc", Buffer.from("…"));
const back = await cas.get("org_abc", obj.id);
```
