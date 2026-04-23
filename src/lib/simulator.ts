import * as ohm from "ohm-js"

export class UnsupportedInstructionError extends Error {
    constructor(public readonly instrType: string, detail?: string) {
        super(
            `Unsupported instruction: '${instrType}'.` +
            (detail ? ` ${detail}` : '') +
            ` This simulator only supports a subset of LLVM IR — try simplifying your code or avoiding this construct.`
        );
        this.name = 'UnsupportedInstructionError';
    }
}

export type Operand = any

export type Instruction =
    | { type: "ASSIGNMENT"; line: number; dest: string; op: string; val1: Operand; val2: Operand }
    | { type: "STORE"; line: number; val: Operand; ptr: Operand }
    | { type: "LOAD"; line: number; dest: string; ptr: string }
    | { type: "RET"; line: number; val: Operand | null }
    | { type: 'ALLOCA'; line: number; dest: string }
    | { type: 'ICMP'; line: number; dest: string; cond: string; val1: Operand; val2: Operand }
    | { type: 'BR_COND'; line: number; cond: Operand; iftrue: string; iffalse: string }
    | { type: 'BR_UNCOND'; line: number; dest: string }
    | { type: 'LABEL'; line: number; name: string }
    | { type: 'CALL'; line: number; dest: string | null; funcName: string; args: Operand[] }
    | { type: 'PHI'; line: number; dest: string; incoming: { val: Operand; label: string }[] }
    | { type: 'GEP'; line: number; dest: string; ptr: Operand; indexes: Operand[]; baseType: string }
    | { type: 'SELECT'; line: number; dest: string; cond: Operand; val1: Operand; val2: Operand }
    | { type: 'CONVERSION'; line: number; dest: string; op: string; val: Operand; fromType: string; toType: string }
    | { type: 'SWITCH'; line: number; cond: Operand; defaultLabel: string; cases: { val: Operand; label: string }[] }
    | { type: 'FOP'; line: number; dest: string; op: string; val1: Operand; val2: Operand }
    | { type: 'FCMP'; line: number; dest: string; cond: string; val1: Operand; val2: Operand }
    | { type: 'UNREACHABLE'; line: number; }
    | { type: 'INVOKE'; line: number; dest: string | null; funcName: string; args: Operand[]; normalLabel: string; unwindLabel: string }
    | { type: 'LANDINGPAD'; line: number; dest: string | null }
    | { type: 'RESUME'; line: number; }
    | { type: 'FREEZE'; line: number; dest: string; val: Operand }
    | { type: 'FENCE'; line: number }
    | { type: 'CMPXCHG'; line: number; dest: string; ptr: Operand; cmp: Operand; newval: Operand }
    | { type: 'ATOMICRMW'; line: number; dest: string; op: string; ptr: Operand; val: Operand }
    | { type: 'VA_ARG'; line: number; dest: string }
    | { type: 'INDIRECTBR'; line: number }
    | { type: 'EXTRACTVALUE'; line: number; dest: string; agg: Operand; indexes: number[] }
    | { type: 'INSERTVALUE'; line: number; dest: string; agg: Operand; val: Operand; indexes: number[] }

export interface GlobalDef {
    name: string;
    type: string;
    value: Operand;
}

export interface FunctionDef {
    name: string;
    params: string[];
    instructions: Instruction[];
}

export interface ProgramAst {
    functions: Record<string, FunctionDef>;
    globalVars: Record<string, GlobalDef>;
}

