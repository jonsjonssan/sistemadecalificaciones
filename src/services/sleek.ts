const SLEEK_BASE_URL = "https://sleek.design";

function getHeaders(): HeadersInit {
  const apiKey = process.env.SLEEK_API_KEY;
  if (!apiKey) throw new Error("Falta SLEEK_API_KEY en .env");
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T | null> {
  const res = await fetch(`${SLEEK_BASE_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) as T : null;
}

export interface SleekProject {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface SleekComponent {
  id: string;
  name: string;
  activeVersion: number;
  versions: { id: string; version: number; code: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface SleekRunResult {
  runId: string;
  status: "queued" | "running" | "completed" | "failed";
  statusUrl: string;
  result?: {
    assistantText: string;
    operations: {
      type: string;
      screenId?: string;
      screenName?: string;
      componentId?: string;
    }[];
  };
  error?: { code: string; message: string };
}

export const sleek = {
  projects: {
    list: (limit = 50, offset = 0) =>
      request<{ data: SleekProject[]; pagination: { total: number } }>(
        `/api/v1/projects?limit=${limit}&offset=${offset}`
      ),
    get: (id: string) =>
      request<{ data: SleekProject }>(`/api/v1/projects/${id}`),
    create: (name: string) =>
      request<{ data: SleekProject }>("/api/v1/projects", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    delete: (id: string) =>
      request<null>(`/api/v1/projects/${id}`, { method: "DELETE" }),
  },
  components: {
    list: (projectId: string, limit = 50, offset = 0) =>
      request<{ data: SleekComponent[]; pagination: { total: number } }>(
        `/api/v1/projects/${projectId}/components?limit=${limit}&offset=${offset}`
      ),
    get: (projectId: string, componentId: string) =>
      request<{ data: SleekComponent }>(
        `/api/v1/projects/${projectId}/components/${componentId}`
      ),
  },
  chat: {
    send: (
      projectId: string,
      text: string,
      options?: { wait?: boolean; imageUrls?: string[]; screenId?: string }
    ) =>
      request<{ data: SleekRunResult }>(
        `/api/v1/projects/${projectId}/chat/messages?wait=${options?.wait ?? false}`,
        {
          method: "POST",
          body: JSON.stringify({
            message: { text },
            imageUrls: options?.imageUrls,
            target: options?.screenId ? { screenId: options.screenId } : undefined,
          }),
        }
      ),
    poll: (projectId: string, runId: string) =>
      request<{ data: SleekRunResult }>(
        `/api/v1/projects/${projectId}/chat/runs/${runId}`
      ),
  },
  screenshots: {
    render: (params: {
      componentIds: string[];
      projectId: string;
      format?: "png" | "webp";
      scale?: number;
      background?: string;
    }) =>
      request<ArrayBuffer>("/api/v1/screenshots", {
        method: "POST",
        body: JSON.stringify({ ...params, format: params.format ?? "png", scale: params.scale ?? 2, background: params.background ?? "transparent" }),
      }),
  },
};
