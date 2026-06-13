the error code.
     * Keep in mind that `err.code` will be set to `'ENOTFOUND'` not only when
     * the host name does not exist but also when the lookup fails in other ways
     * such as no available file descriptors.
     *
     * `dns.lookup()` does not necessarily have anything to do with the DNS protocol.
     * The implementation uses an operating system facility that can associate names
     * with addresses and vice versa. This implementation can have subtle but
     * important consequences on the behavior of any Node.js program. Please take some
     * time to consult the [Implementation considerations section](https://nodejs.org/docs/latest-v25.x/api/dns.html#implementation-considerations)
     * before using `dns.lookup()`.
     *
     * Example usage:
     *
     * ```js
     * import dns from 'node:dns';
     * const options = {
     *   family: 6,
     *   hints: dns.ADDRCONFIG | dns.V4MAPPED,
     * };
     * dns.lookup('example.com', options, (err, address, family) =>
     *   console.log('address: %j family: IPv%s', address, family));
     * // address: "2606:2800:220:1:248:1893:25c8:1946" family: IPv6
     *
     * // When options.all is true, the result will be an Array.
     * options.all = true;
     * dns.lookup('example.com', options, (err, addresses) =>
     *   console.log('addresses: %j', addresses));
     * // addresses: [{"address":"2606:2800:220:1:248:1893:25c8:1946","family":6}]
     * ```
     *
     * If this method is invoked as its [util.promisify()](https://nodejs.org/docs/latest-v25.x/api/util.html#utilpromisifyoriginal) ed
     * version, and `all` is not set to `true`, it returns a `Promise` for an `Object` with `address` and `family` properties.
     * @since v0.1.90
     */
    function lookup(
        hostname: string,
        family: number,
        callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
    ): void;
    function lookup(
        hostname: string,
        options: LookupOneOptions,
        callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
    ): void;
    function lookup(
        hostname: string,
        options: LookupAllOptions,
        callback: (err: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void,
    ): void;
    function lookup(
        hostname: string,
        options: LookupOptions,
        callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family: number) => void,
    ): void;
    function lookup(
        hostname: string,
        callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
    ): void;
    namespace lookup {
        function __promisify__(hostname: string, options: LookupAllOptions): Promise<LookupAddress[]>;
        function __promisify__(hostname: string, options?: LookupOneOptions | number): Promise<LookupAddress>;
        function __promisify__(hostname: string, options: LookupOptions): Promise<LookupAddress | LookupAddress[]>;
    }
    /**
     * Resolves the given `address` and `port` into a host name and service using
     * the operating system's underlying `getnameinfo` implementation.
     *
     * If `address` is not a valid IP address, a `TypeError` will be thrown.
     * The `port` will be coerced to a number. If it is not a legal port, a `TypeError` will be thrown.
     *
     * On an error, `err` is an [`Error`](https://nodejs.org/docs/latest-v25.x/api/errors.html#class-error) object,
     * where `err.code` is the error code.
     *
     * ```js
     * import dns from 'node:dns';
     * dns.lookupService('127.0.0.1', 22, (err, hostname, service) => {
     *   console.log(hostname, service);
     *   // Prints: localhost ssh
     * });
     * ```
     *
     * If this method is invoked as its [util.promisify()](https://nodejs.org/docs/latest-v25.x/api/util.html#utilpromisifyoriginal) ed
     * version, it returns a `Promise` for an `Object` with `hostname` and `service` properties.
     * @since v0.11.14
     */
    function lookupService(
        address: string,
        port: number,
        callback: (err: NodeJS.ErrnoException | null, hostname: string, service: string) => void,
    ): void;
    namespace lookupService {
        function __promisify__(
            address: string,
            port: number,
        ): Promise<{
            hostname: string;
            service: string;
        }>;
    }
    interface ResolveOptions {
        ttl: boolean;
    }
    interface ResolveWithTtlOptions extends ResolveOptions {
        ttl: true;
    }
    interface RecordWithTtl {
        address: string;
        ttl: number;
    }
    interface AnyARecord extends RecordWithTtl {
        type: "A";
    }
    interface AnyAaaaRecord extends RecordWithTtl {
        type: "AAAA";
    }
    interface CaaRecord {
        critical: number;
        issue?: string | undefined;
        issuewild?: string | undefined;
        iodef?: string | undefined;
        contactemail?: string | undefined;
        contactphone?: string | undefined;
    }
    interface AnyCaaRecord extends CaaRecord {
        type: "CAA";
    }
    interface MxRecord {
        priority: number;
        exchange: string;
    }
    interface AnyMxRecord extends MxRecord {
        type: "MX";
    }
    interface NaptrRecord {
        flags: string;
        service: string;
        regexp: string;
        replacement: string;
        order: number;
        preference: number;
    }
    interface AnyNaptrRecord extends NaptrRecord {
        type: "NAPTR";
    }
    interface SoaRecord {
        nsname: string;
        hostmaster: string;
        serial: number;
        refresh: number;
        retry: number;
        expire: number;
        minttl: number;
    }
    interface AnySoaRecord extends SoaRecord {
        type: "SOA";
    }
    interface SrvRecord {
        priority: number;
        weight: number;
        port: number;
        name: string;
    }
    interface AnySrvRecord extends SrvRecord {
        type: "SRV";
    }
    interface TlsaRecord {
        certUsage: number;
        selector: number;
        match: number;
        data: ArrayBuffer;
    }
    interface AnyTlsaRecord extends TlsaRecord {
        type: "TLSA";
    }
    interface AnyTxtRecord {
        type: "TXT";
        entries: string[];
    }
    interface AnyNsRecord {
        type: "NS";
        value: string;
    }
    interface AnyPtrRecord {
        type: "PTR";
        value: string;
    }
    interface AnyCnameRecord {
        type: "CNAME";
        value: string;
    }
    type AnyRec