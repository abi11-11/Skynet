]) => void,
    ): void;
    function resolve(
        hostname: string,
        rrtype: "MX",
        callback: (err: NodeJS.ErrnoException | null, addresses: MxRecord[]) => void,
    ): void;
    function resolve(
        hostname: string,
        rrtype: "NAPTR",
        callback: (err: NodeJS.ErrnoException | null, addresses: NaptrRecord[]) => void,
    ): void;
    function resolve(
        hostname: string,
        rrtype: "SOA",
        callback: (err: NodeJS.ErrnoException | null, addresses: SoaRecord) => void,
    ): void;
    function resolve(
        hostname: string,
        rrtype: "SRV",
        callback: (err: NodeJS.ErrnoException | null, addresses: SrvRecord[]) => void,
    ): void;
    function resolve(
        hostname: string,
        rrtype: "TLSA",
        callback: (err: NodeJS.ErrnoException | null, addresses: TlsaRecord[]) => void,
    ): void;
    function resolve(
        hostname: string,
        rrtype: "TXT",
        callback: (err: NodeJS.ErrnoException | null, addresses: string[][]) => void,
    ): void;
    function resolve(
        hostname: string,
        rrtype: string,
        callback: (
            err: NodeJS.ErrnoException | null,
            addresses:
                | string[]
                | CaaRecord[]
                | MxRecord[]
                | NaptrRecord[]
                | SoaRecord
                | SrvRecord[]
                | TlsaRecord[]
                | string[][]
                | AnyRecord[],
        ) => void,
    ): void;
    namespace resolve {
        function __promisify__(hostname: string, rrtype?: "A" | "AAAA" | "CNAME" | "NS" | "PTR"): Promise<string[]>;
        function __promisify__(hostname: string, rrtype: "ANY"): Promise<AnyRecord[]>;
        function __promisify__(hostname: string, rrtype: "CAA"): Promise<CaaRecord[]>;
        function __promisify__(hostname: string, rrtype: "MX"): Promise<MxRecord[]>;
        function __promisify__(hostname: string, rrtype: "NAPTR"): Promise<NaptrRecord[]>;
        function __promisify__(hostname: string, rrtype: "SOA"): Promise<SoaRecord>;
        function __promisify__(hostname: string, rrtype: "SRV"): Promise<SrvRecord[]>;
        function __promisify__(hostname: string, rrtype: "TLSA"): Promise<TlsaRecord[]>;
        function __promisify__(hostname: string, rrtype: "TXT"): Promise<string[][]>;
        function __promisify__(
            hostname: string,
            rrtype: string,
        ): Promise<
            | string[]
            | CaaRecord[]
            | MxRecord[]
            | NaptrRecord[]
            | SoaRecord
            | SrvRecord[]
            | TlsaRecord[]
            | string[][]
            | AnyRecord[]
        >;
    }
    /**
     * Uses the DNS protocol to resolve a IPv4 addresses (`A` records) for the `hostname`. The `addresses` argument passed to the `callback` function
     * will contain an array of IPv4 addresses (e.g.`['74.125.79.104', '74.125.79.105', '74.125.79.106']`).
     * @since v0.1.16
     * @param hostname Host name to resolve.
     */
    function resolve4(
        hostname: string,
        callback: (err: NodeJS.ErrnoException | null, addresses: string[]) => void,
    ): void;
    function resolve4(
        hostname: string,
        options: ResolveWithTtlOptions,
        callback: (err: NodeJS.ErrnoException | null, addresses: RecordWithTtl[]) => void,
    ): void;
    function resolve4(
        hostname: string,
        options: ResolveOptions,
        callback: (err: NodeJS.ErrnoException | null, addresses: string[] | RecordWithTtl[]) => void,
    ): void;
    namespace resolve4 {
        function __promisify__(hostname: string): Promise<string[]>;
        function __promisify__(hostname: string, options: ResolveWithTtlOptions): Promise<RecordWithTtl[]>;
        function __promisify__(hostname: string, options?: ResolveOptions): Promise<string[] | RecordWithTtl[]>;
    }
    /**
     * Uses the DNS protocol to resolve IPv6 addresses (`AAAA` records) for the `hostname`. The `addresses` argument passed to the `callback` function
     * will contain an array ofconst {buildOptions,registerCommonValueParsers} = require("./ParserOptionsBuilder");

class OutputBuilder{
  constructor(options){
    this.options = buildOptions(options);
      this.registeredParsers = registerCommonValueParsers(this.options);
    }
    
    registerValueParser(name,parserInstance){//existing name will override the parser without warning
      this.registeredParsers[name] = parserInstance;
    }

  getInstance(parserOptions){
    return new JsArrBuilder(parserOptions, this.options, this.registeredParsers);
  }
}

const rootName = '!js_arr';
const BaseOutputBuilder = require("./BaseOutputBuilder");

class JsArrBuilder extends BaseOutputBuilder{

  constructor(parserOptions, options,registeredParsers) {
    super();
    this.tagsStack = [];
    this.parserOptions = parserOptions;
    this.options = options;
    this.registeredParsers = registeredParsers;

    this.root = new Node(rootName);
    this.currentNode = this.root;
    this.attributes = {};
  }

  addTag(tag){
    //when a new tag is added, it should be added as child of current node
    //TODO: shift this check to the parser
    if(tag.name === "__proto__") tag.name = "#__proto__";

    this.tagsStack.push(this.currentNode);
    this.currentNode = new Node(tag.name, this.attributes);
    this.attributes = {};
  }

  /**
   * Check if the node should be added by checking user's preference
   * @param {Node} node 
   * @returns boolean: true if the node should not be added
   */
  closeTag(){
    const node = this.currentNode;
    this.currentNode = this.tagsStack.pop(); //set parent node in scope
    if(this.options.onClose !== undefined){
      //TODO TagPathMatcher 
      const resultTag = this.options.onClose(node, 
        new TagPathMatcher(this.tagsStack,node));

      if(resultTag) return;
    }
    this.currentNode.child.push(node);  //to parent node
  }

  //Called by parent class methods
  _addChild(key, val){
    // if(key === "__proto__") tagName = "#__proto__";
    this.currentNode.child.push( {[key]: val });
    // this.currentNode.leafType = false;
  }

  /**
   * Add text value child node 
   * @param {string} text 
   */
  addValue(text){
    this.currentNode.child.push( {[this.options.nameFor.text]: this.parseValue(text, this.options.tags.valueParsers) });
  }

  addPi(name){
    //TODO: set pi flag
    if(!this.options.ignorePiTags){
      const node = new Node(name, this.attributes);
      this.currentNode[":@"] = this.attributes;
      this.currentNode