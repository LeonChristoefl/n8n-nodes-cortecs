# n8n-nodes-cortecs

One Cortecs Chat Model node for n8n AI agents and chains, built with the official n8n AI Node SDK.

## Local development

Use Node.js 22.16 or newer and npm. The package uses SDK 0.35.5 for development; the n8n host must provide AI Node SDK API version 1 and `n8n-workflow`.

```sh
npm ci
npm run lint
npm test
npm run scan
npm run dev -- --custom-user-folder "$(cd .. && pwd)/n8n-cortecs-local-data"
```

The development command runs n8n at http://localhost:5678 with the node loaded. The first run may download n8n. Its local data directory is outside the package to avoid recursive development links.

## Usage

1. Create a Cortecs API key in the [Cortecs console](https://cortecs.ai).
2. Add an **AI Agent** or **Basic LLM Chain** to your workflow.
3. Connect **Cortecs Chat Model** to its **Chat Model** connector.
4. Create a **Cortecs API** credential and enter your API key.
5. Select a model from the searchable list or choose **By ID** and enter an exact model ID.
6. Run the workflow. Choose a model labeled **(Tools)** when using an AI Agent with tools.

Optional settings are **Temperature** and **Maximum Output Tokens**. Omitting them preserves provider defaults. Support and limits vary by model.

Credential testing sends a one-token chat request to an inexpensive available non-reasoning model and may incur a small charge. It verifies inference access as well as authentication; insufficient balance, IP restrictions, or provider outages can also make the test fail. Model discovery alone cannot validate a key because the catalog is public.

For local development with `npm run dev`, import [the local example workflow](examples/basic-chain.local.json). The development loader registers the model as `CUSTOM.cortecsChatModel`.

For an installed community package, import [the package example workflow](examples/basic-chain.json), which uses `n8n-nodes-cortecs.cortecsChatModel`. Select your credentials and a model, then execute the workflow. Neither example contains credentials. If n8n offers to install the package during local development, check that you imported the local example.

## Supported behavior

- Dynamic discovery of models with text input and text output; tool-capable models are labeled.
- OpenAI-compatible Chat Completions at `https://api.cortecs.ai/v1`.
- Text generation, streaming, and tool calls through the host SDK, subject to model capabilities.
- One credential type and one model node. No bundled runtime dependencies.

This is an AI model sub-node; prompts and conversation state belong to the parent agent or chain. n8n sub-node expressions follow n8n's sub-node evaluation behavior.

## Validation

```sh
npm test
npm run lint
npm run scan
```

`npm test` builds the package and checks credentials, parameter validation, catalog filtering, SDK configuration, HTTP generation, SSE streaming, a tool-call round trip, and authentication/model errors against a local stand-in. These checks do not establish live Cortecs inference or full n8n workflow compatibility. Local startup and the package loader were additionally smoke-tested with n8n 2.45.7; both the node and credential loaded successfully.

The local stand-in is a Node.js HTTP server in `tests/fixtures/cortecs-server.cjs`. The test runner starts and stops it automatically; no API key or additional testing tools are needed. It uses the public catalog shape observed on 2026-11-02 and synthetic Chat Completions fixtures. Live generation, streaming, tool use, and a manual AI Agent workflow remain release checks requiring a Cortecs credential.

## Release preparation

The package is local and unverified. Nothing has been committed, pushed, or published by this implementation.

Before release, create the intended public repository and confirm `repository.url`, author email, package-name availability, host compatibility, and icon rendering. The repository URL in `package.json` is the proposed destination, not an existing verified repository.

The local source and distribution scanner runs via `npm run scan`. Full registry/provenance verification still requires the published package. Configure npm trusted publishing for `.github/workflows/publish.yml`; the tag-triggered workflow runs checks and publishes with provenance. `npm run release` is the scaffolded release tool and can commit, tag, push, and publish: do not run it for local development.

After publishing, submit through the [Creator Portal](https://creators.n8n.io/nodes). Approval is separate from package installation and publication.

[Verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines.md) · [Cortecs API documentation](https://docs.cortecs.ai/api/api-compatibility)
