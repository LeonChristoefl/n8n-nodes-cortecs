import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class CortecsApi implements ICredentialType {
	name = 'cortecsApi';
	displayName = 'Cortecs API';
	documentationUrl = 'https://docs.cortecs.ai/';
	icon = {
		light: 'file:../nodes/CortecsChatModel/cortecs.png',
		dark: 'file:../nodes/CortecsChatModel/cortecs.png',
	} as const;
	httpRequestNode = {
		name: 'Cortecs',
		docsUrl: 'https://docs.cortecs.ai/api',
		apiBaseUrl: 'https://api.cortecs.ai/v1',
	};
	properties: INodeProperties[] = [
		{
			displayName:
				'Testing credentials sends a one-token chat request and may incur a small charge.',
			name: 'testNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
	};
}
