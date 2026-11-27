// The standalone admin app (basePath /admin) serves the same challenge as the
// main app, so its sign-in form can complete the human check.
export const dynamic = "force-dynamic";
export { GET } from "../../../../main/app/api/human-check/route";