export const grammar = ohm.grammar(`
    LLVM {
        Program = TopLevelEntity+
        TopLevelEntity = FunctionDef | GlobalDef | TypeDef | TargetDef | DeclDef | AttributesDef | MetadataDef | ComdatDef | Unrecognized
        
        Unrecognized = (~("define" | globalName | register "=" "type" | "target" | "declare" | "attributes") any)+ ("\\n" | end)
        
        AttributesDef = "attributes" (~"\\n" any)* ("\\n" | end)
        MetadataDef = "!" (~"\\n" any)* ("\\n" | end)
        ComdatDef = "$" (~"\\n" any)* ("\\n" | end)
        
        TargetDef = "target" (~"\\n" any)* ("\\n" | end)
        DeclDef = "declare" (~"\\n" any)* ("\\n" | end)
        
        FunctionDef = "define" RetAttr* Type globalName "(" Params ")" Attribute* "{" Instruction* "}"

        GlobalDef = globalName "=" GlobalAttr* ("global" | "constant") Type GlobalValue ("," "align" number)?
        GlobalAttr = "private" | "unnamed_addr" | "dso_local" | "local_unnamed_addr" | "linkonce_odr"
        GlobalValue = Operand | ArrayConst | "zeroinitializer" | "null"
        ArrayConst = "c" stringLit -- c
                   | "[" listOf<TypeAndValue, ","> "]" -- arr
        TypeAndValue = Type RetAttr* GlobalValue
        stringLit = "\\\"" (~"\\\"" any)* "\\\""

        TypeDef = TypeDefStruct | TypeDefOpaque
        TypeDefStruct = register "=" "type" "{" listOf<Type, ","> "}"
        TypeDefOpaque = register "=" "type" "opaque"

        Instruction = InstBody InstMeta?
        InstMeta = (","? metadataRef)*
        metadataRef = "!" (alnum | "_" | "-" | ".")+

        InstBody = LabelDef | Assignment | FopInst | AllocaInst | StoreInst | LoadInst | ReturnInst | IcmpInst | FcmpInst | BrInst | SwitchInst | CallInst | PhiInst | GepInst | SelectInst | ConversionInst | UnreachableInst | InvokeInst | LandingPadInst | ResumeInst | FreezeInst | FenceInst | CmpxchgInst | AtomicrmwInst | VaArgInst | IndirectBrInst | CallBrInst | CatchSwitchInst | CatchPadInst | CleanupPadInst | CatchRetInst | CleanupRetInst | ExtractValueInst | InsertValueInst

        InvokeInst = (register "=")? "invoke" (Keyword)* RetAttr* Type globalName "(" CallParams ")" (Keyword | Attribute)* "to" "label" "%" labelNameOrNum "unwind" "label" "%" labelNameOrNum
        LandingPadInst = register "=" "landingpad" (~"\\n" any)*
        ResumeInst = "resume" (~"\\n" any)*
        
        FreezeInst = register "=" "freeze" Type Operand
        FenceInst = "fence" (~"\\n" any)*
        CmpxchgInst = register "=" "cmpxchg" (Keyword)* Type GepPtr "," Type Operand "," Type Operand (~"\\n" any)*
        AtomicrmwInst = register "=" "atomicrmw" (Keyword)* AtomicOp Type GepPtr "," Type Operand (~"\\n" any)*
        AtomicOp = "xchg" | "add" | "sub" | "and" | "nand" | "or" | "xor" | "max" | "min" | "umax" | "umin" | "fadd" | "fsub" | "fmax" | "fmin" | "uinc_wrap" | "udec_wrap"
        VaArgInst = register "=" "va_arg" Type Operand "," Type
        
        IndirectBrInst = "indirectbr" Type Operand "," "[" (~"]" any)* "]"
        CallBrInst = (register "=")? "callbr" (Keyword)* RetAttr* Type globalName "(" CallParams ")" (Keyword | Attribute)* "to" "label" "%" labelNameOrNum "[" (~"]" any)* "]"
        
        CatchSwitchInst = register "=" "catchswitch" (~"\\n" any)*
        CatchPadInst = register "=" "catchpad" (~"\\n" any)*
        CleanupPadInst = register "=" "cleanuppad" (~"\\n" any)*
        CatchRetInst = "catchret" "from" Operand "to" "label" "%" labelNameOrNum
        CleanupRetInst = "cleanupret" "from" Operand "unwind" "label" "%" labelNameOrNum -- label
                       | "cleanupret" "from" Operand "unwind" "to" "caller" -- caller
                       
        ExtractValueInst = register "=" "extractvalue" Type Operand ("," number)+
        InsertValueInst = register "=" "insertvalue" Type Operand "," Type Operand ("," number)+

        UnreachableInst = "unreachable"

        LabelDef = labelNameOrNum ":"
        Assignment = register "=" Op (Keyword | number)* Type Operand "," Operand
        FopInst = register "=" FOp (Keyword)* Type Operand "," Operand
        
        AllocaInst = register "=" "alloca" Type ("," "align" number)?
        StoreInst = "store" (Keyword | number)* Type Operand "," Type GepPtr ("," "align" number)?
        LoadInst = register "=" "load" Type "," Type GepPtr ("," "align" number)?
        ReturnInst = "ret" Type Operand?
        IcmpInst = register "=" "icmp" CmpPredicate Type Operand "," Operand
        FcmpInst = register "=" "fcmp" FcmpPredicate Type Operand "," Operand
        
        BrInst = "br" "i1" Operand "," "label" "%" labelNameOrNum "," "label" "%" labelNameOrNum ","? -- cond
               | "br" "label" "%" labelNameOrNum ","? -- uncond
        
        SwitchInst = "switch" Type Operand "," "label" "%" labelNameOrNum "[" SwitchCase* "]"
        SwitchCase = Type Operand "," "label" "%" labelNameOrNum
        
        CallInst = (register "=")? "call" (Keyword)* RetAttr* Type globalName "(" CallParams ")" (Keyword | Attribute)*
        
        PhiInst = register "=" "phi" Type listOf<PhiIncoming, ",">
        PhiIncoming = "[" Operand "," PhiLabel "]"
        PhiLabel = register | LabelRef
        LabelRef = "%" labelNameOrNum
        
        GepInst = register "=" "getelementptr" "inbounds"? Type "," Type GepPtr ("," Type Operand)*
        GepPtr = register | "null" | "ptr" | globalName
        
        SelectInst = register "=" "select" "i1" Operand "," Type Operand "," Type Operand
        
        ConversionInst = register "=" ConversionOp Type Operand "to" Type
        ConversionOp = "zext" | "sext" | "trunc" | "bitcast" | "ptrtoint" | "inttoptr" | "fptosi" | "fptoui" | "sitofp" | "uitofp" | "fptrunc" | "fpext" | "addrspacecast"

        CallParams = listOf<CallParam, ",">
        CallParam = Type RetAttr* Operand

        Op = "add" | "sub" | "mul" | "sdiv" | "udiv" | "urem" | "srem" | "shl" | "lshr" | "ashr" | "and" | "or" | "xor"
        FOp = "fadd" | "fsub" | "fmul" | "fdiv" | "frem"
        Keyword = "nsw" | "nuw" | "exact" | "inbounds" | "align" | "fast" | "nnan" | "ninf" | "nsz" | "arcp" | "contract" | "afn" | "reassoc" | "tail" | "musttail" | "notail"
        CmpPredicate = "eq" | "ne" | "sgt" | "sge" | "slt" | "sle" | "ugt" | "uge" | "ult" | "ule"
        FcmpPredicate = "false" | "oeq" | "ogt" | "oge" | "olt" | "ole" | "one" | "ord" | "uno" | "ueq" | "ugt" | "uge" | "ult" | "ule" | "une" | "true"
        
        Operand = ConstExpr | register | globalName | number | bool | nullConst | metadataRef
        ConstExpr = "getelementptr" "inbounds"? "(" Type "," Type GepPtr ("," Type Operand)* ")" -- gep
                  | "bitcast" "(" Type Operand "to" Type ")" -- bitcast
        
        Type = ArrayType | PointerType
        ArrayType = "[" number "x" Type "]"
        PointerType = typeBase "*"*
        typeBase = intType | "float" | "double" | "fp128" | "x86_fp80" | "ptr" | "void" | "label" | "metadata" | register | "..."
        
        RetAttr = DerefAttr | AlignAttr | "noundef" | "signext" | "zeroext" | "inreg" | "nocapture" | "readonly" | "nonnull" | "noalias" | "writeonly" | "immarg" | "byval" | "sret" | "nest" | "returned"
        DerefAttr = "dereferenceable" "(" number ")"
        AlignAttr = "align" number
        
        comment = ";" (~"\\n" any)* "\\n"?
        space += comment | "\\n" | "\\r" | "\\t" | " "
        intType = "i" digit+
        register = "%" (alnum | "_" | "." | "-")+
        globalName = "@" (alnum | "_" | "." | "-")+
        labelName = (alnum | "_" | "." | "-")+
        labelNameOrNum = labelName | number | "true" | "false"
        
        number = hexNumber | floatNumber | decNumber
        hexNumber = "-"? "0x" hexDigit+
        floatNumber = "-"? digit+ "." digit+ ("e" ("+"|"-")? digit+)?
        decNumber = "-"? digit+
        
        bool = "true" | "false"
        nullConst = "null" | "undef" | "poison" | "none"

        Params = listOf<Param, ",">
        Param = Type RetAttr* register?
        Attribute = attrNumeric | "nounwind" | "uwtable" | "noinline" | "optnone" | "mustprogress" | "sspstrong" | "sspreq" | "ssp" | "sync" | attrString | attrLabel
        attrLabel = "#" labelName
        attrString = "\\\"" (~"\\\"" any)* "\\\"" ("=" "\\\"" (~"\\\"" any)* "\\\"")?
        attrNumeric = "#" digit+
    }
`);

