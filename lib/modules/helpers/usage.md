<a name="scheduleRequests"></a>

## scheduleRequests(minInterval, fn, ...params) ⇒ <code>Promise.&lt;\*&gt;</code>
Schedule requests to a function that returns a Promise on a given interval. This is similar to
Promise.all(), except that one request is sent after another, leaving a minimum interval
(minInterval) between them.

This is useful for making API requests without sending every request at once, in order not to
exceed the API rate limit.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| minInterval | <code>number</code> | The minimum interval between requests, in milliseconds. |
| fn | <code>function</code> | The function to execute. Must return a Promise. |
| ...params | <code>\*</code> | For every parameter required by the function passed to fn, one array is required. Each array must be of the same length, and each element contains the parameters to pass to each request. |

**Example**  
```js
// Suppose that we want to call the function makeApiRequest() three times, with a minimum wait
// of ten seconds between each call.
//
// As an example, the signature of makeApiRequest() could be the following:
// function makeApiRequest(userID: number, username: string): Promise<Result>
// (using TypeScript syntax to illustrate)
//
// Since our function returns a Promise<Result>, scheduleRequest will return Promise<Result[]>,
// Now, let's make the call:

scheduleRequests(
	10000,
	makeApiRequest,
	[
		1,
		2,
		3
	],
	[
		"Foo",
		"Bar",
		"Biz"
	]
).then(results => {
	for (let r of results) {
		// Handle each result individually.
	}
}).catch(console.error);
```
