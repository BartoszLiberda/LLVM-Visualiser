import * as ohm from "ohm-js"

export type Operand = string | number

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
    | { type: 'GEP'; line: number; dest: string; ptr: Operand; indexes: Operand[] }
    | { type: 'SELECT'; line: number; dest: string; cond: Operand; val1: Operand; val2: Operand }
    | { type: 'CONVERSION'; line: number; dest: string; op: string; val: Operand }

export interface FunctionDef {
    name: string;
    params: string[];
    instructions: Instruction[];
}

export const grammar = ohm.grammar(`
    LLVM {
        Program = FunctionDef+
        FunctionDef = "define" RetAttr* Type globalName "(" Params ")" Attribute* "{" Instruction* "}"

        Instruction = LabelDef | Assignment | AllocaInst | StoreInst | LoadInst | ReturnInst | IcmpInst | BrInst | CallInst | PhiInst | GepInst | SelectInst | ConversionInst

        LabelDef = labelNameOrNum ":"
        Assignment = register "=" Op (Keyword | number)* Type Operand "," Operand
        AllocaInst = register "=" "alloca" Type ("," "align" number)?
        StoreInst = "store" (Keyword | number)* Type Operand "," Type GepPtr ("," "align" number)?
        LoadInst = register "=" "load" Type "," Type GepPtr ("," "align" number)?
        ReturnInst = "ret" Type Operand?
        IcmpInst = register "=" "icmp" CmpPredicate Type Operand "," Operand
        BrInst = "br" "i1" Operand "," "label" "%" labelNameOrNum "," "label" "%" labelNameOrNum ","?  -- cond
               | "br" "label" "%" labelNameOrNum ","?                                             -- uncond
        
        CallInst = (register "=")? "call" RetAttr* Type globalName "(" CallParams ")"
        
        PhiInst = register "=" "phi" Type listOf<PhiIncoming, ",">
        PhiIncoming = "[" Operand "," PhiLabel "]"
        PhiLabel = register | LabelRef
        LabelRef = "%" labelNameOrNum
        
        GepInst = register "=" "getelementptr" "inbounds"? Type "," Type GepPtr ("," Type Operand)*
        GepPtr = register | "null" | "ptr"
        
        SelectInst = register "=" "select" "i1" Operand "," Type Operand "," Type Operand
        
        ConversionInst = register "=" ConversionOp Type Operand "to" Type
        ConversionOp = "zext" | "sext" | "trunc" | "bitcast" | "ptrtoint" | "inttoptr"

        CallParams = listOf<CallParam, ",">
        CallParam = Type RetAttr* Operand

        Op = "add" | "sub" | "mul" | "sdiv" | "udiv" | "urem" | "srem" | "shl" | "lshr" | "ashr" | "and" | "or" | "xor"
        Keyword = "nsw" | "nuw" | "exact" | "inbounds" | "align"
        CmpPredicate = "eq" | "ne" | "sgt" | "sge" | "slt" | "sle" | "ugt" | "uge" | "ult" | "ule"
        Operand = register | number | bool | nullConst
        
        Type = ArrayType | PointerType
        ArrayType = "[" number "x" Type "]"
        PointerType = typeBase "*"*
        typeBase = intType | "ptr" | "void" | "label"

        RetAttr = "noundef" | "signext" | "zeroext" | "inreg" | "nocapture" | "readonly"
        
        comment = ";" (~"\\n" any)* "\\n"?
        space += comment
        intType = "i" digit+
        register = "%" (alnum | "_" | "." | "-")+
        globalName = "@" (alnum | "_" | "." | "-")+
        labelName = (alnum | "_" | "." | "-")+
        labelNameOrNum = labelName | number
        
        number = hexNumber | decNumber
        hexNumber = "-"? "0x" hexDigit+
        decNumber = "-"? digit+
        
        bool = "true" | "false"
        nullConst = "null"

        Params = listOf<Param, ",">
        Param = Type RetAttr* register?
        Attribute = attrNumeric | "nounwind" | "uwtable" | "noinline" | "optnone" | "mustprogress"
        attrNumeric = "#" digit+
    }
`);

export interface StackFrame {
    funcName: string;
    pc: number;
    registers: Record<string, number>;
    destRegister: string | null;
    lastBlockLabel: string;
}

