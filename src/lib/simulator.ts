import * as ohm from "ohm-js"

export type Operand = string | number

export type Instruction =
    | { type: "ASSIGNMENT"; line: number; dest: string; op: string; val1: Operand; val2: Operand }
    | { type: "STORE"; line: number; val: Operand; ptr: Operand }
    | { type: "LOAD"; line: number; dest: string; ptr: string }
    | { type: "RET"; line: number; val: Operand | null }
    | { type: 'ALLOCA'; line: number; dest: string }

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
        FunctionDef = "define" Type globalName "(" Params ")" Attribute* "{" Instruction* "}"

        Instruction = Assignment | AllocaInst | StoreInst | LoadInst | ReturnInst

        Assignment = register "=" Op Type Operand "," Operand
        AllocaInst = register "=" "alloca" Type ("," "align" number)?
        StoreInst = "store" Type Operand "," Type register ("," "align" number)?
        LoadInst = register "=" "load" Type "," Type register ("," "align" number)?
        ReturnInst = "ret" Type Operand?

        Op = "add" | "sub" | "mul" | "sdiv"
        Operand = register | number | bool | nullConst
        Type = typeBase "*"*
        typeBase = intType | "ptr" | "void"
        
        // Lexical rules (no implicit space skipping inside)
        intType = "i" digit+
        register = "%" (alnum | "_" | "." | "-")+
        globalName = "@" (alnum | "_" | "." | "-")+
        
        number = hexNumber | decNumber
        hexNumber = "-"? "0x" hexDigit+
        decNumber = "-"? digit+
        
        bool = "true" | "false"
        nullConst = "null"

        Params = listOf<Param, ",">
        Param = Type register?
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

    constructor(instructions: Instruction[]) {
        this.instructions = instructions
        this.pc = 0;
        this.registers = {}
        this.memory = {}
        this.logs = []
        this.isFinished = false;
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
                    if (inst.op === 'add') res = v1 + v2;
                    else if (inst.op === 'sub') res = v1 - v2;
                    else if (inst.op === 'mul') res = v1 * v2;
                    else if (inst.op === 'sdiv') res = Math.trunc(v1 / v2);
                    this.registers[inst.dest] = res;
                    this.logs.push(`${inst.dest} = ${res}`);
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
                    this.logs.push(`Loaded ${val} from 0x${ptr.toString(16)}`)
                    break;
                }
                case 'RET': {
                    const val = inst.val !== null ? this.resolve(inst.val) : 0;
                    this.logs.push(`Exit with code: ${val}`);
                    this.isFinished = true;
                    break;
                }
            }
        } catch (e: any) {
            this.logs.push(`Error: ${e.message}`);
            this.isFinished = true;
        }

        if (!this.isFinished) this.pc++;
        return inst.line;
    }
}

export const semantics = grammar.createSemantics()

semantics.addOperation<any>('parse', {
    Program(funcs) {
        return funcs.children[0].parse();
    },
    FunctionDef(_def, _ret, _name, _lp, _params, _rp, _attrs, _lb, body, _rb) {
        return body.children.map((c: any) => c.parse());
    },
    Instruction(inst) {
        return inst.parse();
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