export interface StackFrame {
    funcName: string;
    pc: number;
    registers: Record<string, any>;
    destRegister: string | null;
    lastBlockLabel: string;
}

export class Simulator {
    functions: Record<string, FunctionDef>
    globalVars: Record<string, GlobalDef>
    globalPtrs: Record<string, number>
    callStack: StackFrame[]
    currentFrame: StackFrame
    memory: Record<number, number>
    logs: string[]
    isFinished: boolean
    stackPtr: number

    constructor(functions: Record<string, FunctionDef>, globalVars: Record<string, GlobalDef> = {}) {
        this.functions = functions;
        this.globalVars = globalVars;
        this.memory = {};
        this.logs = [];
        this.isFinished = false;
        this.callStack = [];
        this.globalPtrs = {};
        this.stackPtr = 0x7000;

        let addr = 0x2000;
        for (const [name, gdef] of Object.entries(this.globalVars)) {
            this.globalPtrs[name] = addr;
            if (Array.isArray(gdef.value)) {
                for (let i = 0; i < gdef.value.length; i++) {
                    this.memory[addr + i * 4] = gdef.value[i] || 0;
                }
                addr += Math.max(4, gdef.value.length * 4);
            } else if (typeof gdef.value === 'string') {
                for (let i = 0; i < gdef.value.length; i++) {
                    this.memory[addr + i * 4] = gdef.value.charCodeAt(i);
                }
                addr += Math.max(4, gdef.value.length * 4);
            } else {
                this.memory[addr] = Number(gdef.value) || 0;
                addr += 4;
            }
        }

        const mainFunc = functions['@main'] || Object.values(functions)[0];
        if (!mainFunc) {
            throw new Error("No executable functions found. Make sure your LLVM IR defines at least one function body (not just 'declare').");
        }

        this.currentFrame = {
            funcName: mainFunc.name,
            pc: 0,
            registers: {},
            destRegister: null,
            lastBlockLabel: "entry"
        };
    }

    private log(msg: string) {
        this.logs.push(`[${this.currentFrame.funcName}#${this.callStack.length}] ${msg}`);
    }

    private resolve(operand: Operand): number {
        if (typeof operand === 'number') return operand;
        if (Array.isArray(operand)) return 0;
        if (typeof operand === 'string') {
            if (operand === 'false') return 0;
            if (operand === 'true') return 1;
            if (operand.startsWith('%')) {
                return this.currentFrame.registers[operand] ?? 0;
            }
            if (operand.startsWith('@')) {
                return this.globalPtrs[operand] ?? 0x2000;
            }
        }
        return 0;
    }

