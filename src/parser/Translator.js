import * as CST from '../visitor/CST.js';
import * as Template from '../Templates.js';
import {getActionId, getReturnType, getExprId, getRuleId} from './utils.js';

/**
 * @typedef {import('../visitor/Visitor.js').default<string>} Visitor
 * @typedef {import('../visitor/Visitor.js').ActionTypes} ActionTypes
 */

/**
 * @implements {Visitor}
 */

export default class FortranTranslator{
    /** @type {ActionTypes} */
    actionReturnTypes;
    /** @type {string[]} */
    actions;
    /** @type {boolean} */
    translatingStart;
    /** @type {string} */
    currentRule;
    /** @type {number} */
    currentChoice;
    /** @type {number} */
    currentExpr;

    /** @param {ActionTypes} returnTypes */ 

    constructor(returnTypes){
        this.actionReturnTypes = returnTypes
        this.actions = [];
        this.translatingStart = false;
        this.currentRule = '';
        this.currentChoice = 0;
        this.currentExpr = 0;
    }

    /**
     * @param {CST.Grammar} node
     * @this {Visitor}
    */

    visitGrammar(node){
        const rules = node.rules.map((rule) => rule.accept(this));

        return Template.main({
            beforeContains: node.globalCode?.before ?? '',
            afterContains: node.globalCode?.after ?? '',
            startingRuleId: getRuleId(node.rules[0].id),
            startingRuleType: getReturnType(
                getActionId(node.rules[0].id, 0),
                this.actionReturnTypes
            ),
            actions: this.actions,
            rules
        });
    }

    /**
     * @param {CST.Regla} node
     * @this {Visitor}
     */
    visitRegla(node){
        this.currentRule = node.id
        this.currentChoice = 0;

        if(node.start) this.translatingStart = true;

        const ruleTranslation = Template.rule({
            id: node.id,
            returnTypes: getReturnType(
                getActionId(node.id, this.currentChoice), this.actionReturnTypes
            ),
            exprDeclarations: node.expr.exprs.flatMap((election, i) => 
                election.exprs.filter((expr) => expr instanceof CST.Pluck)
                .map((label, j)=>{
                    const expr = label.labeledExpr.annotatedExpr.expr;
                    return `${
                        expr instanceof CST.Identifier 
                        ? getReturnType(getActionId(expr.id, i), this.actionReturnTypes)
                        : 'character(len=:), allocatable'
                    } :: expr_${i}_${j}`
                })) ,
                expr: node.expr.accept(this)
        });
        this.translatingStart = false;
        return ruleTranslation;
    }
    
    /**
     * @param {CST.Options} node
     * @this {Visitor}
    */
   visitOptions(node){
        return Template.election({
            exprs: node.exprs.map((expr) =>{
                const traslation = expr.accept(this)
                this.currentChoice++; 
                return traslation;
            }),
        });
   }

    /**
     * @param {CST.Union} node
     * @this {Visitor}
     */

    visitUnion(node){
        
        const matchExprs = node.exprs.filter(
            (expr) => expr instanceof CST.Pluck
        );

        const exprVars = matchExprs.map(
            (_, i) => `expr_${this.currentChoice}_${i}`
        );

        /** @type {string[]} */
        let neededExprs;
        /** @type {string} */
        let resultExpr;
        
        const currFnId = getActionId(this.currentRule, this.currentChoice);
        if(currFnId in this.actionReturnTypes){ 
            neededExprs = exprVars.filter( // save arr of the labels
                (_, i) => matchExprs[i].labeledExpr.label
            );
            resultExpr = Template.fnResultExpr({
                fnId: getActionId(this.currentRule, this.currentChoice),
                exprs: neededExprs.length > 0 ? neededExprs : []
            });
        }else{
            neededExprs = exprVars.filter((_, i) => matchExprs[i].pluck);
            resultExpr = Template.strResultExpr({
                exprs: neededExprs.length > 0 ? neededExprs : exprVars
            });
        }
        this.currentExpr = 0;

        if(node.action) this.actions.push(node.action.accept(this));
       
        return Template.union({
            exprs: node.exprs.map((expr) =>{
                const traslation = expr.accept(this);
                if(expr instanceof CST.Pluck) this.currentExpr++;
                return traslation
            }),
            startingRule: this.translatingStart,
            resultExpr,
        });
    }   

    /**
     * @param {CST.Pluck} node
     * @this {Visitor}
     */
    visitPluck(node){
        return node.labeledExpr.accept(this);
    }

