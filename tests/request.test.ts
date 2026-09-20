import { describe, expect, it } from 'vitest';
import { buildRequestParams } from '../utils/request';

const start = '2024-03-01T10:15:00.000Z';
const end = '2024-03-07T23:59:00.000Z';
const startUnix = String(Math.floor(Date.parse(start) / 1000));
const endUnix = String(Math.floor(Date.parse(end) / 1000));

describe('buildRequestParams', () => {
	it('always sends the operation as the Withings action', () => {
		expect(buildRequestParams('user', 'getdevice')).toEqual({
			endpoint: '/v2/user',
			form: { action: 'getdevice' },
		});
	});

	it('routes activity to /v2/measure with calendar-day dates', () => {
		const { endpoint, form } = buildRequestParams('activity', 'getactivity', {
			startdate: start,
			enddate: end,
		});

		expect(endpoint).toBe('/v2/measure');
		expect(form).toEqual({
			action: 'getactivity',
			startdateymd: '2024-03-01',
			enddateymd: '2024-03-07',
		});
	});

	it('routes sleep to /v2/sleep with calendar-day dates', () => {
		const { endpoint, form } = buildRequestParams('sleep', 'getsummary', { startdate: start });

		expect(endpoint).toBe('/v2/sleep');
		expect(form).toEqual({ action: 'getsummary', startdateymd: '2024-03-01' });
	});

	it('keeps the calendar day the user picked when the date carries a timezone offset', () => {
		const { form } = buildRequestParams('activity', 'getactivity', {
			startdate: '2024-03-01T23:00:00-05:00',
			enddate: '2024-03-02T00:30:00+02:00',
		});

		expect(form).toEqual({
			action: 'getactivity',
			startdateymd: '2024-03-01',
			enddateymd: '2024-03-02',
		});
	});

	it('routes measure getmeas to the v1 endpoint with unix-second dates', () => {
		const { endpoint, form } = buildRequestParams('measure', 'getmeas', {
			startdate: start,
			enddate: end,
		});

		expect(endpoint).toBe('/measure');
		expect(form).toEqual({ action: 'getmeas', startdate: startUnix, enddate: endUnix });
	});

	it('routes other measure operations to /v2/measure with unix-second dates', () => {
		const { endpoint, form } = buildRequestParams('measure', 'getintradayactivity', {
			startdate: start,
		});

		expect(endpoint).toBe('/v2/measure');
		expect(form).toEqual({ action: 'getintradayactivity', startdate: startUnix });
	});

	it('encodes lastupdate as unix seconds for every resource', () => {
		expect(
			buildRequestParams('activity', 'getactivity', { lastupdate: start }).form.lastupdate,
		).toBe(startUnix);
		expect(buildRequestParams('measure', 'getmeas', { lastupdate: start }).form.lastupdate).toBe(
			startUnix,
		);
	});

	it('sends offset only when set', () => {
		expect(buildRequestParams('measure', 'getmeas', { offset: 0 }).form).not.toHaveProperty(
			'offset',
		);
		expect(buildRequestParams('measure', 'getmeas', { offset: 50 }).form.offset).toBe('50');
	});

	it('joins measure types for getmeas and ignores them elsewhere', () => {
		expect(
			buildRequestParams('measure', 'getmeas', {}, { meastype: [1, 4, 6] }).form.meastype,
		).toBe('1,4,6');
		expect(buildRequestParams('measure', 'getmeas', {}, { meastype: [] }).form).not.toHaveProperty(
			'meastype',
		);
		expect(
			buildRequestParams('measure', 'getactivity', {}, { meastype: [1] }).form,
		).not.toHaveProperty('meastype');
	});

	it('joins sleep data fields for sleep get and ignores them elsewhere', () => {
		expect(
			buildRequestParams('sleep', 'get', {}, { dataFields: ['hr', 'rr'] }).form.data_fields,
		).toBe('hr,rr');
		expect(
			buildRequestParams('sleep', 'getsummary', {}, { dataFields: ['hr'] }).form,
		).not.toHaveProperty('data_fields');
	});

	it('does not mutate its inputs', () => {
		const fields = Object.freeze({ startdate: start, offset: 10 });
		const extras = Object.freeze({ meastype: Object.freeze([1, 4]) });

		expect(() => buildRequestParams('measure', 'getmeas', fields, extras)).not.toThrow();
		expect(fields).toEqual({ startdate: start, offset: 10 });
	});
});