export class Simulator {
    functions: Record<string, FunctionDef>
    callStack: StackFrame[]
    currentFrame: StackFrame
    memory: Record<number, number>
    logs: string[]
    isFinished: boolean

    constructor(functions: Record<string, FunctionDef>) {
        this.functions = functions;
        this.memory = {};
        this.logs = [];
        this.isFinished = false;
        this.callStack = [];

        const mainFunc = functions['@main'] || Object.values(functions)[0];
        if (!mainFunc) {
            throw new Error("No functions found to execute");
        }

        this.currentFrame = {
            funcName: mainFunc.name,
            pc: 0,
            registers: {},
            destRegister: null,
            lastBlockLabel: "entry"
        };
    }

    private resolve(operand: Operand): number {
        if (typeof operand === 'number') return operand;
        if (typeof operand === 'string' && operand.startsWith('%')) {
            return this.currentFrame.registers[operand] ?? 0;
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
                case 'PHI': {
                    const incoming = inst.incoming.find(inc =>
                        inc.label === this.currentFrame.lastBlockLabel ||
                        inc.label === '%' + this.currentFrame.lastBlockLabel ||
                        inc.label === this.currentFrame.lastBlockLabel.replace('%', '')
                    );
                    const val = incoming ? this.resolve(incoming.val) : 0;
                    this.currentFrame.registers[inst.dest] = val;
                    this.logs.push(`[${this.currentFrame.funcName}] PHI: selected ${val} from block ${this.currentFrame.lastBlockLabel}`);
                    break;
                }
                case 'ASSIGNMENT': {
                    const v1 = this.resolve(inst.val1);
                    const v2 = this.resolve(inst.val2);
                    let res = 0;
                    let opStr = '';
                    if (inst.op === 'add') { res = v1 + v2; opStr = '+'; }
                    else if (inst.op === 'sub') { res = v1 - v2; opStr = '-'; }
                    else if (inst.op === 'mul') { res = v1 * v2; opStr = '*'; }
                    else if (inst.op === 'sdiv') { res = Math.trunc(v1 / v2); opStr = '/'; }
                    else if (inst.op === 'udiv') { res = Math.floor(Math.abs(v1) / Math.abs(v2)); opStr = '/'; }
                    else if (inst.op === 'urem') { res = Math.abs(v1) % Math.abs(v2); opStr = '%'; }
                    else if (inst.op === 'srem') { res = v1 % v2; opStr = '%'; }
                    else if (inst.op === 'shl') { res = v1 << v2; opStr = '<<'; }
                    else if (inst.op === 'lshr') { res = v1 >>> v2; opStr = '>>'; }
                    else if (inst.op === 'ashr') { res = v1 >> v2; opStr = '>>'; }
                    else if (inst.op === 'and') { res = v1 & v2; opStr = '&'; }
                    else if (inst.op === 'or') { res = v1 | v2; opStr = '|'; }
                    else if (inst.op === 'xor') { res = v1 ^ v2; opStr = '^'; }
                    this.currentFrame.registers[inst.dest] = res;
                    this.logs.push(`[${this.currentFrame.funcName}] Calculated ${v1} ${opStr} ${v2} = ${res} (stored in ${inst.dest})`);
                    break;
                }
                case 'GEP': {
                    const base = this.resolve(inst.ptr);
                    let offset = 0;
                    for (const idx of inst.indexes) {
                        offset += this.resolve(idx) * 4;
                    }
                    const res = base + offset;
                    this.currentFrame.registers[inst.dest] = res;
                    this.logs.push(`[${this.currentFrame.funcName}] GEP: 0x${base.toString(16)} + offset -> 0x${res.toString(16)}`);
                    break;
                }
                case 'SELECT': {
                    const cond = this.resolve(inst.cond);
                    const res = cond !== 0 ? this.resolve(inst.val1) : this.resolve(inst.val2);
                    this.currentFrame.registers[inst.dest] = res;
                    this.logs.push(`[${this.currentFrame.funcName}] Select: ${cond !== 0 ? 'true' : 'false'} -> ${res}`);
                    break;
                }
                case 'CONVERSION': {
                    const val = this.resolve(inst.val);
                    this.currentFrame.registers[inst.dest] = val;
                    this.logs.push(`[${this.currentFrame.funcName}] ${inst.op.toUpperCase()}: ${val} -> ${inst.dest}`);
                    break;
                }
                case 'ALLOCA': {
                    const addr = 0x7000 + (Object.keys(this.memory).length * 16);
                    this.memory[addr] = 0;
                    this.currentFrame.registers[inst.dest] = addr;
                    this.logs.push(`[${this.currentFrame.funcName}] Allocated ${inst.dest} at 0x${addr.toString(16)}`)
                    break;
                }
                case 'STORE': {
                    const val = this.resolve(inst.val);
                    const ptr = this.resolve(inst.ptr);
                    this.memory[ptr] = val;
                    this.logs.push(`[${this.currentFrame.funcName}] Stored ${val} at 0x${ptr.toString(16)}`)
                    break;
                }
                case 'LOAD': {
                    const ptr = this.resolve(inst.ptr);
                    const val = this.memory[ptr] ?? 0;
                    this.currentFrame.registers[inst.dest] = val;
                    this.logs.push(`[${this.currentFrame.funcName}] Loaded ${val} from 0x${ptr.toString(16)} (into ${inst.dest})`);
                    break;
                }
                case 'RET': {
                    const val = inst.val !== null ? this.resolve(inst.val) : 0;
                    this.logs.push(`[${this.currentFrame.funcName}] Returning with value: ${val}`);
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
                        case 'ugt': res = v1 > v2; opStr = '>'; break;
                        case 'uge': res = v1 >= v2; opStr = '>='; break;
                        case 'ult': res = v1 < v2; opStr = '<'; break;
                        case 'ule': res = v1 <= v2; opStr = '<='; break;
                    }
                    this.currentFrame.registers[inst.dest] = res ? 1 : 0;
                    this.logs.push(`[${this.currentFrame.funcName}] Compared ${v1} ${opStr} ${v2} -> ${res} (stored in ${inst.dest})`);
                    break;
                }
                case 'BR_COND': {
                    const condVal = this.resolve(inst.cond);
                    const target = condVal !== 0 ? inst.iftrue : inst.iffalse;
                    const labelIdx = this.findLabel(currentFunc, target);
                    if (labelIdx !== -1) {
                        this.currentFrame.lastBlockLabel = target;
                        this.currentFrame.pc = labelIdx;
                        this.logs.push(`[${this.currentFrame.funcName}] Branching to %${target}`);
                        return inst.line;
                    } else {
                        throw new Error(`Label %${target} not found`);
                    }
                }
                case 'BR_UNCOND': {
                    const labelIdx = this.findLabel(currentFunc, inst.dest);
                    if (labelIdx !== -1) {
                        this.currentFrame.lastBlockLabel = inst.dest;
                        this.currentFrame.pc = labelIdx;
                        this.logs.push(`[${this.currentFrame.funcName}] Branching to %${inst.dest}`);
                        return inst.line;
                    } else {
                        throw new Error(`Label %${inst.dest} not found`);
                    }
                }
                case 'CALL': {
                    const targetFunc = this.functions[inst.funcName];
                    if (!targetFunc) {
                        throw new Error(`Function ${inst.funcName} not found`);
                    }
                    const argValues = inst.args.map(arg => this.resolve(arg));
                    this.pushFrame(inst.funcName, argValues, inst.dest);
                    this.logs.push(`[${this.currentFrame.funcName}] Calling ${inst.funcName} with arguments: ${argValues.join(', ')}`);
                    return inst.line;
                }
            }
        } catch (e: any) {
            this.logs.push(`Error: ${e.message}`);
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

export const semantics = grammar.createSemantics()

semantics.addOperation<any>('parse', {
    Program(funcs) {
        const functionList = funcs.children.map(c => c.parse());
        const funcMap: Record<string, FunctionDef> = {};
        functionList.forEach(f => {
            funcMap[f.name] = f;
        });
        return funcMap;
    },
    FunctionDef(_def, _retAttrs, _type, name, _lp, params, _rp, _attrs, _lb, body, _rb) {
        return {
            name: name.sourceString,
            params: params.parse(),
            instructions: body.children.map((c: any) => c.parse())
        };
    },
    Instruction(inst) {
        return inst.parse();
    },
    LabelDef(name, _colon) {
        return {
            type: 'LABEL',
            line: this.source.getLineAndColumn().lineNum,
            name: name.sourceString
        };
    },
    Assignment(dest, _eq, op, _kw, _type, val1, _comma, val2) {
        return {
            type: 'ASSIGNMENT',
            line: this.source.getLineAndColumn().lineNum,
            dest: dest.sourceString,
            op: op.sourceString,
            val1: val1.parse(),
            val2: val2.parse()
        };
    },
    IcmpInst(dest, _eq, _icmp, cond, _type, val1, _comma, val2) {
        return {
            type: 'ICMP',
            line: this.source.getLineAndColumn().lineNum,
            dest: dest.sourceString,
            cond: cond.sourceString,
            val1: val1.parse(),
            val2: val2.parse()
        };
    },
    BrInst_cond(_br, _i1, cond, _c1, _label1, _percent1, iftrue, _c2, _label2, _percent2, iffalse, _optComma) {
        return {
            type: 'BR_COND',
            line: this.source.getLineAndColumn().lineNum,
            cond: cond.parse(),
            iftrue: iftrue.sourceString,
            iffalse: iffalse.sourceString
        };
    },
    BrInst_uncond(_br, _label, _percent, dest, _optComma) {
        return {
            type: 'BR_UNCOND',
            line: this.source.getLineAndColumn().lineNum,
            dest: dest.sourceString
        };
    },
    AllocaInst(dest, _eq, _alloca, _type, _c, _ak, _an) {
        return {
            type: 'ALLOCA',
            line: this.source.getLineAndColumn().lineNum,
            dest: dest.sourceString
        };
    },
    StoreInst(_store, _kw, _type1, val, _comma, _type2, ptr, _optComma, _ak, _an) {
        return {
            type: 'STORE',
            line: this.source.getLineAndColumn().lineNum,
            val: val.parse(),
            ptr: ptr.sourceString.replace('%', '') === 'ptr' || ptr.sourceString === 'null' ? ptr.sourceString : ptr.parse()
        };
    },
    LoadInst(dest, _eq, _load, _type1, _comma, _type2, ptr, _optComma, _ak, _an) {
        return {
            type: 'LOAD',
            line: this.source.getLineAndColumn().lineNum,
            dest: dest.sourceString,
            ptr: ptr.sourceString
        }
    },
    ReturnInst(_ret, _type, val) {
        const v = val.numChildren > 0 ? val.children[0].parse() : null;
        return {
            type: 'RET',
            line: this.source.getLineAndColumn().lineNum,
            val: v
        }
    },
    CallInst(dest, _eq, _call, _attrs, _type, name, _lp, params, _rp) {
        const d = dest.numChildren > 0 ? dest.children[0].sourceString.replace('=', '').trim() : null;
        return {
            type: 'CALL',
            line: this.source.getLineAndColumn().lineNum,
            dest: d,
            funcName: name.sourceString,
            args: params.parse()
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
            indexes: _restOps.children.map(c => c.parse())
        };
    },
    GepPtr(node) {
        return node.sourceString;
    },
    SelectInst(dest, _eq, _select, _i1, cond, _c1, _t1, val1, _c2, _t2, val2) {
        return {
            type: 'SELECT', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString,
            cond: cond.parse(), val1: val1.parse(), val2: val2.parse()
        };
    },
    ConversionInst(dest, _eq, op, _t1, val, _to, _t2) {
        return {
            type: 'CONVERSION', line: this.source.getLineAndColumn().lineNum, dest: dest.sourceString,
            op: op.sourceString, val: val.parse()
        };
    },
    CallParams(params) {
        return params.asIteration().children.map(c => c.parse());
    },
    CallParam(_type, _attrs, val) {
        return val.parse();
    },

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
    decNumber(_sign, _digits) {
        return parseInt(this.sourceString, 10);
    },
    bool(val) { return val.sourceString === 'true' ? 1 : 0; },
    nullConst(_) { return 0; },

    Params(params) {
        return params.asIteration().children.map(c => c.parse());
    },
    Param(_type, _attrs, reg) {
        return reg.numChildren > 0 ? reg.children[0].sourceString : "";
    },

    _iter(...children) { return children.map(c => c.parse()); }
})

export function parse(code: string): Record<string, FunctionDef> {
    const match = grammar.match(code);
    if (match.failed()) {
        throw new Error(match.message);
    }
    return semantics(match).parse();
}