# @ahamie/blobstore

The byte tier of the Ahamie substrate. Defines the `Blobstore` interface and ships one impl (`LocalFsBlobstore`); `@ahamie/blobstore-s3` arrives at v1 with the same interface.

```ts
import { createLocalBlobstore } from "@ahamie/blobstore";

const store = createLocalBlobstore("./.ahamie/blobs");
const ref = await store.put("org_abc/snapshot/1.bin", Buffer.from("…"));
```