    step(): number | null {
        if (this.isFinished) return null;

        const currentFunc = this.functions[this.currentFrame.funcName];
        if (!currentFunc || this.currentFrame.pc >= currentFunc.instructions.length) {
            if (this.callStack.length > 0) {
                this.popFrame(0);
                return null;
            }
            this.isFinished = true;
            return null;
        }

        const inst = currentFunc.instructions[this.currentFrame.pc];

        try {
            switch (inst.type) {
                case 'LABEL': {
                    this.currentFrame.lastBlockLabel = inst.name;
                    break;
                }
                case 'UNREACHABLE': {
                    this.log(`⚠ 'unreachable' instruction reached — the compiler determined this path should never execute. Halting simulation.`);
                    this.isFinished = true;
                    break;
                }
                case 'INVOKE': {
                    const targetFunc = this.functions[inst.funcName];
                    if (!targetFunc) {
                        throw new Error(
                            `Cannot invoke '${inst.funcName}' — function body not found. ` +
                            `External/library functions (e.g. printf, malloc) are not supported by this simulator. ` +
                            `Try replacing calls to standard library functions with your own implementations.`
                        );
                    }

                    const labelIdx = this.findLabel(currentFunc, inst.normalLabel);
                    if (labelIdx !== -1) {
                        this.currentFrame.pc = labelIdx - 1;
                    } else {
                        throw new Error(`Branch target label '%${inst.normalLabel}' not found in function '${this.currentFrame.funcName}'. The IR may be malformed.`);
                    }
                    const argValues = inst.args.map(arg => this.resolve(arg));
                    this.log(`Invoking ${inst.funcName} with args: ${argValues.join(', ')}`);
                    this.pushFrame(inst.funcName, argValues, inst.dest);
                    return inst.line;
                }
                case 'LANDINGPAD': {
                    if (inst.dest) this.currentFrame.registers[inst.dest] = 0;
                    this.log(`⚠ landingpad reached (C++ exception handling). Exception semantics are not simulated; continuing with a dummy value.`);
                    break;
                }
                case 'RESUME': {
                    this.log(`⚠ 'resume' instruction reached — C++ exception re-throw is not supported by this simulator. Halting.`);
                    this.isFinished = true;
                    break;
                }
                case 'FREEZE': {
                    this.currentFrame.registers[inst.dest] = this.resolve(inst.val);
                    break;
                }
                case 'FENCE': {
                    this.log(`Passed memory fence.`);
                    break;
                }
                case 'CMPXCHG': {
                    const ptr = this.resolve(inst.ptr);
                    const cmp = this.resolve(inst.cmp);
                    const oldVal = this.memory[ptr] ?? 0;
                    const isSuccess = (oldVal === cmp);
                    if (isSuccess) this.memory[ptr] = this.resolve(inst.newval);
                    this.currentFrame.registers[inst.dest] = [oldVal, isSuccess ? 1 : 0];
                    this.log(`cmpxchg 0x${ptr.toString(16)}: ${isSuccess ? 'success' : 'fail'}, obj: ${oldVal}`);
                    break;
                }
                case 'ATOMICRMW': {
                    const ptr = this.resolve(inst.ptr);
                    const val = this.resolve(inst.val);
                    const oldVal = this.memory[ptr] ?? 0;
                    let newVal = oldVal;
                    switch (inst.op) {
                        case 'xchg': newVal = val; break;
                        case 'add': newVal = oldVal + val; break;
                        case 'sub': newVal = oldVal - val; break;
                        case 'and': newVal = oldVal & val; break;
                        case 'nand': newVal = ~(oldVal & val); break;
                        case 'or': newVal = oldVal | val; break;
                        case 'xor': newVal = oldVal ^ val; break;
                        case 'max': case 'umax': newVal = Math.max(oldVal, val); break;
                        case 'min': case 'umin': newVal = Math.min(oldVal, val); break;
                    }
                    this.memory[ptr] = newVal;
                    this.currentFrame.registers[inst.dest] = oldVal;
                    this.log(`atomicrmw ${inst.op} 0x${ptr.toString(16)} -> ${newVal}`);
                    break;
                }
                case 'VA_ARG': {
                    this.currentFrame.registers[inst.dest] = 0;
                    this.log(`⚠ 'va_arg' is not supported (variadic arguments). Returning 0 as a placeholder.`);
                    break;
                }
                case 'INDIRECTBR': {
                    throw new UnsupportedInstructionError('indirectbr', 'Indirect branches (computed gotos) cannot be tracked by this simulator.');
                }
                case 'EXTRACTVALUE': {
                    const agg = this.resolve(inst.agg);
                    let res = agg;
                    if (Array.isArray(agg)) res = agg[inst.indexes[0]] ?? 0;
                    this.currentFrame.registers[inst.dest] = res;
                    break;
                }
                case 'INSERTVALUE': {
                    const agg = this.resolve(inst.agg);
                    const val = this.resolve(inst.val);
                    const newAgg = Array.isArray(agg) ? [...agg] : [];
                    newAgg[inst.indexes[0]] = val;
                    this.currentFrame.registers[inst.dest] = newAgg;
                    break;
                }
                case 'SWITCH': {
                    const cond = this.resolve(inst.cond);
                    let target = inst.defaultLabel;
                    for (const c of inst.cases) {
                        if (this.resolve(c.val) === cond) {
                            target = c.label;
                            break;
                        }
                    }
                    const labelIdx = this.findLabel(currentFunc, target);
                    if (labelIdx !== -1) {
                        this.log(`Switch branching to %${target}`);
                        this.currentFrame.lastBlockLabel = target;
                        this.currentFrame.pc = labelIdx;
                        return inst.line;
                    } else {
                        throw new Error(`Switch target label '%${target}' not found in function '${this.currentFrame.funcName}'. The IR may be malformed.`);
                    }
                }
                case 'FOP': {
                    const v1 = this.resolve(inst.val1);
                    const v2 = this.resolve(inst.val2);
                    let res = 0; let opStr = '';
                    if (inst.op === 'fadd') { res = v1 + v2; opStr = '+'; }
                    else if (inst.op === 'fsub') { res = v1 - v2; opStr = '-'; }
                    else if (inst.op === 'fmul') { res = v1 * v2; opStr = '*'; }
                    else if (inst.op === 'fdiv') { res = v1 / v2; opStr = '/'; }
                    else if (inst.op === 'frem') { res = v1 % v2; opStr = '%'; }
                    this.currentFrame.registers[inst.dest] = res;
                    this.log(`Calc float ${v1} ${opStr} ${v2} = ${res}`);
                    break;
                }
                case 'FCMP': {
                    const v1 = this.resolve(inst.val1);
                    const v2 = this.resolve(inst.val2);
                    let res = false; let opStr = '';
                    switch (inst.cond) {
                        case 'oeq': case 'ueq': res = v1 === v2; opStr = '=='; break;
                        case 'one': case 'une': res = v1 !== v2; opStr = '!='; break;
                        case 'ogt': case 'ugt': res = v1 > v2; opStr = '>'; break;
                        case 'oge': case 'uge': res = v1 >= v2; opStr = '>='; break;
                        case 'olt': case 'ult': res = v1 < v2; opStr = '<'; break;
                        case 'ole': case 'ule': res = v1 <= v2; opStr = '<='; break;
                        case 'true': res = true; opStr = 'true'; break;
                        case 'false': res = false; opStr = 'false'; break;
                        default: res = false; opStr = inst.cond; break;
                    }
                    this.currentFrame.registers[inst.dest] = res ? 1 : 0;
                    this.log(`Float cmp ${v1} ${opStr} ${v2} -> ${res}`);
                    break;
                }
                case 'PHI': {
                    const incoming = inst.incoming.find(inc =>
                        inc.label === this.currentFrame.lastBlockLabel ||
                        inc.label === '%' + this.currentFrame.lastBlockLabel ||
                        inc.label === this.currentFrame.lastBlockLabel.replace('%', '')
                    );
                    const val = incoming ? this.resolve(incoming.val) : 0;
                    this.currentFrame.registers[inst.dest] = val;
                    this.log(`PHI: selected ${val} from block ${this.currentFrame.lastBlockLabel}`);
                    break;
                }
                case 'ASSIGNMENT': {
                    const v1 = this.resolve(inst.val1);
                    const v2 = this.resolve(inst.val2);
                    if (v2 === 0 && ['sdiv', 'udiv', 'srem', 'urem'].includes(inst.op)) {
                        throw new Error(`Division by zero detected in '${inst.op}' (${v1} / 0). Check your source code for a potential division-by-zero bug.`);
                    }
                    let res = 0; let opStr = '';
                    if (inst.op === 'add') { res = v1 + v2; opStr = '+'; }
                    else if (inst.op === 'sub') { res = v1 - v2; opStr = '-'; }
                    else if (inst.op === 'mul') { res = v1 * v2; opStr = '*'; }
                    else if (inst.op === 'sdiv') { res = Math.trunc(v1 / v2); opStr = '/'; }
                    else if (inst.op === 'udiv') { res = Math.trunc((v1 >>> 0) / (v2 >>> 0)); opStr = '/'; }
                    else if (inst.op === 'urem') { res = (v1 >>> 0) % (v2 >>> 0); opStr = '%'; }
                    else if (inst.op === 'srem') { res = v1 % v2; opStr = '%'; }
                    else if (inst.op === 'shl') { res = v1 << v2; opStr = '<<'; }
                    else if (inst.op === 'lshr') { res = v1 >>> v2; opStr = '>>'; }
                    else if (inst.op === 'ashr') { res = v1 >> v2; opStr = '>>'; }
                    else if (inst.op === 'and') { res = v1 & v2; opStr = '&'; }
                    else if (inst.op === 'or') { res = v1 | v2; opStr = '|'; }
                    else if (inst.op === 'xor') { res = v1 ^ v2; opStr = '^'; }
                    this.currentFrame.registers[inst.dest] = res;
                    this.log(`Calculated ${v1} ${opStr} ${v2} = ${res} (stored in ${inst.dest})`);
                    break;
                }
                case 'GEP': {
                    const base = this.resolve(inst.ptr);
                    let offset = 0;
                    let stepSize = 4;
                    if (inst.baseType === 'i8') stepSize = 1;
                    else if (inst.baseType === 'i64' || inst.baseType === 'double' || inst.baseType === 'ptr' || inst.baseType?.includes('*')) stepSize = 8;

                    for (const idx of inst.indexes) {
                        offset += this.resolve(idx) * stepSize;
                    }
                    const res = base + offset;
                    this.currentFrame.registers[inst.dest] = res;
                    this.log(`GEP: 0x${base.toString(16)} + offset -> 0x${res.toString(16)}`);
                    break;
                }
                case 'SELECT': {
                    const cond = this.resolve(inst.cond);
                    const res = cond !== 0 ? this.resolve(inst.val1) : this.resolve(inst.val2);
                    this.currentFrame.registers[inst.dest] = res;
                    this.log(`Select: ${cond !== 0 ? 'true' : 'false'} -> ${res}`);
                    break;
                }
                case 'CONVERSION': {
                    let val = this.resolve(inst.val);
                    if (inst.op === 'trunc') {
                        if (inst.toType === 'i8') val = val & 0xFF;
                        else if (inst.toType === 'i16') val = val & 0xFFFF;
                        else if (inst.toType === 'i32') val = val & 0xFFFFFFFF;
                        else if (inst.toType === 'i1') val = val & 0x1;
                    }
                    else if (inst.op === 'sext') {
                        if (inst.fromType === 'i8') val = (val << 24) >> 24;
                        else if (inst.fromType === 'i16') val = (val << 16) >> 16;
                    }
                    this.currentFrame.registers[inst.dest] = val;
                    this.log(`${inst.op.toUpperCase()}: ${val} -> ${inst.dest}`);
                    break;
                }
                case 'ALLOCA': {
                    const addr = this.stackPtr;
                    this.stackPtr += 64; // Reserve enough space for arrays/structs
                    this.memory[addr] = 0;
                    this.currentFrame.registers[inst.dest] = addr;
                    this.log(`Allocated ${inst.dest} at 0x${addr.toString(16)}`)
                    break;
                }
                case 'STORE': {
                    const val = this.resolve(inst.val);
                    const ptr = this.resolve(inst.ptr);
                    this.memory[ptr] = val;
                    this.log(`Stored ${val} at 0x${ptr.toString(16)}`)
                    break;
                }
                case 'LOAD': {
                    const ptr = this.resolve(inst.ptr);
                    const val = this.memory[ptr] ?? 0;
                    this.currentFrame.registers[inst.dest] = val;
                    this.log(`Loaded ${val} from 0x${ptr.toString(16)} (into ${inst.dest})`);
                    break;
                }
                case 'RET': {
                    const val = inst.val !== null ? this.resolve(inst.val) : 0;
                    this.log(`Returning with value: ${val}`);
                    if (this.callStack.length > 0) {
                        this.popFrame(val);
                        return inst.line;
                    } else {
                        this.isFinished = true;
                        this.logs.push(`Program exited with code: ${val}`);
                    }
                    break;
                }
                case 'ICMP': {
                    const v1 = this.resolve(inst.val1);
                    const v2 = this.resolve(inst.val2);
                    let res = false;
                    let opStr = '';
                    switch (inst.cond) {
                        case 'eq': res = v1 === v2; opStr = '=='; break;
                        case 'ne': res = v1 !== v2; opStr = '!='; break;
                        case 'sgt': res = v1 > v2; opStr = '>'; break;
                        case 'sge': res = v1 >= v2; opStr = '>='; break;
                        case 'slt': res = v1 < v2; opStr = '<'; break;
                        case 'sle': res = v1 <= v2; opStr = '<='; break;
                        case 'ugt': res = (v1 >>> 0) > (v2 >>> 0); opStr = '>'; break;
                        case 'uge': res = (v1 >>> 0) >= (v2 >>> 0); opStr = '>='; break;
                        case 'ult': res = (v1 >>> 0) < (v2 >>> 0); opStr = '<'; break;
                        case 'ule': res = (v1 >>> 0) <= (v2 >>> 0); opStr = '<='; break;
                    }
                    this.currentFrame.registers[inst.dest] = res ? 1 : 0;
                    this.log(`Compared ${v1} ${opStr} ${v2} -> ${res} (stored in ${inst.dest})`);
                    break;
                }
                case 'BR_COND': {
                    const condVal = this.resolve(inst.cond);
                    const target = condVal !== 0 ? inst.iftrue : inst.iffalse;
                    const labelIdx = this.findLabel(currentFunc, target);
                    if (labelIdx !== -1) {
                        this.log(`Branching to %${target}`);
                        this.currentFrame.lastBlockLabel = target;
                        this.currentFrame.pc = labelIdx;
                        return inst.line;
                    } else {
                        throw new Error(`Conditional branch target label '%${target}' not found in '${this.currentFrame.funcName}'. The IR may be malformed.`);
                    }
                }
                case 'BR_UNCOND': {
                    const labelIdx = this.findLabel(currentFunc, inst.dest);
                    if (labelIdx !== -1) {
                        this.log(`Branching to %${inst.dest}`);
                        this.currentFrame.lastBlockLabel = inst.dest;
                        this.currentFrame.pc = labelIdx;
                        return inst.line;
                    } else {
                        throw new Error(`Unconditional branch target label '%${inst.dest}' not found in '${this.currentFrame.funcName}'. The IR may be malformed.`);
                    }
                }
                case 'CALL': {
                    if (inst.funcName.startsWith('@llvm.memcpy')) {
                        const dst = this.resolve(inst.args[0]);
                        const src = this.resolve(inst.args[1]);
                        const size = this.resolve(inst.args[2]);

                        const keysToCopy = Object.keys(this.memory)
                            .map(Number)
                            .filter(k => k >= src && k < src + size);

                        for (const k of keysToCopy) {
                            const offset = k - src;
                            this.memory[dst + offset] = this.memory[k];
                        }

                        this.log(`Intrinsic: memcpy 0x${src.toString(16)} -> 0x${dst.toString(16)} (${size} bytes)`);
                        break;
                    }

                    if (inst.funcName.startsWith('@llvm.memset')) {
                        const dst = this.resolve(inst.args[0]);
                        const val = this.resolve(inst.args[1]);
                        const size = this.resolve(inst.args[2]);

                        for (let i = 0; i < size; i++) {
                            this.memory[dst + i] = val;
                        }

                        this.log(`Intrinsic: memset 0x${dst.toString(16)} with ${val} (${size} bytes)`);
                        break;
                    }

                    const targetFunc = this.functions[inst.funcName];
                    if (!targetFunc) {
                        throw new Error(
                            `Cannot call '${inst.funcName}' — function body not found. ` +
                            `External and standard library functions (e.g. printf, malloc, std::cout) are not supported. ` +
                            `Try replacing standard library calls with your own equivalent logic.`
                        );
                    }
                    const argValues = inst.args.map(arg => this.resolve(arg));
                    this.log(`Calling ${inst.funcName} with args: ${argValues.join(', ')}`);
                    this.pushFrame(inst.funcName, argValues, inst.dest);
                    return inst.line;
                }
            }
        } catch (e: any) {
            const prefix = e instanceof UnsupportedInstructionError ? '⛔ Unsupported' : '💥 Runtime Error';
            this.logs.push(`${prefix}: ${e.message}`);
            this.isFinished = true;
        }

        this.currentFrame.pc++;
        return inst.line;
    }

