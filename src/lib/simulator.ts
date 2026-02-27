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

export interface SimulationResult {
    success: boolean
    logs: string[]
    registers: Record<string, number>
    memory: Record<number, number>
    error?: string
}

export const grammar = ohm.grammar(`
    LLVM {
        Program = FunctionDef+
        FunctionDef = "define" RetAttr* Type globalName "(" Params ")" Attribute* "{" Instruction* "}"

        Instruction = LabelDef | Assignment | AllocaInst | StoreInst | LoadInst | ReturnInst | IcmpInst | BrInst

        LabelDef = labelName ":"
        Assignment = register "=" Op Type Operand "," Operand
        AllocaInst = register "=" "alloca" Type ("," "align" number)?
        StoreInst = "store" Type Operand "," Type register ("," "align" number)?
        LoadInst = register "=" "load" Type "," Type register ("," "align" number)?
        ReturnInst = "ret" Type Operand?
        IcmpInst = register "=" "icmp" CmpPredicate Type Operand "," Operand
        BrInst = "br" "i1" Operand "," "label" "%" labelName "," "label" "%" labelName  -- cond
               | "br" "label" "%" labelName                                             -- uncond

        Op = "add" | "sub" | "mul" | "sdiv"
        CmpPredicate = "eq" | "ne" | "sgt" | "sge" | "slt" | "sle"
        Operand = register | number | bool | nullConst
        Type = typeBase "*"*
        typeBase = intType | "ptr" | "void"

        RetAttr = "noundef" | "signext" | "zeroext" | "inreg"
        
        // Lexical rules (no implicit space skipping inside)
        comment = ";" (~"\\n" any)* "\\n"?
        space += comment
        intType = "i" digit+
        register = "%" (alnum | "_" | "." | "-")+
        globalName = "@" (alnum | "_" | "." | "-")+
        labelName = (alnum | "_" | "." | "-")+
        
        number = hexNumber | decNumber
        hexNumber = "-"? "0x" hexDigit+
        decNumber = "-"? digit+
        
        bool = "true" | "false"
        nullConst = "null"

        Params = listOf<Param, ",">
        Param = Type RetAttr* register?
        Attribute = attrNumeric | "nounwind" | "uwtable" | "noinline" | "optnone"
        attrNumeric = "#" digit+
    }
`)

export class Simulator {
    instructions: Instruction[]
    pc: number
    registers: Record<string, number>
    memory: Record<number, number>
    logs: string[]
    isFinished: boolean
    labelMap: Record<string, number>

    constructor(instructions: Instruction[]) {
        this.instructions = instructions
        this.pc = 0;
        this.registers = {}
        this.memory = {}
        this.logs = []
        this.isFinished = false;

        this.labelMap = {}
        for (let i = 0; i < instructions.length; i++) {
            const inst = instructions[i];
            if (inst.type === 'LABEL') {
                this.labelMap[inst.name] = i;
            }
        }
    }

    private resolve(operand: Operand): number {
        if (typeof operand === 'number') return operand;
        if (typeof operand === 'string' && operand.startsWith('%')) {
            return this.registers[operand] ?? 0;
        }
        return 0;
    }

