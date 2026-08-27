import type {
  PluginAgentRunResult,
  PluginAgentService,
} from '@src/core/plugin';

export async function runBmAgent(props: {
  agent: PluginAgentService;
  prompt: string;
  sessionId: string | null;
}): Promise<PluginAgentRunResult> {
  return props.agent.run({
    prompt: props.prompt,
    sessionId: props.sessionId,
    backend: null,
    provider: null,
    model: null,
    mode: null,
    workspaceTarget: null,
    cwd: null,
    onAgentStreamChunk: null,
    abortSignal: null,
    context: null,
  });
}
