
// Auto-generated

/**
 * @template T
 * @typedef {import('./Visitor.js').default<T>} Visitor
 */
/**
 * @typedef {import('./Node.js').default} Node
 */


/**
 * @implements {Node}
 */
export class Block {
    /**
     *
     * @param {string} blocCode
     */
    constructor(blocCode) {
        this.blocCode = blocCode;
    }

    /**
     * @template T
     * @param {Visitor<T>} visitor
     * @returns {T}
     */
    accept(visitor) {
        return visitor.visitBlock(this);
    }
}
    

/**
 * @implements {Node}
 */
export class Productions {
    /**
     *
     * @param {string} id
	 * @param {Options} expr
	 * @param {string=} alias
	 * @param {boolean=} start
     */
    constructor(id, expr, alias, start) {
        this.id = id;
		this.expr = expr;
		this.alias = alias;
		this.start = start;
    }

    /**
     * @template T
     * @param {Visitor<T>} visitor
     * @returns {T}
     */
    accept(visitor) {
        return visitor.visitProductions(this);
    }
}
    

/**
 * @implements {Node}
 */
export class Options {
    /**
     *
     * @param {Union[]} exprs
     */
    constructor(exprs) {
        this.exprs = exprs;
    }

    /**
     * @template T
     * @param {Visitor<T>} visitor
     * @returns {T}
     */
    accept(visitor) {
        return visitor.visitOptions(this);
    }
}
    

/**
 * @implements {Node}
 */
export class Union {
    /**
     *
     * @param {Expression[]} exprs
     */
    constructor(exprs) {
        this.exprs = exprs;
    }

    /**
     * @template T
     * @param {Visitor<T>} visitor
     * @returns {T}
     */
    accept(visitor) {
        return visitor.visitUnion(this);
    }
}
    

/**
 * @implements {Node}
 */
export class Expression {
    /**
     *
     * @param {Node} expr
	 * @param {string=} label
	 * @param {string=} qty
     */
    constructor(expr, label, qty) {
        this.expr = expr;
		this.label = label;
		this.qty = qty;
    }

    /**
     * @template T
     * @param {Visitor<T>} visitor
     * @returns {T}
     */
    accept(visitor) {
        return visitor.visitExpression(this);
    }
}
    

/**
 * @implements {Node}
 */
export class String {
    /**
     *
     * @param {string} val
	 * @param {boolean=} isCase
     */
    constructor(val, isCase) {
        this.val = val;
		this.isCase = isCase;
    }

    /**
     * @template T
     * @param {Visitor<T>} visitor
     * @returns {T}
     */
    accept(visitor) {
        return visitor.visitString(this);
    }
}
    

/**
 * @implements {Node}
 */
export class Clase {
    /**
     *
     * @param {(string|Range)[]} chars
	 * @param {boolean=} isCase
     */
    constructor(chars, isCase) {
        this.chars = chars;
		this.isCase = isCase;
    }

    /**
     * @template T
     * @param {Visitor<T>} visitor
     * @returns {T}
     */
    accept(visitor) {
        return visitor.visitClase(this);
    }
}
    

/**
 * @implements {Node}
 */
export class Range {
    /**
     *
     * @param {string} bottom
	 * @param {string} top
     */
    constructor(bottom, top) {
        this.bottom = bottom;
		this.top = top;
    }

    /**
     * @template T
     * @param {Visitor<T>} visitor
     * @returns {T}
     */
    accept(visitor) {
        return visitor.visitRange(this);
    }
}
    

/**
 * @implements {Node}
 */
export class Identifier {
    /**
     *
     * @param {string} id
     */
    constructor(id) {
        this.id = id;
    }

    /**
     * @template T
     * @param {Visitor<T>} visitor
     * @returns {T}
     */
    accept(visitor) {
        return visitor.visitIdentifier(this);
    }
}
    

/**
 * @implements {Node}
 */
export class Dot {
    /**
     *
    
     */
    constructor() {
        
    }

    /**
     * @template T
     * @param {Visitor<T>} visitor
     * @returns {T}
     */
    accept(visitor) {
        return visitor.visitDot(this);
    }
}
    

/**
 * @implements {Node}
 */
export class End {
    /**
     *
    
     */
    constructor() {
        
    }

    /**
     * @template T
     * @param {Visitor<T>} visitor
     * @returns {T}
     */
    accept(visitor) {
        return visitor.visitEnd(this);
    }
}
    
