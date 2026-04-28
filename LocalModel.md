
```lms_hstack
## Get to know the stack

- TypeScript SDK: [lmstudio-js](/docs/typescript)
- Python SDK: [lmstudio-python](/docs/python)
- LM Studio REST API: [Stateful Chats, MCPs via API](/docs/developer/rest)
- OpenAI‑compatible: [Chat, Responses, Embeddings](/docs/developer/openai-compat)
- Anthropic-compatible: [Messages](/docs/developer/anthropic-compat)
- LM Studio CLI: [`lms`](/docs/cli)

:::split:::

## What you can build

- Chat and text generation with streaming
- Tool calling and local agents with MCP
- Structured output (JSON schema)
- Embeddings and tokenization
- Model management (load, download, list)
```

## Install `llmster` for headless deployments

`llmster` is LM Studio's core, packaged as a daemon for headless deployment on servers, cloud instances, or CI. The daemon runs standalone, and it is not dependent on the LM Studio GUI.

**Mac / Linux**

```bash
curl -fsSL https://lmstudio.ai/install.sh | bash
```

**Windows**

```powershell
irm https://lmstudio.ai/install.ps1 | iex
```

**Basic usage**

```bash
lms daemon up          # Start the daemon
lms get <model>        # Download a model
lms server start       # Start the local server
lms chat               # Open an interactive session
```