    private findLabel(func: FunctionDef, name: string): number {
        return func.instructions.findIndex(i => i.type === 'LABEL' && i.name === name);
    }

    private pushFrame(funcName: string, args: number[], destRegister: string | null) {
        const func = this.functions[funcName];
        this.callStack.push({ ...this.currentFrame });

        const newRegisters: Record<string, number> = {};
        func.params.forEach((param, i) => {
            newRegisters[param] = args[i] ?? 0;
        });

        this.currentFrame = {
            funcName,
            pc: 0,
            registers: newRegisters,
            destRegister,
            lastBlockLabel: "entry"
        };
    }

    private popFrame(returnValue: number) {
        const prevFrame = this.callStack.pop();
        if (prevFrame) {
            const dest = this.currentFrame.destRegister;
            this.currentFrame = prevFrame;
            if (dest) {
                this.currentFrame.registers[dest] = returnValue;
            }
            this.currentFrame.pc++;
        } else {
            this.isFinished = true;
        }
    }

    get pc(): number {
        return this.currentFrame.pc;
    }
}

export function parse(code: string): ProgramAst {
    const match = grammar.match(code);
    if (match.failed()) {
        throw new Error(match.message);
    }
    return semantics(match).parse();
}

export const semantics = grammar.createSemantics()

