
// Auto-generated

/** @typedef {import('./Node.js').default} Node*/

/** @template T */
export default class Visitor {
    
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitBlock(node){
            throw new Error('Implement in subclass');
        }
	
        /**
         * @abstract
         * @param {Node} node
         * @returns {T}
         */
        visitProductions(node){
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
        visitExpression(node){
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
