import { supplyModel } from '@n8n/ai-node-sdk';
import type {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	INodeCredentialTestResult,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
	INodeParameterResourceLocator,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const BASE_URL = 'https://api.cortecs.ai/v1';

function requestGuidance(status?: number): string {
	switch (status) {
		case 401:
			return "Cortecs did not accept the API key. Check the 'API Key' in your Cortecs API credential, or create a new key in the Cortecs console.";
		case 402:
			return 'Cortecs requires payment before completing this request. Check your balance and billing in the Cortecs console, then try again.';
		case 403:
			return 'Cortecs denied access to this request. Check your API key permissions and IP restrictions in the Cortecs console.';
		case 404:
			return 'Cortecs could not find the requested endpoint or model. Refresh the model list and try again; if this continues, contact Cortecs support.';
		case 429:
			return 'Cortecs is limiting requests. Wait before trying again and check your usage limits in the Cortecs console.';
		default:
			if (status !== undefined && status >= 500) {
				return 'Cortecs is temporarily unable to complete the request. Try again later; if this continues, contact Cortecs support.';
			}
			return 'Could not complete the Cortecs request. Check your connection, API key, balance, IP restrictions, and service availability, then try again.';
	}
}

function httpStatus(error: unknown): number | undefined {
	if (typeof error !== 'object' || error === null) return undefined;
	const details = error as {
		status?: unknown;
		statusCode?: unknown;
		httpCode?: unknown;
		response?: { status?: unknown };
	};
	const value = Number(
		details.statusCode ?? details.status ?? details.httpCode ?? details.response?.status,
	);
	return Number.isInteger(value) && value >= 100 && value <= 599 ? value : undefined;
}

interface CortecsModel {
	id: string;
	description?: string;
	input_modalities?: string[];
	output_modalities?: string[];
	supported_features?: string[];
}

export class CortecsChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cortecs Chat Model',
		name: 'cortecsChatModel',
		icon: { light: 'file:cortecs.png', dark: 'file:cortecs.png' },
		subtitle: '={{$parameter.model.value}}',
		group: ['transform'],
		version: 1,
		description: 'Use Cortecs chat models with AI agents and chains',
		defaults: { name: 'Cortecs Chat Model' },
		codex: { categories: ['AI'], subcategories: { AI: ['Language Models'] } },
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [{ name: 'cortecsApi', required: true, testedBy: 'cortecsApiTest' }],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'Choose a model. For AI agents, select a model with tool support.',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: { searchListMethod: 'getModels', searchable: true },
					},
					{ displayName: 'By ID', name: 'id', type: 'string', placeholder: 'e.g. kolibri-1' },
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Maximum Output Tokens',
						name: 'maxTokens',
						type: 'number',
						default: 1024,
						typeOptions: { minValue: 1, numberPrecision: 0 },
						description:
							'Maximum number of tokens to generate. Leave unset to use the model default.',
					},
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
						typeOptions: { minValue: 0, maxValue: 2 },
						description:
							'Sampling temperature, if supported by the model. Leave unset to use the model default.',
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async cortecsApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				try {
					const headers = { Authorization: `Bearer ${String(credential.data?.apiKey ?? '')}` };
					// The credential-test context has no modern HTTP helper. Use native
					// fetch to fixed Cortecs URLs rather than n8n's deprecated request API.
					const catalogResponse = await fetch(`${BASE_URL}/models`, {
						headers,
						signal: AbortSignal.timeout(30000),
					});
					if (!catalogResponse.ok)
						return { status: 'Error', message: requestGuidance(catalogResponse.status) };
					const catalog = (await catalogResponse.json()) as {
						data: (CortecsModel & { pricing?: { output_token?: number } })[];
					};
					// Prefer inexpensive non-reasoning models for a minimal, authenticated request.
					const candidates = catalog.data.filter(
						(model) =>
							model.input_modalities?.includes('text') &&
							model.output_modalities?.includes('text') &&
							!model.supported_features?.includes('reasoning'),
					);
					candidates.sort(
						(a, b) => (a.pricing?.output_token ?? Infinity) - (b.pricing?.output_token ?? Infinity),
					);
					if (!candidates.length) {
						return {
							status: 'Error',
							message:
								'No text model without reasoning is available for the credential test. Try again later; if this continues, contact Cortecs support.',
						};
					}
					const response = await fetch(`${BASE_URL}/chat/completions`, {
						method: 'POST',
						headers: { ...headers, 'Content-Type': 'application/json' },
						signal: AbortSignal.timeout(30000),
						body: JSON.stringify({
							model: candidates[0].id,
							messages: [{ role: 'user', content: 'Hi' }],
							max_tokens: 1,
						}),
					});
					await response.text();
					if (!response.ok)
						return {
							status: 'Error',
							message: requestGuidance(response.status),
						};
					return { status: 'OK', message: 'Cortecs credentials are valid' };
				} catch (error: unknown) {
					return {
						status: 'Error',
						message:
							error instanceof Error &&
							(error.name === 'TimeoutError' || error.name === 'AbortError')
								? 'The Cortecs credential test timed out. Check your connection and Cortecs service availability, then try again.'
								: requestGuidance(),
					};
				}
			},
		},
		listSearch: {
			async getModels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				try {
					const response = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'cortecsApi',
						{
							method: 'GET',
							url: `${BASE_URL}/models`,
							json: true,
						},
					)) as { data: CortecsModel[] };
					const query = filter?.toLowerCase() ?? '';
					return {
						results: response.data
							.filter(
								(model) =>
									model.input_modalities?.includes('text') &&
									model.output_modalities?.includes('text'),
							)
							.filter((model) => model.id.toLowerCase().includes(query))
							.sort((a, b) => a.id.localeCompare(b.id))
							.map((model) => ({
								name: model.supported_features?.includes('tools')
									? `${model.id} (Tools)`
									: model.id,
								value: model.id,
								description: model.description,
							})),
					};
				} catch (error: unknown) {
					const status = httpStatus(error);
					throw new NodeApiError(
						this.getNode(),
						{},
						{
							message: 'Could not load Cortecs models',
							description: `${requestGuidance(status)} You can also choose 'By ID' in 'Model' and enter a known model ID.`,
							httpCode: status?.toString(),
						},
					);
				}
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('cortecsApi');
		const locator = this.getNodeParameter('model', itemIndex) as INodeParameterResourceLocator;
		const model = String(locator.value ?? '').trim();
		if (!model) {
			throw new NodeOperationError(this.getNode(), "The 'Model' parameter is empty", {
				itemIndex,
				description:
					"Select a model from 'From List', or choose 'By ID' and enter a Cortecs model ID.",
			});
		}
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			temperature?: number;
			maxTokens?: number;
		};
		if (
			options.temperature !== undefined &&
			(!Number.isFinite(options.temperature) || options.temperature < 0 || options.temperature > 2)
		) {
			throw new NodeOperationError(
				this.getNode(),
				"The 'Temperature' value is outside the supported range",
				{
					itemIndex,
					description:
						"Enter a number between 0 and 2, or remove 'Temperature' from 'Options' to use the model default.",
				},
			);
		}
		if (
			options.maxTokens !== undefined &&
			(!Number.isInteger(options.maxTokens) || options.maxTokens < 1)
		) {
			throw new NodeOperationError(
				this.getNode(),
				"The 'Maximum Output Tokens' value is not a positive integer",
				{
					itemIndex,
					description:
						"Enter a whole number of at least 1, or remove 'Maximum Output Tokens' from 'Options' to use the model default.",
				},
			);
		}
		return supplyModel(this, {
			type: 'openai',
			baseUrl: BASE_URL,
			apiKey: String(credentials.apiKey),
			model,
			useResponsesApi: false,
			supportsStrictToolCalling: false,
			temperature: options.temperature,
			maxTokens: options.maxTokens,
		});
	}
}