    /**
     * @param {CST.Label} node
     * @this {Visitor}
     */
    visitLabel(node){
        return node.annotatedExpr.accept(this);
    }

    /**
     * @param {CST.Annotated} node
     * @this {Visitor}
     */
    visitAnnotated(node){
        if(node.qty && typeof node.qty === 'string'){ // +, *, ?
            if(node.expr instanceof CST.Identifier){
                // TODO: Implement quantifiers (i.e., ?, *, +)
                // expr_0_0 = peg_fizz()
                return `${getExprId(this.currentChoice, this.currentExpr)} = ${node.expr.accept(this)}`;
            }
            return Template.strExpr({
                quantifier: node.qty,
                expr: node.expr.accept(this),
                destination: getExprId(this.currentChoice, this.currentExpr),
            });
        } else if(node.qty){ // TODO: Implement repetitions (e.g., |3|, |1..3|, etc...)
            throw new Error('Repetitions not implemented.');
        }else{
            if(node.expr instanceof CST.Identifier){
                return `${getExprId(this.currentChoice, this.currentExpr)} = ${node.expr.accept(this)}`;
            }
            return Template.strExpr({
                expr: node.expr.accept(this),
                destination: getExprId(this.currentChoice, this.currentExpr),
            });
        }
    }

    /**
     * @param {CST.Assertion} node
     * @this {Visitor}
     */
    visitAssertion(node) {
        throw new Error('Method not implemented.');
    }

    /**
     * @param {CST.NegAssertion} node
     * @this {Visitor}
     */
    visitNegAssertion(node) {
        throw new Error('Method not implemented.');
    }

    /**
     * @param {CST.Predicate} node
     * @this {Visitor}
     */
    visitPredicate(node){
        return Template.action({
            ruleId: this.currentRule,
            choice: this.currentChoice,
            signature: Object.keys(node.params), // params of the function
            returnType: node.returnType,
            paramDeclarations: Object.entries(node.params).map(
                ([label, ruleId]) =>
                    `${getReturnType(
                        getActionId(ruleId, this.currentChoice),
                        this.actionReturnTypes
                    )} :: ${label}`
            ),
            code: node.code
        });
    }

    /**
     * @param {CST.String} node
     * @this {Visitor}
     */
    visitString(node) {
        return `acceptString('${node.val}')`;
    }

    /**
     * @param {CST.Clase} node
     * @this {Visitor}
     */
    visitClase(node) {
        let characterClass = [];
        const set = node.chars
            .filter((char) => typeof char === 'string')
            .map((char) => {
                if (char === ' ') {
                    return 'char(32)';  
                } else if (char === '\\n') {
                    return 'char(10)';
                } else if (char === '\\r') {
                    return 'char(13)';
                } else if (char === '\\t') {
                    return 'char(9)';
                } else if (char === '\\b') {
                    return 'char(8)';
                } else if (char === '\\f') {
                    return 'char(12)';
                } else if (char === '\\v') {
                    return 'char(11)';
                } else if (char === "\\'") {
                    return 'char(39)';
                } else if (char === '\\"') {
                    return 'char(34)';
                } else if (char === '\\\\') {
                    return 'char(92)';
                } else {
                    return (node.isCase) ? `'${char.toLowerCase()}'` : `'${char}'`;
                }
            });
        const ranges = node.chars
            .filter((char) => char instanceof CST.Range)
            .map((range) => {
                if (node.isCase) {
                    range.top = range.top.toLowerCase();
                    range.bottom = range.bottom.toLowerCase();
                }
                return `acceptRange('${range.bottom}', '${range.top}', ${(node.isCase) ? '.true.' : '.false.'})`;
            });
        if (set.length !== 0) {
            characterClass = [`acceptSet([${set.join(',')}], ${(node.isCase) ? '.true.' : 'false'})`];
        }
        if (ranges.length !== 0) {
            characterClass = [...characterClass, ...ranges];
        }
        return `(${characterClass.join(' .or. ')})`;
    }

    /**
     * @param {CST.Range} node
     * @this {Visitor}
     */
    visitRange(node) {
        return `acceptRange('${node.bottom}', '${node.top}')`;
    }

    /**
     * @param {CST.Identifier} node
     * @this {Visitor}
     */
    visitIdentifier(node) {
        return getRuleId(node.id) + '()';
    }

    /**
     * @param {CST.Dot} node
     * @this {Visitor}
     */

    visitDot(node) {
        return 'acceptPeriod()';
    }

    /**
     * @param {CST.End} node
     * @this {Visitor}
     */

    visitEnd(node) {
        return 'if (.not. acceptEOF()) cycle';
    }

}
