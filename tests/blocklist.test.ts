import { expect, test } from 'vitest';
import Sqids from '../src/index.ts';

test('if no custom blocklist param, use the default blocklist', () => {
	const sqids = new Sqids();

	expect.soft(sqids.decode('aho1e')).toEqual([4572721]);
	expect.soft(sqids.encode([4572721])).toBe('JExTR');
});

test(`if an empty blocklist param passed, don't use any blocklist`, () => {
	const sqids = new Sqids({
		blocklist: new Set([])
	});

	expect.soft(sqids.decode('aho1e')).toEqual([4572721]);
	expect.soft(sqids.encode([4572721])).toBe('aho1e');
});

test('if a non-empty blocklist param passed, use only that', () => {
	const sqids = new Sqids({
		blocklist: new Set([
			'ArUO' // originally encoded [100000]
		])
	});

	// make sure we don't use the default blocklist
	expect.soft(sqids.decode('aho1e')).toEqual([4572721]);
	expect.soft(sqids.encode([4572721])).toBe('aho1e');

	// make sure we are using the passed blocklist
	expect.soft(sqids.decode('ArUO')).toEqual([100000]);
	expect.soft(sqids.encode([100000])).toBe('QyG4');
	expect.soft(sqids.decode('QyG4')).toEqual([100000]);
});

test('blocklist', () => {
	const sqids = new Sqids({
		blocklist: new Set([
			'JSwXFaosAN', // normal result of 1st encoding, let's block that word on purpose
			'OCjV9JK64o', // result of 2nd encoding
			'rBHf', // result of 3rd encoding is `4rBHfOiqd3`, let's block a substring
			'79SM', // result of 4th encoding is `dyhgw479SM`, let's block the postfix
			'7tE6' // result of 4th encoding is `7tE6jdAHLe`, let's block the prefix
		])
	});

	expect.soft(sqids.encode([1_000_000, 2_000_000])).toBe('1aYeB7bRUt');
	expect.soft(sqids.decode('1aYeB7bRUt')).toEqual([1_000_000, 2_000_000]);
});

test('decoding blocklist words should still work', () => {
	const sqids = new Sqids({
		blocklist: new Set(['86Rf07', 'se8ojk', 'ARsz1p', 'Q8AI49', '5sQRZO'])
	});

	expect.soft(sqids.decode('86Rf07')).toEqual([1, 2, 3]);
	expect.soft(sqids.decode('se8ojk')).toEqual([1, 2, 3]);
	expect.soft(sqids.decode('ARsz1p')).toEqual([1, 2, 3]);
	expect.soft(sqids.decode('Q8AI49')).toEqual([1, 2, 3]);
	expect.soft(sqids.decode('5sQRZO')).toEqual([1, 2, 3]);
});

test('match against a short blocklist word', () => {
	const sqids = new Sqids({
		blocklist: new Set(['pnd'])
	});

	expect.soft(sqids.decode(sqids.encode([1000]))).toEqual([1000]);
});

test('blocklist filtering in constructor', () => {
	const sqids = new Sqids({
		alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
		blocklist: new Set(['sxnzkl']) // lowercase blocklist in only-uppercase alphabet
	});

	const id = sqids.encode([1, 2, 3]);
	const numbers = sqids.decode(id);

	expect.soft(id).toEqual('IBSHOZ'); // without blocklist, would've been "SXNZKL"
	expect.soft(numbers).toEqual([1, 2, 3]);
});

test('max encoding attempts', async () => {
	const alphabet = 'abc';
	const minLength = 3;
	const blocklist = new Set(['cab', 'abc', 'bca']);

	const sqids = new Sqids({
		alphabet,
		minLength,
		blocklist
	});

	expect.soft(alphabet.length).toEqual(minLength);
	expect.soft(blocklist.size).toEqual(minLength);

	await expect(async () => sqids.encode([0])).rejects.toThrow(
		'Reached max attempts to re-generate the ID'
	);
});

// "id" == generated sqids uid; "word" == blocklist word
test('specific isBlockedId scenarios', async () => {
	// id or word less than 3 chars should match exactly
	// normally: [100] -> "86u"
	let sqids = new Sqids({
		blocklist: new Set(['hey']) // should *not* regenerate id
	});
	expect.soft(sqids.encode([100])).toEqual('86u');

	// id or word less than 3 chars should match exactly
	// normally: [100] -> "86u"
	sqids = new Sqids({
		blocklist: new Set(['86u']) // should regenerate id
	});
	expect.soft(sqids.encode([100])).toEqual('sec');

	// id or word less than 3 chars should match exactly
	// normally: [1_000_000] -> "gMvFo"
	sqids = new Sqids({
		blocklist: new Set(['vFo']) // should *not* regenerate id
	});
	expect.soft(sqids.encode([1_000_000])).toEqual('gMvFo');

	// word with ints should match id at the beginning
	// normally: [100, 202, 303, 404] -> "lP3iIcG1HkYs"
	sqids = new Sqids({
		blocklist: new Set(['lP3i']) // should regenerate id
	});
	expect.soft(sqids.encode([100, 202, 303, 404])).toEqual('oDqljxrokxRt');

	// word with ints should match id at the end
	// normally: [100, 202, 303, 404] -> "lP3iIcG1HkYs"
	sqids = new Sqids({
		blocklist: new Set(['1HkYs']) // should regenerate id
	});
	expect.soft(sqids.encode([100, 202, 303, 404])).toEqual('oDqljxrokxRt');

	// word with ints should *not* match id in the middle
	// normally: [101, 202, 303, 404, 505, 606, 707] -> "862REt0hfxXVdsLG8vGWD"
	sqids = new Sqids({
		blocklist: new Set(['0hfxX']) // should *not* regenerate id
	});
	expect.soft(sqids.encode([101, 202, 303, 404, 505, 606, 707])).toEqual('862REt0hfxXVdsLG8vGWD');

	// word *without* ints should match id in the middle
	// normally: [101, 202, 303, 404, 505, 606, 707] -> "862REt0hfxXVdsLG8vGWD"
	sqids = new Sqids({
		blocklist: new Set(['hfxX']) // should regenerate id
	});
	expect.soft(sqids.encode([101, 202, 303, 404, 505, 606, 707])).toEqual('seu8n1jO9C4KQQDxdOxsK');
});
