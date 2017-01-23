"use strict";

/**
 * Schedule requests to a function that returns a Promise on a given interval. This is similar to
 * Promise.all(), except that one request is sent after another, leaving a minimum interval
 * (minInterval) between them.
 *
 * This is useful for making API requests without sending every request at once, in order not to
 * exceed the API rate limit.
 *
 * @param {number} minInterval
 * The minimum interval between requests, in milliseconds.
 *
 * @param {function} fn
 * The function to execute. Must return a Promise.
 *
 * @param {...*} params
 * For every parameter required by the function passed to fn, one array is required. Each array
 * must be of the same length, and each element contains the parameters to pass to each request.
 *
 * @returns {Promise<*>}
 *
 * @example
 * // Suppose that we want to call the function makeApiRequest() three times, with a minimum wait
 * // of ten seconds between each call.
 * //
 * // As an example, the signature of makeApiRequest() could be the following:
 * // function makeApiRequest(userID: number, username: string): Promise<Result>
 * // (using TypeScript syntax to illustrate)
 * //
 * // Since our function returns a Promise<Result>, scheduleRequest will return Promise<Result[]>,
 * // Now, let's make the call:
 *
 * scheduleRequests(
 * 	10000,
 * 	makeApiRequest,
 * 	[
 * 		1,
 * 		2,
 * 		3
 * 	],
 * 	[
 * 		"Foo",
 * 		"Bar",
 * 		"Biz"
 * 	]
 * ).then(results => {
 * 	for (let r of results) {
 * 		// Handle each result individually.
 * 	}
 * }).catch(console.error);
 */
function scheduleRequests(minInterval, fn, ...params) {
	return new Promise((fulfill, reject) => {
		/*
		 * STEP 1: REORGANIZE PARAMS
		 *
		 * In the example, the user passes two params to the function makeApiRequest:
		 * [1, 2, 3] and ["foo", "bar", "biz"].
		 *
		 * This gets sent to us in the params variable in the following form:
		 * [
		 * 	[1, 2, 3],
		 * 	["foo", "bar", "biz"]
		 * ]
		 *
		 * Our goal is to fill the requests variable like this:
		 * [
		 * 	[1, "foo"],
		 * 	[2, "bar"],
		 * 	[3, "biz"]
		 * ]
		 *
		 * With that form, it's easy to make the call to makeApiRequest.
		 */

		let numberOfRequests = null;
		let requests = [];

		for (let i = 0; i < params.length; i++) {
			let paramArr = params[i];

			if (numberOfRequests === null) {

				numberOfRequests = paramArr.length;

			} else if (paramArr.length !== numberOfRequests) {

				return reject(new Error("Parameter length mismatch: the first parameter array " +
					"you passed, has " + numberOfRequests + " elements, but one of the others" +
					" has " + paramArr.length + " elements."));

			}

			for (let j = 0; j < paramArr.length; j++) {
				let param = paramArr[j];

				if (typeof requests[j] === "undefined") {
					requests[j] = [];
				}

				requests[j][i] = param;
			}
		}

		/*
		 * STEP 2: MAKE THE CALLS
		 *
		 * Once we have the requests in that format, making the calls is easy.
		 *
		 * We define a function called makeNextCall which will send the first request. Then, it
		 * keep calling itself until no more requests are defined, at which point the function
		 * will end by fulfilling the results array.
		 */

		let currentCall = 0;
		let results = [];

		let makeNextCall = function() {
			let start = Date.now();

			fn(...requests[currentCall]).then(result => {
				results.push(result);

				currentCall++;

				if (requests[currentCall]) {
					// If the elapsed time is less than the minimum interval,
					// wait before making the next call.
					let elapsed = Date.now() - start;

					setTimeout(makeNextCall, minInterval > elapsed ? minInterval - elapsed : 0);
				} else {
					fulfill(results);
				}

			}).catch(reject);
		};

		if (requests[currentCall]) {
			makeNextCall();
		}

	});
}

module.exports = scheduleRequests;