semantics.addOperation<any>('parse', {
    Program(entities) {
        const entityList = entities.children.map(c => c.parse());
        const funcMap: Record<string, FunctionDef> = {};
        const globalMap: Record<string, GlobalDef> = {};
        entityList.forEach(e => {
            if (e && e.type === 'FUNCTION') {
                funcMap[e.name] = e;
            } else if (e && e.type === 'GLOBAL') {
                globalMap[e.name] = e;
            }
        });
        return { functions: funcMap, globalVars: globalMap };
    },
    TopLevelEntity(entity) { return entity.parse(); },
    FunctionDef(_def, _retAttrs, _type, name, _lp, params, _rp, _attrs, _lb, body, _rb) {
        return {
            type: 'FUNCTION',
            name: name.sourceString,
            params: params.parse(),
            instructions: body.children.map((c: any) => c.parse())
        };
    },
    GlobalDef(name, _eq, _attrs, _kw, _type, val, _optComma, _optAlign1, _optAlign2) {
        return {
            type: 'GLOBAL',
            name: name.sourceString,
            value: val.parse()
        };
    },
    GlobalValue(node) { return node.parse(); },
    ArrayConst_c(_c, strLit) { return strLit.parse(); },
    ArrayConst_arr(_lb, list, _rb) { return list.asIteration().children.map(c => c.parse()); },
    TypeAndValue(_type, _attrs, val) { return val.parse(); },
    stringLit(_q1, text, _q2) { return text.sourceString; },
    TypeDef(node) { return node.parse(); },
    TypeDefStruct(_reg, _eq, _type, _lb, _list, _rb) { return { type: 'TYPEDEF' }; },
    TypeDefOpaque(_reg, _eq, _type, _opq) { return { type: 'TYPEDEF' }; },
    TargetDef(_kw, _rest, _nl) { return { type: 'TARGET' }; },
    DeclDef(_kw, _rest, _nl) { return { type: 'DECL' }; },
    AttributesDef(_kw, _rest, _nl) { return { type: 'ATTRIBUTES' }; },
    MetadataDef(_excl, _rest, _nl) { return { type: 'METADATA' }; },
    ComdatDef(_dollar, _rest, _nl) { return { type: 'COMDAT' }; },
    Unrecognized(_chars, _nl) { return null; },

    Instruction(body, _meta) { return body.parse(); },
    InstBody(inst) { return inst.parse(); },
    LabelDef(name, _colon) {
        return { type: 'LABEL', line: this.source.getLineAndColumn().lineNum, name: name.sourceString };
    },
    UnreachableInst(_) {
        return { type: 'UNREACHABLE', line: this.source.getLineAndColumn().lineNum };
    },
    InvokeInst(dest, _eq, _invoke, _k1, _ra, _type, name, _lp, params, _rp, _k2, _to, _l1, _p1, nLbl, _uw, _l2, _p2, eLbl) {
        const d = dest.numChildren > 0 ? dest.children[0].sourceString.replace('=', '').trim() : null;
        return {
            type: 'INVOKE', line: this.source.getLineAndColumn().lineNum,
            dest: d, funcName: name.sourceString, args: params.parse(),
            normalLabel: nLbl.sourceString, unwindLabel: eLbl.sourceString
        };
    },
    LandingPadInst(dest, _eq, _lp, _rest) {
        return { type: 'LANDINGPAD', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString };
    },
    ResumeInst(_rs, _rest) {
        return { type: 'RESUME', line: this.source.getLineAndColumn().lineNum };
    },
    FreezeInst(dest, _eq, _freeze, _t, val) {
        return { type: 'FREEZE', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString, val: val.parse() };
    },
    FenceInst(_fence, _rest) {
        return { type: 'FENCE', line: this.source.getLineAndColumn().lineNum };
    },
    CmpxchgInst(dest, _eq, _cmpxchg, _k, _t1, ptr, _c1, _t2, cmp, _c2, _t3, newval, _rest) {
        return { type: 'CMPXCHG', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString, ptr: ptr.parse(), cmp: cmp.parse(), newval: newval.parse() };
    },
    AtomicrmwInst(dest, _eq, _atomic, _k, op, _t1, ptr, _c1, _t2, val, _rest) {
        return { type: 'ATOMICRMW', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString, op: op.sourceString, ptr: ptr.parse(), val: val.parse() };
    },
    VaArgInst(dest, _eq, _va, _t1, op, _c1, _t2) {
        return { type: 'VA_ARG', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString };
    },
    IndirectBrInst(_ibr, _t1, op, _c1, _lb, _rest, _rb) {
        return { type: 'INDIRECTBR', line: this.source.getLineAndColumn().lineNum };
    },
    CallBrInst(dest, _eq, _callbr, _k1, _ra, _t, name, _lp, params, _rp, _k2, _to, _lbl, _pct, nLbl, _lb, _rest, _rb) {
        const d = dest.numChildren > 0 ? dest.children[0].sourceString.replace('=', '').trim() : null;
        return {
            type: 'INVOKE', line: this.source.getLineAndColumn().lineNum,
            dest: d, funcName: name.sourceString, args: params.parse(),
            normalLabel: nLbl.sourceString, unwindLabel: nLbl.sourceString
        };
    },
    CatchSwitchInst(dest, _eq, _cs, _rest) {
        return { type: 'LANDINGPAD', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString };
    },
    CatchPadInst(dest, _eq, _cp, _rest) {
        return { type: 'LANDINGPAD', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString };
    },
    CleanupPadInst(dest, _eq, _cp, _rest) {
        return { type: 'LANDINGPAD', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString };
    },
    CatchRetInst(_cr, _from, op, _to, _lbl, _pct, dest) {
        return { type: 'BR_UNCOND', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString };
    },
    CleanupRetInst_label(_cr, _from, op, _uw, _lbl, _pct, dest) {
        return { type: 'BR_UNCOND', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString };
    },
    CleanupRetInst_caller(_cr, _f, _op, _uw, _to, _clr) {
        return { type: 'RET', line: this.source.getLineAndColumn().lineNum, val: null };
    },
    ExtractValueInst(dest, _eq, _ev, _t, agg, _c, indexes) {
        return { type: 'EXTRACTVALUE', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString, agg: agg.parse(), indexes: indexes.children.map(c => c.parse()) };
    },
    InsertValueInst(dest, _eq, _iv, _t1, agg, _c1, _t2, val, _c2, indexes) {
        return { type: 'INSERTVALUE', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString, agg: agg.parse(), val: val.parse(), indexes: indexes.children.map(c => c.parse()) };
    },
    Assignment(dest, _eq, op, _kw, _type, val1, _comma, val2) {
        return {
            type: 'ASSIGNMENT', line: this.source.getLineAndColumn().lineNum,
            dest: dest.sourceString, op: op.sourceString,
            val1: val1.parse(), val2: val2.parse()
        };
    },
    FopInst(dest, _eq, op, _kw, _type, val1, _comma, val2) {
        return {
            type: 'FOP', line: this.source.getLineAndColumn().lineNum,
            dest: dest.sourceString, op: op.sourceString,
            val1: val1.parse(), val2: val2.parse()
        }
    },
    IcmpInst(dest, _eq, _icmp, cond, _type, val1, _comma, val2) {
        return {
            type: 'ICMP', line: this.source.getLineAndColumn().lineNum,
            dest: dest.sourceString, cond: cond.sourceString,
            val1: val1.parse(), val2: val2.parse()
        };
    },
    FcmpInst(dest, _eq, _fcmp, cond, _type, val1, _comma, val2) {
        return {
            type: 'FCMP', line: this.source.getLineAndColumn().lineNum,
            dest: dest.sourceString, cond: cond.sourceString,
            val1: val1.parse(), val2: val2.parse()
        }
    },
    SwitchInst(_switch, _type, cond, _comma, _label, _pct, dl, _lb, cases, _rb) {
        return {
            type: 'SWITCH', line: this.source.getLineAndColumn().lineNum,
            cond: cond.parse(), defaultLabel: dl.sourceString,
            cases: cases.children.map(c => c.parse())
        }
    },
    SwitchCase(_type, val, _comma, _label, _pct, target) {
        return { val: val.parse(), label: target.sourceString };
    },
    BrInst_cond(_br, _i1, cond, _c1, _label1, _percent1, iftrue, _c2, _label2, _percent2, iffalse, _optComma) {
        return {
            type: 'BR_COND', line: this.source.getLineAndColumn().lineNum,
            cond: cond.parse(), iftrue: iftrue.sourceString, iffalse: iffalse.sourceString
        };
    },
    BrInst_uncond(_br, _label, _percent, dest, _optComma) {
        return {
            type: 'BR_UNCOND', line: this.source.getLineAndColumn().lineNum,
            dest: dest.sourceString
        };
    },
    AllocaInst(dest, _eq, _alloca, _type, _c, _ak, _an) {
        return { type: 'ALLOCA', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString };
    },
    StoreInst(_store, _kw, _type1, val, _comma, _type2, ptr, _optComma, _ak, _an) {
        return {
            type: 'STORE', line: this.source.getLineAndColumn().lineNum,
            val: val.parse(),
            ptr: ptr.sourceString.replace('%', '') === 'ptr' || ptr.sourceString === 'null' ? ptr.sourceString : ptr.parse()
        };
    },
    LoadInst(dest, _eq, _load, _type1, _comma, _type2, ptr, _optComma, _ak, _an) {
        return {
            type: 'LOAD', line: this.source.getLineAndColumn().lineNum,
            dest: dest.sourceString, ptr: ptr.sourceString
        }
    },
    ReturnInst(_ret, _type, val) {
        const v = val.numChildren > 0 ? val.children[0].parse() : null;
        return { type: 'RET', line: this.source.getLineAndColumn().lineNum, val: v }
    },
    CallInst(dest, _eq, _call, _k, _attrs, _type, name, _lp, params, _rp, _attr2) {
        const d = dest.numChildren > 0 ? dest.children[0].sourceString.replace('=', '').trim() : null;
        return {
            type: 'CALL', line: this.source.getLineAndColumn().lineNum,
            dest: d, funcName: name.sourceString, args: params.parse()
        }
    },
    PhiInst(dest, _eq, _phi, _type, incoming) {
        return {
            type: 'PHI', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString, incoming: incoming.parse()
        };
    },
    PhiIncoming(_lb, val, _comma, label, _rb) {
        return { val: val.parse(), label: label.parse() };
    },
    PhiLabel(node) {
        return node.sourceString.replace('%', '');
    },
    LabelRef(_pct, lbl) {
        return lbl.sourceString;
    },
    GepInst(dest, _eq, _gep, _ib, _t1, _c, _t2, ptr, _restCommas, _restTypes, _restOps) {
        return {
            type: 'GEP', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString, ptr: ptr.parse(),
            indexes: _restOps.children.map(c => c.parse()), baseType: _t1.sourceString
        };
    },
    GepPtr(node) { return node.sourceString; },
    SelectInst(dest, _eq, _select, _i1, cond, _c1, _t1, val1, _c2, _t2, val2) {
        return {
            type: 'SELECT', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString,
            cond: cond.parse(), val1: val1.parse(), val2: val2.parse()
        };
    },
    ConversionInst(dest, _eq, op, _t1, val, _to, _t2) {
        return {
            type: 'CONVERSION', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString,
            op: op.sourceString, val: val.parse(),
            fromType: _t1.sourceString,
            toType: _t2.sourceString
        };
    },
    CallParams(params) { return params.asIteration().children.map(c => c.parse()); },
    CallParam(_type, _attrs, val) { return val.parse(); },

    register(_percent, _chars) { return this.sourceString; },
    globalName(_at, _chars) { return this.sourceString; },
    Type(node) { return node.parse(); },
    ArrayType(_lb, _count, _x, subType, _rb) { return this.sourceString; },
    PointerType(base, _stars) { return this.sourceString; },
    typeBase(node) { return node.sourceString; },
    intType(_i, _digits) { return this.sourceString; },
    number(child) { return child.parse(); },
    hexNumber(_sign, _prefix, _digits) {
        const val = parseInt(_digits.sourceString, 16);
        return _sign.sourceString === '-' ? -val : val;
    },
    floatNumber(_sign, _int, _dot, _frac, _e, _esign, _edigit) {
        return parseFloat(this.sourceString);
    },
    decNumber(_sign, _digits) { return parseInt(this.sourceString, 10); },
    bool(val) { return val.sourceString === 'true' ? 1 : 0; },
    nullConst(_) { return 0; },

    Operand(node) { return node.parse(); },
    ConstExpr(node) { return node.parse(); },
    ConstExpr_gep(_gep, _ib, _lp, _t1, _c1, _t2, ptr, _restC, _restT, _restOps, _rp) {
        return ptr.parse();
    },
    ConstExpr_bitcast(_bc, _lp, _t1, val, _to, _t2, _rp) {
        return val.parse();
    },
    metadataRef(_bang, _chars) { return this.sourceString; },

    Params(params) { return params.asIteration().children.map(c => c.parse()); },
    Param(_type, _attrs, reg) { return reg.numChildren > 0 ? reg.children[0].sourceString : ""; },

    _iter(...children) { return children.map(c => c.parse()); }
})