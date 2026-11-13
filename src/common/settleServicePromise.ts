type ServicePromise = {
    resolve: (data?: unknown) => void;
    reject: (ex?: unknown) => void;
};

/**
 * Settle a pending service call promise registered under the given identifier.
 * Unknown identifiers (e.g. messages for settled or foreign calls) are ignored.
 * @param {Map<string, ServicePromise>} promises Pending service promises
 * @param {string} uuid Identifier of the pending service call
 * @param result Resolved or rejected value
 * @param {boolean} rejected Settle the promise as rejected when `true`
 */
export function settleServicePromise(
    promises: Map<string, ServicePromise>,
    uuid: string,
    result: unknown,
    rejected: boolean,
): void {
    const promise = promises.get(uuid);
    if (promise === undefined) {
        return;
    }
    if (rejected) {
        promise.reject(result);
    } else {
        promise.resolve(result);
    }
    promises.delete(uuid);
}
