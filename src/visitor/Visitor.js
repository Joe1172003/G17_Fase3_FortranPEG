
// Auto-generado

/** @typedef {import('./Node.js').default} Node*/
/**
 * @typedef {{
 *  [rule: string]: string
 * }} ActionTypes
 */

/** 
 * @interface
 * @template T
 */

export default class Visitor {
    /**
     * Tabla que contiene el identificador de función para las opciones de una regla
     * y su tipo de retorno en Fortran.
     * Si una opción de una regla no tiene una entrada en la tabla, significa
     * que no tiene una acción asociada y debe interpretarse como si tuviera
     * un tipo de retorno character(len=:) por defecto.
     * @type {ActionTypes}
     */
    actionReturnTypes;

    /**
     * List with all the actions' code.
     * @type {string[]}
     */
    actions

    /**
     * Wheter we are traversing the starting rule or not.
     * @type {boolean}
     */
    translatingStart;

    /**
     * Id of the current rule we are traversing.
     * @type {string}
     */
    currentRule;

    /**
     * Una regla puede tener muchas opciones (por ejemplo, regla = a/b/c). Esta variable almacena
     * el índice de la elección actual en la regla actual.
     * @type {number}
     */
    currentChoice;


    /**
     * Una elección puede tener muchas expresiones (por ejemplo, regla = abc). Esta variable almacena
     * el índice de la expresión actual en la elección actual.
     * @type {number}
     */
    currentExpr;
    
    
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitGrammar(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitRegla(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitOptions(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitUnion(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitPredicate(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitPluck(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitLabel(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitAnnotated(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitAssertion(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitNegAssertion(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitString(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitClase(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitRange(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitIdentifier(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitDot(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitEnd(node){
            throw new Error('Implement in subclass');
        }
}