    step(): number | null {
        if (this.pc >= this.instructions.length || this.isFinished) return null;
        const inst = this.instructions[this.pc];

        try {
            switch (inst.type) {
                case 'ASSIGNMENT': {
                    const v1 = this.resolve(inst.val1);
                    const v2 = this.resolve(inst.val2);
                    let res = 0;
                    let opStr = '';
                    if (inst.op === 'add') { res = v1 + v2; opStr = '+'; }
                    else if (inst.op === 'sub') { res = v1 - v2; opStr = '-'; }
                    else if (inst.op === 'mul') { res = v1 * v2; opStr = '*'; }
                    else if (inst.op === 'sdiv') { res = Math.trunc(v1 / v2); opStr = '/'; }
                    this.registers[inst.dest] = res;
                    this.logs.push(`Calculated ${v1} ${opStr} ${v2} = ${res} (stored in ${inst.dest})`);
                    break;
                }
                case 'ALLOCA': {
                    const addr = 0x7000 + (Object.keys(this.memory).length * 4);
                    this.memory[addr] = 0;
                    this.registers[inst.dest] = addr;
                    this.logs.push(`Allocated ${inst.dest} at 0x${addr.toString(16)}`)
                    break;
                }
                case 'STORE': {
                    const val = this.resolve(inst.val);
                    const ptr = this.resolve(inst.ptr);
                    this.memory[ptr] = val;
                    this.logs.push(`Stored ${val} at 0x${ptr.toString(16)}`)
                    break;
                }
                case 'LOAD': {
                    const ptr = this.resolve(inst.ptr);
                    const val = this.memory[ptr] ?? 0;
                    this.registers[inst.dest] = val;
                    this.logs.push(`Loaded ${val} from 0x${ptr.toString(16)} (into ${inst.dest})`);
                    break;
                }
                case 'RET': {
                    const val = inst.val !== null ? this.resolve(inst.val) : 0;
                    this.logs.push(`Exit with code: ${val}`);
                    this.isFinished = true;
                    break;
                }
                case 'LABEL': {
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
                    }
                    this.registers[inst.dest] = res ? 1 : 0;
                    this.logs.push(`Compared ${v1} ${opStr} ${v2} -> ${res} (stored in ${inst.dest})`);
                    break;
                }
                case 'BR_COND': {
                    const condVal = this.resolve(inst.cond);
                    const target = condVal !== 0 ? inst.iftrue : inst.iffalse;
                    if (target in this.labelMap) {
                        this.pc = this.labelMap[target];
                        this.logs.push(`Branching to %${target}`);
                        return inst.line;
                    } else {
                        throw new Error(`Label %${target} not found`);
                    }
                }
                case 'BR_UNCOND': {
                    if (inst.dest in this.labelMap) {
                        this.pc = this.labelMap[inst.dest];
                        this.logs.push(`Branching to %${inst.dest}`);
                        return inst.line;
                    } else {
                        throw new Error(`Label %${inst.dest} not found`);
                    }
                }
            }
        } catch (e: any) {
            this.logs.push(`Error: ${e.message}`);
            this.isFinished = true;
        }

        this.pc++;
        return inst.line;
    }
}

export const semantics = grammar.createSemantics()

semantics.addOperation<any>('parse', {
    Program(funcs) {
        return funcs.children[0].parse();
    },
    FunctionDef(_def, _retAttrs, _type, _name, _lp, _params, _rp, _attrs, _lb, body, _rb) {
        return body.children.map((c: any) => c.parse());
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
    Assignment(dest, _eq, op, _type, val1, _comma, val2) {
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
    BrInst_cond(_br, _i1, cond, _c1, _label1, _percent1, iftrue, _c2, _label2, _percent2, iffalse) {
        return {
            type: 'BR_COND',
            line: this.source.getLineAndColumn().lineNum,
            cond: cond.parse(),
            iftrue: iftrue.sourceString,
            iffalse: iffalse.sourceString
        };
    },
    BrInst_uncond(_br, _label, _percent, dest) {
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
    StoreInst(_store, _type1, val, _comma, _type2, ptr, _optComma, _ak, _an) {
        return {
            type: 'STORE',
            line: this.source.getLineAndColumn().lineNum,
            val: val.parse(),
            ptr: ptr.sourceString.replace('%', '') === 'ptr' ? '' : ptr.parse()
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

    register(_percent, _chars) { return this.sourceString; },
    globalName(_at, _chars) { return this.sourceString; },
    Type(_base, _stars) { return this.sourceString; },
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

    _iter(...children) { return children.map(c => c.parse()); }
})

export function parse(code: string): Instruction[] {
    const match = grammar.match(code);
    if (match.failed()) {
        throw new Error(match.message);
    }
    return semantics(match).parse();
}