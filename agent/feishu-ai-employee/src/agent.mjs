import { executePipeline } from './pipeline-adapter.mjs';

export async function execute(task, control) {
  return executePipeline(task, control);
}
