import type { INodeProperties } from 'n8n-workflow';

const operationFor = (
	resource: string,
	fallback: string,
	options: INodeProperties['options'],
): INodeProperties => ({
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: [resource] } },
	options,
	default: fallback,
});

const resource: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Activity', value: 'activity' },
		{ name: 'Measure', value: 'measure' },
		{ name: 'Sleep', value: 'sleep' },
		{ name: 'User', value: 'user' },
	],
	default: 'measure',
};

const activityOperation = operationFor('activity', 'getactivity', [
	{
		name: 'Get Activity',
		value: 'getactivity',
		description: 'Get daily activity data',
		action: 'Get activity',
	},
	{
		name: 'Get Summary',
		value: 'getsummary',
		description: 'Get an activity summary',
		action: 'Get activity summary',
	},
	{
		name: 'Get Workouts',
		value: 'getworkouts',
		description: 'Get workout sessions',
		action: 'Get workouts',
	},
]);

const measureOperation = operationFor('measure', 'getmeas', [
	{
		name: 'Get Activity',
		value: 'getactivity',
		description: 'Get activity measures',
		action: 'Get activity measures',
	},
	{
		name: 'Get Intraday Activity',
		value: 'getintradayactivity',
		description: 'Get high-frequency intraday activity',
		action: 'Get intraday activity',
	},
	{
		name: 'Get Measurements',
		value: 'getmeas',
		description: 'Get body measurements such as weight or blood pressure',
		action: 'Get measurements',
	},
]);

const sleepOperation = operationFor('sleep', 'get', [
	{
		name: 'Get',
		value: 'get',
		description: 'Get detailed sleep data',
		action: 'Get sleep data',
	},
	{
		name: 'Get Summary',
		value: 'getsummary',
		description: 'Get a sleep summary',
		action: 'Get sleep summary',
	},
]);

const userOperation = operationFor('user', 'getdevice', [
	{
		name: 'Get',
		value: 'get',
		description: 'Get user information',
		action: 'Get user information',
	},
	{
		name: 'Get Device',
		value: 'getdevice',
		description: 'Get the user devices',
		action: 'Get devices',
	},
	{
		name: 'Get Goals',
		value: 'getgoals',
		description: 'Get the user goals',
		action: 'Get goals',
	},
]);

const additionalFields: INodeProperties = {
	displayName: 'Additional Fields',
	name: 'additionalFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	options: [
		{
			displayName: 'End Date',
			name: 'enddate',
			type: 'dateTime',
			default: '',
			description: 'End of the requested range (calendar day for activity and sleep)',
		},
		{
			displayName: 'Last Update',
			name: 'lastupdate',
			type: 'dateTime',
			default: '',
			description: 'Only return data updated after this moment',
		},
		{
			displayName: 'Offset',
			name: 'offset',
			type: 'number',
			default: 0,
			description: 'Skip this many records',
		},
		{
			displayName: 'Start Date',
			name: 'startdate',
			type: 'dateTime',
			default: '',
			description: 'Start of the requested range (calendar day for activity and sleep)',
		},
	],
};

const measureType: INodeProperties = {
	displayName: 'Measure Type',
	name: 'meastype',
	type: 'multiOptions',
	displayOptions: { show: { resource: ['measure'], operation: ['getmeas'] } },
	options: [
		{ name: 'Body Temperature', value: 71 },
		{ name: 'Bone Mass', value: 88 },
		{ name: 'Diastolic Blood Pressure', value: 9 },
		{ name: 'Fat Free Mass', value: 5 },
		{ name: 'Fat Mass Weight', value: 8 },
		{ name: 'Fat Ratio', value: 6 },
		{ name: 'Heart Pulse', value: 11 },
		{ name: 'Height', value: 4 },
		{ name: 'Hydration', value: 77 },
		{ name: 'Muscle Mass', value: 76 },
		{ name: 'Pulse Wave Velocity', value: 91 },
		{ name: 'Skin Temperature', value: 73 },
		{ name: 'SpO2', value: 54 },
		{ name: 'Systolic Blood Pressure', value: 10 },
		{ name: 'Temperature', value: 12 },
		{ name: 'Weight', value: 1 },
	],
	default: [],
	description: 'Measurement types to return; all types when empty',
};

const dataFields: INodeProperties = {
	displayName: 'Data Fields',
	name: 'dataFields',
	type: 'multiOptions',
	displayOptions: { show: { resource: ['sleep'], operation: ['get'] } },
	options: [
		{ name: 'Heart Rate', value: 'hr' },
		{ name: 'Respiration Rate', value: 'rr' },
		{ name: 'Snoring', value: 'snoring' },
	],
	default: [],
	description: 'Sleep series to include',
};

export const withingsProperties: INodeProperties[] = [
	resource,
	activityOperation,
	measureOperation,
	sleepOperation,
	userOperation,
	additionalFields,
	measureType,
	dataFields,
];
