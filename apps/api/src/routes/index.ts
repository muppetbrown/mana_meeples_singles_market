// apps/api/src/routes/index.ts
// This file simply re-exports the main API router.
// Your server entrypoint can do: `app.use('/api', apiRouter)`
import apiRouter from "./api.js";
export default apiRouter;
