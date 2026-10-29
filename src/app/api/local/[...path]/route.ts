import { localGateway } from "@/lib/api/local-gateway";

export const runtime = "nodejs";

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await context.params;
  return localGateway(request, path);
}

export { handle as GET, handle as POST, handle as PATCH };
