import * as CST from '../visitor/CST.js';
import * as Template from '../Templates.js';
import {getActionId, getReturnType, getExprId, getRuleId, getGroupId} from './utils.js';

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
    /** @type {number} */
    currentGroup;
    /** @type {number[]}*/
    groupsVariables

    /** @param {ActionTypes} returnTypes */ 

    constructor(returnTypes){
        this.actionReturnTypes = returnTypes
        this.actions = [];
        this.translatingStart = false;
        this.currentRule = '';
        this.currentChoice = 0;
        this.currentExpr = 0;
        this.currentGroup = 0;
        this.groupsVariables = []
        this.labelMap = {}
    }

    /**
     * @param {CST.Grammar} node
     * @this {Visitor}
    */

    visitGrammar(node){
        const rules = node.rules.map((rule) => rule.accept(this));
        let gCounter = 0
        let decArray = []
        node.rules.forEach((r)=>{
            r.expr.exprs.forEach((u)=>{
                u.exprs.forEach((pE)=>{
                    if(pE.labeledExpr?.annotatedExpr?.expr instanceof CST.Group){
                        decArray.push(`integer,private :: savePoint${gCounter++}`)
                    }
                })
            })
        })

        return Template.main({
            beforeContains: node.globalCode?.before ?? '',
            afterContains: node.globalCode?.after ?? '',
            startingRuleId: getRuleId(node.rules[0].id),
            startingRuleType: getReturnType(
                getActionId(node.rules[0].id, 0),
                this.actionReturnTypes
            ),
            actions: this.actions,
            rules,
            globalDeclarations: decArray
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

        let decArray = node.expr.exprs.flatMap((election, i) => 
            election.exprs.filter((expr) => expr instanceof CST.Pluck)
            .map((label, j)=>{
                const expr = label.labeledExpr.annotatedExpr.expr;
                //console.log(this.actionReturnTypes, getReturnType(getGroupId(expr.id, 0), this.actionReturnTypes), this.actionReturnTypes)
                return `${
                    expr instanceof CST.Identifier 
                    ? getReturnType(getActionId(expr.id, i), this.actionReturnTypes)
                    : expr instanceof CST.Group
                    ? getReturnType(getGroupId(expr.id, 0), this.actionReturnTypes)
                    : 'character(len=:), allocatable'
                } :: expr_${i}_${j}`
            }))
        let gCounter = 0;
        node.expr.exprs.forEach((u)=>{
            u.exprs.forEach((pE)=>{
                if(pE.labeledExpr?.annotatedExpr?.expr instanceof CST.Group){
                    decArray.push(`integer :: i_${gCounter++}`)
                }
            })
        })

        let ruleTranslation = Template.rule({
            id: node.id,
            returnTypes: getReturnType(
                getActionId(node.id, this.currentChoice), this.actionReturnTypes
            ),
            exprDeclarations: decArray,
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
        if(node.type === 'group') return;
        return Template.election({
            exprs: node.exprs.map((expr) =>{
                const traslation = expr.accept(this)
                this.currentChoice++; 
                return traslation;
            }),
            optionNumber: this.counterOptions++,
            type: node.type,
            isStartingRule: this.translatingStart
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

        if(node.action && node.type != 'group') this.actions.push(node.action.accept(this));
        return Template.union({
            exprs: node.exprs.map((expr) =>{
                if(expr.labeledExpr?.annotatedExpr && node.type == 'group') expr.labeledExpr.annotatedExpr.type = 'group';
                const traslation = expr.accept(this);
                if(expr instanceof CST.Pluck && node.type != 'group') this.currentExpr++;

                return traslation
            }),
            startingRule: this.translatingStart,
            positive: node.action?.params === "&",
            negative: node.action?.params === "!",
            resultExpr: node.type != 'group' ? resultExpr : '',
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
        if(node.label){
            const varName = getExprId(this.currentChoice, this.currentExpr);
            this.labelMap[node.label] = varName;
        }
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
            if(node.qty.length > 1){
                node.qty = node.qty.replace(/\|/g, '')
                let number1, number2 = null;
                let delimiter = null;
                const isDelimiter = /^(\d+|\d+\.\.\d+)\s*,\s*['"].*['"]$/;
        
                if(!node.qty.includes(',') && !node.qty.includes('..')){ 
                    const count = (!isNaN(parseInt(node.qty))) 
                        ? parseInt(node.qty)
                        : this.labelMap[node.qty]

                    return Template.strExpr({
                        quantifier: 'only-count',
                        number_1: count,
                        expr: node.expr.accept(this),
                        destination: getExprId(this.currentChoice, this.currentExpr)
                    });
                }else if(isDelimiter.test(node.qty)){
                    const r_strtoArray = /\d+|['"][^'"]*['"]/g;
                    const parts = node.qty.match(r_strtoArray);
                    number1, number2 = null;
                    if(parts.length === 3){
                        delimiter = parts[2]
                       
                        if(!isNaN(parseInt(parts[0]))) number1 = parseInt(parts[0])
                        if(!isNaN(parseInt(parts[1]))) number2 = parseInt(parts[1])
                        
                        if(number1 && number2){
                            return Template.strExpr({
                                quantifier: 'delimiter-minMax',
                                number_1: number1,
                                number_2: number2,
                                delimiter_: delimiter,
                                expr: node.expr.accept(this),
                                destination: getExprId(this.currentChoice, this.currentExpr)
                            });
                        }
                    }else{
                        number1 = (!isNaN(parseInt(parts[0]))) ? parseInt(parts[0]) : parts[0]
                        delimiter = parts[1]
                            return Template.strExpr({
                                quantifier: 'delimiter-count',
                                number_1: number1,
                                delimiter_: delimiter,
                                expr: node.expr.accept(this),
                                destination: getExprId(this.currentChoice, this.currentExpr)
                            });
                    }

                }else{
                    number1, number2 = null; // aqui deveria de entrar 
                    if(!isNaN(parseInt(node.qty.split(',')[0][0]))){
                       number1 = parseInt(node.qty.split(',')[0].split('..')[0]);
                    }
                    if(!isNaN(parseInt(node.qty.split(',')[0][node.qty.split(',')[0].length - 1]))){
                        number2 = parseInt(node.qty.split(',')[0].split('..')[1]);
                    }
                    if(number1 && number2){
                        return Template.strExpr({
                            quantifier: 'min-max',
                            number_1: number1,
                            number_2: number2,
                            expr: node.expr.accept(this),
                            destination: getExprId(this.currentChoice, this.currentExpr) 
                        })
                    }else if(number1){
                        if(number1 === 0){
                            return Template.strExpr({
                                quantifier: "*",
                                expr: node.expr.accept(this),
                                destination: getExprId(this.currentChoice, this.currentExpr),
                            }); 
                        }
                        return Template.strExpr({
                            quantifier: "+",
                            expr: node.expr.accept(this),
                            destination: getExprId(this.currentChoice, this.currentExpr),
                        }); 
                    }else if(number2){
                        return Template.strExpr({
                            quantifier: "?",
                            expr: node.expr.accept(this),
                            destination: getExprId(this.currentChoice, this.currentExpr),
                        }); 
                    }else{
                        return Template.strExpr({
                            quantifier: "*",
                            expr: node.expr.accept(this),
                            destination: getExprId(this.currentChoice, this.currentExpr),
                        }); 
                    }     

                }  
            }else{
                return Template.strExpr({
                    quantifier: node.qty,
                    expr: node.expr.accept(this),
                    destination: getExprId(this.currentChoice, this.currentExpr),
                });
            }
        }else{
            if(node.expr instanceof CST.Group){
                return node.expr.accept(this);
            }

            if(node.expr instanceof CST.Identifier){
                // aqui 
                return `${getExprId(this.currentChoice, this.currentExpr)} = ${node.expr.accept(this)}`;
            }
            return Template.strExpr({
                expr: node.expr.accept(this),
                destination: getExprId(this.currentChoice, this.currentExpr),
                type: node.type
            });
        }
    }

    /**
     * @param {CST.Assertion} node
     * @this {Visitor}
     */
    visitAssertion(node) {
        if (node.assertion instanceof CST.Identifier) {
            return `tmpAssertion = ${node.assertion.accept(this)}`;
        } else {
            return Template.strExprPositive({expr: node.assertion.accept(this)});
        }
    }

    /**
     * @param {CST.NegAssertion} node
     * @this {Visitor}
     */
    visitNegAssertion(node) {
        if (node.assertion instanceof CST.Identifier) {
            return `tmpAssertion = ${node.assertion.accept(this)}`;
        } else {
            return Template.strExprNegative({expr: node.assertion.accept(this)});
        }
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
        return `acceptString('${node.val}', ${(node.isCase) ? '.true.' : '.false.'})`;
    }

    /**
     * @param {CST.Group} node
     * @this {Visitor}
     */
    visitGroup(node) {
        const groupActions = node.exprs
                .map((expr, index) =>{
                    if(expr instanceof CST.Union && expr.action){
                        const fnId = `peg_group_f${this.currentGroup}_${index}`; 
                        const params = Object.keys(expr.action.params).map((label) =>
                            this.labelMap[label] || getExprId(this.currentChoice, this.currentExpr)
                        );
                        this.actions.push(Template.action({
                            ruleId: `group_f${this.currentGroup}_${index}`,
                            choice: 0 ,
                            signature: Object.keys(expr.action.params),
                            returnType: expr.action.returnType,
                            paramDeclarations: Object.entries(expr.action.params).map(
                                ([label, ruleId]) =>
                                    `${getReturnType(getActionId(ruleId, this.currentChoice),
                                        this.actionReturnTypes)} :: ${label}`
                                
                            ),
                            code: expr.action.code
                        }));
                        this.actionReturnTypes[fnId] = expr.action.returnType;
                        return {fnId, params};
                    }
                    return null;
                });        
        
        node.exprs.map((expr) => {
            expr.type = 'group';
        })
        this.groupsVariables.push(this.currentGroup)
        return Template.group({
            exprs: node.exprs.map((expr) => expr.accept(this)),
            destination: getExprId(this.currentChoice, this.currentExpr),
            groupNumber: this.currentGroup++,
            action: groupActions
        })  
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
            characterClass = [`acceptSet([${set.join(',')}], ${(node.isCase) ? '.true.' : '.false.'})`];
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