Learn more: [Headless deployments](/blog/0.4.0#deploy-on-servers-deploy-in-ci-deploy-anywhere)

## Super quick start

### TypeScript (`lmstudio-js`)

```bash
npm install @lmstudio/sdk
```

```ts
import { LMStudioClient } from "@lmstudio/sdk";

const client = new LMStudioClient();
const model = await client.llm.model("openai/gpt-oss-20b");
const result = await model.respond("Who are you, and what can you do?");

console.info(result.content);
```

Full docs: [lmstudio-js](/docs/typescript), Source: [GitHub](https://github.com/lmstudio-ai/lmstudio-js)

### Python (`lmstudio-python`)

```bash
pip install lmstudio
```

```python
import lmstudio as lms

with lms.Client() as client:
    model = client.llm.model("openai/gpt-oss-20b")
    result = model.respond("Who are you, and what can you do?")
    print(result)
```

Full docs: [lmstudio-python](/docs/python), Source: [GitHub](https://github.com/lmstudio-ai/lmstudio-python)

### HTTP (LM Studio REST API)

```bash
lms server start --port 1234
```

```bash
curl http://localhost:1234/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LM_API_TOKEN" \
  -d '{
    "model": "openai/gpt-oss-20b",
    "input": "Who are you, and what can you do?"
  }'
```

Full docs: [LM Studio REST API](/docs/developer/rest)

## Helpful links

- [API Changelog](/docs/developer/api-changelog)
- [Local server basics](/docs/developer/core/server)
- [CLI reference](/docs/cli)
- [Discord Community](https://discord.gg/lmstudio)



---

###### LM Studio 0.4.1

### Anthropic-compatible API

- New Anthropic-compatible endpoint: `POST /v1/messages`.
  - Use Claude code models with LM Studio
  - See docs for more details: [/docs/developer/anthropic-compat](/docs/developer/anthropic-compat).

---

###### LM Studio 0.4.0

### LM Studio native v1 REST API

- Official release of LM Studio's native v1 REST API at `/api/v1/*` endpoints.
  - [MCP via API](/docs/developer/core/mcp)
  - [Stateful chats](/docs/developer/rest/stateful-chats)
  - [Authentication](/docs/developer/core/authentication) configuration with API tokens
  - Model [download](/docs/developer/rest/download), [load](/docs/developer/rest/load) and [unload](/docs/developer/rest/unload) endpoints
  - See [overview](/docs/developer/rest) page for more details and [comparison](/docs/developer/rest#inference-endpoint-comparison) with OpenAI-compatible endpoints.

---

###### LM Studio 0.3.29 • 2025‑10‑06

### OpenAI `/v1/responses` and variant listing

- New OpenAI‑compatible endpoint: `POST /v1/responses`.
  - Stateful interactions via `previous_response_id`.
  - Custom tool calling and Remote MCP support (opt‑in).
  - Reasoning support with `reasoning.effort` for `openai/gpt‑oss‑20b`.
  - Streaming via SSE when `stream: true`.
- CLI: `lms ls --variants` lists all variants for multi‑variant models.
- Docs: [/docs/developer/openai-compat](/docs/developer/openai-compat). Full release notes: [/blog/lmstudio-v0.3.29](/blog/lmstudio-v0.3.29).

---

###### LM Studio 0.3.27 • 2025‑09‑24

### CLI: model resource estimates, status, and interrupts

- New: `lms load --estimate-only <model>` prints estimated GPU and total memory before loading. Honors `--context-length` and `--gpu`, and uses an improved estimator that now accounts for flash attention and vision models.
- `lms chat`: press `Ctrl+C` to interrupt an ongoing prediction.
- `lms ps --json` now reports each model's generation status and the number of queued prediction requests.
- CLI color contrast improved for light mode.
- See docs: [/docs/cli/local-models/load](/docs/cli/local-models/load). Full release notes: [/blog/lmstudio-v0.3.27](/blog/lmstudio-v0.3.27).

---

###### LM Studio 0.3.26 • 2025‑09‑15

### CLI log streaming: server + model

- `lms log stream` now supports multiple sources and filters.
  - `--source server` streams HTTP server logs (startup, endpoints, status)
  - `--source model --filter input,output` streams formatted user input and model output
  - Append `--json` for machine‑readable logs; `--stats` adds tokens/sec and related metrics (model source)
- See usage and examples: [/docs/cli/serve/log-stream](/docs/cli/serve/log-stream). Full release notes: [/blog/lmstudio-v0.3.26](/blog/lmstudio-v0.3.26).

---

###### LM Studio 0.3.25 • 2025‑09‑04

### New model support (API)

- Added support for NVIDIA Nemotron‑Nano‑v2 with tool‑calling via the OpenAI‑compatible endpoints [‡](/blog/lmstudio-v0.3.25).
- Added support for Google EmbeddingGemma for the `/v1/embeddings` endpoint [‡](/blog/lmstudio-v0.3.25).

---

###### LM Studio 0.3.24 • 2025‑08‑28

### Seed‑OSS tool‑calling and template fixes

- Added support for ByteDance/Seed‑OSS including tool‑calling and prompt‑template compatibility fixes in the OpenAI‑compatible API [‡](/blog/lmstudio-v0.3.24).
- Fixed cases where tool calls were not parsed for certain prompt templates [‡](/blog/lmstudio-v0.3.24).

---

###### LM Studio 0.3.23 • 2025‑08‑12

### Reasoning content and tool‑calling reliability

- For `gpt‑oss` on `POST /v1/chat/completions`, reasoning content moves out of `message.content` and into `choices.message.reasoning` (non‑streaming) and `choices.delta.reasoning` (streaming), aligning with `o3‑mini` [‡](/blog/lmstudio-v0.3.23).
- Tool names are normalized (e.g., snake_case) before being provided to the model to improve tool‑calling reliability [‡](/blog/lmstudio-v0.3.23).
- Fixed errors for certain tools‑containing requests to `POST /v1/chat/completions` (e.g., "reading 'properties'") and non‑streaming tool‑call failures [‡](/blog/lmstudio-v0.3.23).

---

###### LM Studio 0.3.19 • 2025‑07‑21

### Bug fixes for streaming and tool calls

- Corrected usage statistics returned by OpenAI‑compatible streaming responses [‡](https://lmstudio.ai/blog/lmstudio-v0.3.19#:~:text=,OpenAI%20streaming%20responses%20were%20incorrect).
- Improved handling of parallel tool calls via the streaming API [‡](https://lmstudio.ai/blog/lmstudio-v0.3.19#:~:text=,API%20were%20not%20handled%20correctly).
- Fixed parsing of correct tool calls for certain Mistral models [‡](https://lmstudio.ai/blog/lmstudio-v0.3.19#:~:text=,Ryzen%20AI%20PRO%20300%20series).

---

###### LM Studio 0.3.18 • 2025‑07‑10

### Streaming options and tool‑calling improvements

- Added support for the `stream_options` object on OpenAI‑compatible endpoints. Setting `stream_options.include_usage` to `true` returns prompt and completion token usage during streaming [‡](https://lmstudio.ai/blog/lmstudio-v0.3.18#:~:text=%2A%20Added%20support%20for%20%60,to%20support%20more%20prompt%20templates).
- Errors returned from streaming endpoints now follow the correct format expected by OpenAI clients [‡](https://lmstudio.ai/blog/lmstudio-v0.3.18#:~:text=,with%20proper%20chat%20templates).
- Tool‑calling support added for Mistral v13 tokenizer models, using proper chat templates [‡](https://lmstudio.ai/blog/lmstudio-v0.3.18#:~:text=,with%20proper%20chat%20templates).
- The `response_format.type` field now accepts `"text"` in chat‑completion requests [‡](https://lmstudio.ai/blog/lmstudio-v0.3.18#:~:text=,that%20are%20split%20across%20multiple).
- Fixed bugs where parallel tool calls split across multiple chunks were dropped and where root‑level `$defs` in tool definitions were stripped [‡](https://lmstudio.ai/blog/lmstudio-v0.3.18#:~:text=,being%20stripped%20in%20tool%20definitions).

---

###### LM Studio 0.3.17 • 2025‑06‑25

### Tool‑calling reliability and token‑count updates

- Token counts now include the system prompt and tool definitions [‡](https://lmstudio.ai/blog/lmstudio-v0.3.17#:~:text=,have%20a%20URL%20in%20the). This makes usage reporting more accurate for both the UI and the API.
- Tool‑call argument tokens are streamed as they are generated [‡](https://lmstudio.ai/blog/lmstudio-v0.3.17#:~:text=Build%206), improving responsiveness when using streamed function calls.
- Various fixes improve MCP and tool‑calling reliability, including correct handling of tools that omit a `parameters` object and preventing hangs when an MCP server reloads [‡](https://lmstudio.ai/blog/lmstudio-v0.3.17#:~:text=,tool%20calls%20would%20hang%20indefinitely).

---

###### LM Studio 0.3.16 • 2025‑05‑23

### Model capabilities in `GET /models`

- The OpenAI‑compatible REST API (`/api/v0`) now returns a `capabilities` array in the `GET /models` response. Each model lists its supported capabilities (e.g. `"tool_use"`) [‡](https://lmstudio.ai/blog/lmstudio-v0.3.16#:~:text=,response) so clients can programmatically discover tool‑enabled models.
- Fixed a streaming bug where an empty function name string was appended after the first packet of streamed tool calls [‡](https://lmstudio.ai/blog/lmstudio-v0.3.16#:~:text=%2A%20Bugfix%3A%20%5BOpenAI,packet%20of%20streamed%20function%20calls).

---

###### [👾 LM Studio 0.3.15](/blog/lmstudio-v0.3.15) • 2025-04-24

### Improved Tool Use API Support

OpenAI-like REST API now supports the `tool_choice` parameter:

```json
{
  "tool_choice": "auto" // or "none", "required"
}
```

- `"tool_choice": "none"` — Model will not call tools
- `"tool_choice": "auto"` — Model decides
- `"tool_choice": "required"` — Model must call tools (llama.cpp only)

Chunked responses now set `"finish_reason": "tool_calls"` when appropriate.

---

###### [👾 LM Studio 0.3.14](/blog/lmstudio-v0.3.14) • 2025-03-27

### [API/SDK] Preset Support

RESTful API and SDKs support specifying presets in requests.

_(example needed)_

###### [👾 LM Studio 0.3.10](/blog/lmstudio-v0.3.10) • 2025-02-18

### Speculative Decoding API

Enable speculative decoding in API requests with `"draft_model"`:

```json
{
  "model": "deepseek-r1-distill-qwen-7b",
  "draft_model": "deepseek-r1-distill-qwen-0.5b",
  "messages": [ ... ]
}
```

Responses now include a `stats` object for speculative decoding:

```json
"stats": {
  "tokens_per_second": ...,
  "draft_model": "...",
  "total_draft_tokens_count": ...,
  "accepted_draft_tokens_count": ...,
  "rejected_draft_tokens_count": ...,
  "ignored_draft_tokens_count": ...
}
```

---

###### [👾 LM Studio 0.3.9](blog/lmstudio-v0.3.9) • 2025-01-30

### Idle TTL and Auto Evict

Set a TTL (in seconds) for models loaded via API requests (docs article: [Idle TTL and Auto-Evict](/docs/developer/core/ttl-and-auto-evict))

```diff
curl http://localhost:1234/api/v0/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-r1-distill-qwen-7b",
    "messages": [ ... ]
+   "ttl": 300,
}'
```

With `lms`:

```
lms load --ttl <seconds>
```

### Separate `reasoning_content` in Chat Completion responses

For DeepSeek R1 models, get reasoning content in a separate field. See more [here](/blog/lmstudio-v0.3.9#separate-reasoningcontent-in-chat-completion-responses).

Turn this on in App Settings > Developer.

---

###### [👾 LM Studio 0.3.6](blog/lmstudio-v0.3.6) • 2025-01-06

### Tool and Function Calling API

Use any LLM that supports Tool Use and Function Calling through the OpenAI-like API.

Docs: [Tool Use and Function Calling](/docs/developer/core/tools).

---

###### [👾 LM Studio 0.3.5](blog/lmstudio-v0.3.5) • 2024-10-22

### Introducing `lms get`: download models from the terminal

You can now download models directly from the terminal using a keyword

```bash
lms get deepseek-r1
```

or a full Hugging Face URL

```bash
lms get <hugging face url>
```

To filter for MLX models only, add `--mlx` to the command.

```bash
lms get deepseek-r1 --mlx
```



## Start the server

[Install](/download) and launch LM Studio.

Then ensure the server is running through the toggle at the top left of the Developer page, or through [lms](/docs/cli) in the terminal:

```bash
lms server start
```

By default, the server is available at `http://localhost:1234`.

If you don't have a model downloaded yet, you can download the model:

```bash
lms get ibm/granite-4-micro
```

## API Authentication

By default, the LM Studio API server does **not** require authentication. You can configure the server to require authentication by API token in the [server settings](/docs/developer/core/server/settings) for added security.

To authenticate API requests, generate an API token from the Developer page in LM Studio, and include it in the `Authorization` header of your requests as follows: `Authorization: Bearer $LM_API_TOKEN`. Read more about authentication [here](/docs/developer/core/authentication).

## Chat with a model

Use the chat endpoint to send a message to a model. By default, the model will be automatically loaded if it is not already.

The `/api/v1/chat` endpoint is stateful, which means you do not need to pass the full history in every request. Read more about it [here](/docs/developer/rest/stateful-chats).

```lms_code_snippet
variants:
  curl:
    language: bash
    code: |
      curl http://localhost:1234/api/v1/chat \
        -H "Authorization: Bearer $LM_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "model": "ibm/granite-4-micro",
          "input": "Write a short haiku about sunrise."
        }'
  Python:
    language: python
    code: |
      import os
      import requests
      import json

      response = requests.post(
        "http://localhost:1234/api/v1/chat",
        headers={
          "Authorization": f"Bearer {os.environ['LM_API_TOKEN']}",
          "Content-Type": "application/json"
        },
        json={
          "model": "ibm/granite-4-micro",
          "input": "Write a short haiku about sunrise."
        }
      )
      print(json.dumps(response.json(), indent=2))
  TypeScript:
    language: typescript
    code: |
      const response = await fetch("http://localhost:1234/api/v1/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.LM_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "ibm/granite-4-micro",
          input: "Write a short haiku about sunrise."
        })
      });
      const data = await response.json();
      console.log(data);
```

See the full [chat](/docs/developer/rest/chat) docs for more details.

## Use MCP servers via API

Enable the model interact with ephemeral Model Context Protocol (MCP) servers in `/api/v1/chat` by specifying servers in the `integrations` field.

```lms_code_snippet
variants:
  curl:
    language: bash
    code: |
      curl http://localhost:1234/api/v1/chat \
        -H "Authorization: Bearer $LM_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "model": "ibm/granite-4-micro",
          "input": "What is the top trending model on hugging face?",
          "integrations": [
            {
              "type": "ephemeral_mcp",
              "server_label": "huggingface",
              "server_url": "https://huggingface.co/mcp",
              "allowed_tools": ["model_search"]
            }
          ],
          "context_length": 8000
        }'
  Python:
    language: python
    code: |
      import os
      import requests
      import json

      response = requests.post(
        "http://localhost:1234/api/v1/chat",
        headers={
          "Authorization": f"Bearer {os.environ['LM_API_TOKEN']}",
          "Content-Type": "application/json"
        },
        json={
          "model": "ibm/granite-4-micro",
          "input": "What is the top trending model on hugging face?",
          "integrations": [
            {
              "type": "ephemeral_mcp",
              "server_label": "huggingface",
              "server_url": "https://huggingface.co/mcp",
              "allowed_tools": ["model_search"]
            }
          ],
          "context_length": 8000
        }
      )
      print(json.dumps(response.json(), indent=2))
  TypeScript:
    language: typescript
    code: |
      const response = await fetch("http://localhost:1234/api/v1/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.LM_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "ibm/granite-4-micro",
          input: "What is the top trending model on hugging face?",
          integrations: [
            {
              type: "ephemeral_mcp",
              server_label: "huggingface",
              server_url: "https://huggingface.co/mcp",
              allowed_tools: ["model_search"]
            }
          ],
          context_length: 8000
        })
      const data = await response.json();
      console.log(data);
```

You can also use locally configured MCP plugins (from your `mcp.json`) via the `integrations` field. Using locally run MCP plugins requires authentication via an API token passed through the `Authorization` header. Read more about authentication [here](/docs/developer/core/authentication).

```lms_code_snippet
variants:
  curl:
    language: bash
    code: |
      curl http://localhost:1234/api/v1/chat \
        -H "Authorization: Bearer $LM_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "model": "ibm/granite-4-micro",
          "input": "Open lmstudio.ai",
          "integrations": [
            {
              "type": "plugin",
              "id": "mcp/playwright",
              "allowed_tools": ["browser_navigate"]
            }
          ],
          "context_length": 8000
        }'
  Python:
    language: python
    code: |
      import os
      import requests
      import json

      response = requests.post(
        "http://localhost:1234/api/v1/chat",
        headers={
          "Authorization": f"Bearer {os.environ['LM_API_TOKEN']}",
          "Content-Type": "application/json"
        },
        json={
          "model": "ibm/granite-4-micro",
          "input": "Open lmstudio.ai",
          "integrations": [
            {
              "type": "plugin",
              "id": "mcp/playwright",
              "allowed_tools": ["browser_navigate"]
            }
          ],
          "context_length": 8000
        }
      )
      print(json.dumps(response.json(), indent=2))
  TypeScript:
    language: typescript
    code: |
      const response = await fetch("http://localhost:1234/api/v1/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.LM_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "ibm/granite-4-micro",
          input: "Open lmstudio.ai",
          integrations: [
            {
              type: "plugin",
              id: "mcp/playwright",
              allowed_tools: ["browser_navigate"]
            }
          ],
          context_length: 8000
        })
      });
      const data = await response.json();
      console.log(data);
```

See the full [chat](/docs/developer/rest/chat) docs for more details.

## Download a model

Use the download endpoint to download models by identifier from the [LM Studio model catalog](https://lmstudio.ai/models), or by Hugging Face model URL.

```lms_code_snippet
variants:
  curl:
    language: bash
    code: |
      curl http://localhost:1234/api/v1/models/download \
        -H "Authorization: Bearer $LM_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "model": "ibm/granite-4-micro"
        }'
  Python:
    language: python
    code: |
      import os
      import requests
      import json

      response = requests.post(
        "http://localhost:1234/api/v1/models/download",
        headers={
          "Authorization": f"Bearer {os.environ['LM_API_TOKEN']}",
          "Content-Type": "application/json"
        },
        json={"model": "ibm/granite-4-micro"}
      )
      print(json.dumps(response.json(), indent=2))
  TypeScript:
    language: typescript
    code: |
      const response = await fetch("http://localhost:1234/api/v1/models/download", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.LM_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "ibm/granite-4-micro"
        })
      });
      const data = await response.json();
      console.log(data);
```

The response will return a `job_id` that you can use to track download progress.

```lms_code_snippet
variants:
  curl:
    language: bash
    code: |
      curl -H "Authorization: Bearer $LM_API_TOKEN" \
        http://localhost:1234/api/v1/models/download/status/{job_id}
  Python:
    language: python
    code: |
      import os
      import requests
      import json

      job_id = "your-job-id"
      response = requests.get(
        f"http://localhost:1234/api/v1/models/download/status/{job_id}",
        headers={"Authorization": f"Bearer {os.environ['LM_API_TOKEN']}"}
      )
      print(json.dumps(response.json(), indent=2))
  TypeScript:
    language: typescript
    code: |
      const jobId = "your-job-id";
      const response = await fetch(
        `http://localhost:1234/api/v1/models/download/status/${jobId}`,
        {
          headers: {
            "Authorization": `Bearer ${process.env.LM_API_TOKEN}`
          }
        }
      );
      const data = await response.json();
      console.log(data);
```

See the [download](/docs/developer/rest/download) and [download status](/docs/developer/rest/download-status) docs for more details.
