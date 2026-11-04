# n8n-nodes-cortecs

Use [Cortecs](https://cortecs.ai) chat models in n8n AI Agents and LLM Chains.

This community package provides a **Cortecs Chat Model** sub-node and a shared **Cortecs API** credential. You can also use the credential with n8n's HTTP Request node to call other Cortecs API endpoints.

## Installation

On a self-hosted n8n instance, an owner or administrator can install the package:

1. Open **Settings → Community Nodes → Install**.
2. Enter `n8n-nodes-cortecs`.
3. Review the installation notice and select **Install**.

See [n8n's community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/gui-installation.md) for details. Availability in n8n Cloud depends on n8n verification and your instance's community-node settings.

Your n8n instance must provide **AI Node SDK API version 1** and `n8n-workflow`. Local loading has been checked with n8n **2.45.7**; compatibility with every n8n version is not guaranteed.

## Credentials

Create an API key in your [Cortecs account](https://cortecs.ai), then create a **Cortecs API** credential in n8n and enter the key in **API Key**.


## Quick start

1. Add an **AI Agent** or **Basic LLM Chain** to your workflow.
2. Attach **Cortecs Chat Model** to its **Chat Model** connector.
3. Select your **Cortecs API** credential.
4. Choose a model from **From List**, or select **By ID** and enter an exact Cortecs model ID.
5. Configure the prompt in the parent agent or chain and execute the workflow.

For agents using tools, choose a model labeled **(Tools)**. Prompts, tools, and conversation memory are configured on the parent agent or chain.

To get started with an existing workflow, import [Basic chain](examples/basic-chain.json) using **Import from File**, then select your credential and model.

## Model options

| Option | Description |
| --- | --- |
| **Model** | Search the Cortecs catalog or enter a model ID. The list includes models supporting text input and text output. |
| **Temperature** | Optional sampling temperature between 0 and 2. Supported values depend on the selected model. |
| **Maximum Output Tokens** | Optional positive integer limiting the generated output. Model limits vary. |

Leave options out of the **Options** collection to preserve provider defaults.

Text generation, streaming, and tool calls use Cortecs' OpenAI-compatible Chat Completions API at `https://api.cortecs.ai/v1`. Supported features depend on the selected model.


## Cortecs HTTP Request

Add **Cortecs HTTP Request** from the node picker and select your **Cortecs API** credential. Set the HTTP method, endpoint URL, and request body as required by the [Cortecs API documentation](https://docs.cortecs.ai/api). n8n adds Bearer authentication using your saved credential.

The **Cortecs docs** link in the notice inside the node opens the API reference. The general **Docs** link in the node header may open n8n's HTTP Request documentation.

## Example workflows

These workflows are included in the npm package. Import each JSON file into a separate workflow using **Import from File**. Select your credential and model on every Cortecs model node before running. HTTP examples require a credential on the HTTP Request node; the chat-completion example also requires a model ID in **Test Input**.

| Example | Demonstrates |
| --- | --- |
| [Basic chain](examples/basic-chain.json) | A minimal prompt and response. |
| [01 Basic generation](examples/01-basic-generation.json) | Generate a reply and check the expected text. |
| [02 Structured extraction](examples/02-structured-extraction.json) | Extract contact details with a Structured Output Parser and check the values. |
| [03 Sequential chains](examples/03-sequential-chains.json) | Summarize text, then pass the result to a translation chain. |
| [04 Multiple items](examples/04-multiple-items.json) | Classify three reviews and check one output per input item. |
| [05 Agent with Calculator](examples/05-agent-calculator.json) | Use a tool-capable model to call Calculator. |
| [06 Chat, streaming, and memory](examples/06-chat-streaming-memory.json) | Chat interactively with streaming responses and session memory. |
| [07 HTTP model catalog](examples/07-http-model-catalog.json) | Fetch available text models using HTTP Request. |
| [08 HTTP chat completion](examples/08-http-chat-completion.json) | Send a chat request directly and inspect its text and usage information. |
| [09 HTTP invalid model](examples/09-http-invalid-model.json) | Inspect an unsuccessful response for a nonexistent model ID. |
| [10 Image input](examples/10-image-input.json) | Describe an image with a vision-capable model. |

Each workflow includes setup notes and expected results. They contain no credentials. 

## Troubleshooting and limitations

- **Model list unavailable:** check connectivity and Cortecs service availability, or use **By ID** with a known model ID.
- **Authentication or access rejected:** check your API key, account balance, permissions, and IP restrictions.
- **Agent does not call tools:** select a tool-capable model and inspect the agent's intermediate steps. A correct final answer alone does not establish that a tool ran.
- **Image request rejected:** check the selected model's image-input support and whether the image URL is accessible.
- **Unexpected results across multiple input items:** n8n sub-node expressions may resolve against the first item. Keep the model configuration fixed and put item-specific prompts in the parent chain.


## Development

From a source checkout, use Node.js 22.16 or newer and a Node.js version supported by your n8n host. Install dependencies and run the checks:

```sh
npm ci
npm test
npm run lint
npm run scan
```

The tests use a local fake API and require no Cortecs key. They cover configuration, credentials, model discovery, text generation, streaming, tool calls, and unsuccessful responses; they do not establish live provider compatibility.

Start the development server with:

```sh
npm run dev -- --custom-user-folder "$(cd .. && pwd)/n8n-cortecs-local-data"
```

The editor runs at http://localhost:5678. The first run may download n8n.

## Support

See the [Cortecs documentation](https://docs.cortecs.ai/) for model capabilities and API details. For support, contact [support@cortecs.ai](mailto:support@cortecs.ai).

## License

[MIT](LICENSE).
