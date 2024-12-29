import * as CST from '../visitor/CST.js';

/**
 * @typedef {import('../visitor/Visitor.js').default<string>} Visitor
 */
/**
 * @implements {Visitor}
 */

export default class FortranTranslator{
    /**
     * @param {CST.Productions} node
     * @this {Visitor}
     */ 

    visitProductions(node){
        return `
        function peg_${node.id}() result(accept)
            logical :: accept
            integer :: i
            integer :: j

            accept = .false.
            ${node.expr.accept(this)}
            ${
                node.start
                    ? `
                    if (.not. acceptEOF()) then
                        return
                    end if
                    `
                    : ''
            }
            accept = .true.
        end function peg_${node.id}
        `;
    }
    
    /**
     * @param {CST.Options} node
     * @this {Visitor}
     */

    visitOptions(node) {
        const template = `
        do i = 0, ${node.exprs.length}
            select case(i)
                ${node.exprs
                    .map(
                        (expr, i) => `
                        case(${i})
                            ${expr.accept(this)}
                            exit
                        `
                    )
                    .join('\n')}
            case default
                return
            end select
        end do
        `;
        return template;
    }

    /**
     * @param {CST.Union} node
     * @this {Visitor}
     */
    visitUnion(node) {
        return node.exprs.map((expr) => expr.accept(this)).join('\n');
    }

    /**
     * @param {CST.Expresion} node
     * @this {Visitor}
     */

    visitExpression(node) {
        const condition = node.expr.accept(this);
        const negation = node.label === '!' ? '' : '.not.';
        if(node.qty.length > 1){
            node.qty = node.qty.replace(/\|/g, '')
            if(node.qty.split(',').length == 2){
                //delimiter ['2..5']
            }else{
                let number1 = null;
                let number2 = null;
                console.log(node.qty.split(',')[0][0]);
                if(! isNaN(parseInt(node.qty.split(',')[0][0]))){
                    number1 = parseInt(node.qty.split(',')[0].split('..')[0]);
                }
                console.log(node.qty.split(',')[0][node.qty.split(',')[0].length - 1]);
                if(! isNaN(parseInt(node.qty.split(',')[0][node.qty.split(',')[0].length - 1]))){
                    number2 = parseInt(node.qty.split(',')[0].split('..')[1]);
                }
                console.log(number1, number2);
                if(number1 && number2){
                    return `
                    do j = 0, ${number1}
                        if(j == ${number1}) then
                            do j = ${number1}, ${number2}
                                if(${condition}) then
                                    cycle
                                end if
                                exit
                            end do
                        end if
                        if(${condition}) then
                            cycle
                        end if
                        exit
                    end do
                    `
                }else if(number1){
                    if(number1 == 0){
                        node.qty = "*";
                        return this.getIfQty(node);
                    }
                    node.qty = "+";
                    return this.getIfQty(node);
                }else if(number2){
                    node.qty = "?";
                    return this.getIfQty(node);
                }else{
                    node.qty = "*";
                    return this.getIfQty(node);
                }


            }
        }else{
            return this.getIfQty(node);
        }
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
            .map((char) => `'${char}'`);
        const ranges = node.chars
            .filter((char) => char instanceof CST.Range)
            .map((range) => range.accept(this));
        if (set.length !== 0) {
            characterClass = [`acceptSet([${set.join(',')}])`];
        }
        if (ranges.length !== 0) {
            characterClass = [...characterClass, ...ranges];
        }
        return characterClass.join(' .or. ');
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
        return `peg_${node.id}()`;
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
        return 'acceptEOF()';
    }

    getIfQty(node){
        const condition = node.expr.accept(this);
        const negation = node.label === '!' ? '' : '.not.';
        switch (node.qty) {
            case '+':
                return `
                if (${negation} (${condition})) then
                    cursor = cursor - 1
                    cycle
                end if
                do while (.not. cursor > len(input))
                    if (${negation} (${condition})) then
                        cursor = cursor - 1
                        exit
                    end if
                end do
                `;
            case '*':
                return `
                do while (.not. cursor > len(input))
                    if (${negation} (${condition})) then
                        cursor = cursor - 1
                        exit
                    end if
                end do
                `;
            case '?':
                return `
                if (${condition}) then
                end if
                `;
            default:
                return `
                if (${negation} (${condition})) then
                    cursor = cursor - 1
                    cycle
                end if
                `;
        }
    }

}