import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const apiKey = process.env.NVIDIA_NIM_API_KEY;
const model = process.env.NVIDIA_NIM_MODEL;

if (!apiKey || !model) {
  console.error(
    "Set NVIDIA_NIM_API_KEY and NVIDIA_NIM_MODEL in .env.local before checking NVIDIA NIM.",
  );
  process.exit(1);
}

try {
  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply with OK." }],
      max_tokens: 8,
      stream: false,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    console.error(`NVIDIA NIM returned HTTP ${response.status}.`);
    console.error("Check the rotated API key, model name, and model access in your NVIDIA account.");
    process.exit(1);
  }

  const result = await response.json();
  if (typeof result.choices?.[0]?.message?.content !== "string") {
    console.error("NVIDIA NIM responded, but the response did not contain a completion.");
    process.exit(1);
  }

  console.log(`NVIDIA NIM responded successfully for model "${model}".`);
} catch (error) {
  console.error("Could not reach NVIDIA NIM:", error.message);
  process.exit(1);
}
