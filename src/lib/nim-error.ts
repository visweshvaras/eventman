export function getNimErrorMessage(status: number, hasExecutedMutation: boolean) {
  const recoveryNote = hasExecutedMutation
    ? " A change may already have been saved; refresh your event before retrying."
    : "";

  let issue: string;
  if (status === 401 || status === 403) {
    issue = "NVIDIA NIM rejected the configured credentials or model access. Check NVIDIA_NIM_API_KEY and NVIDIA_NIM_MODEL in your hosting settings.";
  } else if (status === 404) {
    issue = "NVIDIA NIM could not find this model. Check that NVIDIA_NIM_MODEL is the exact model ID available to your API key.";
  } else if (status === 429) {
    issue = "NVIDIA NIM has reached a rate limit or quota. Wait a little and try again.";
  } else if (status >= 500) {
    issue = "NVIDIA NIM is temporarily unavailable. Please try again shortly.";
  } else {
    issue = "The assistant could not complete that request. Please try again.";
  }

  return `${issue}${recoveryNote}`;
}
