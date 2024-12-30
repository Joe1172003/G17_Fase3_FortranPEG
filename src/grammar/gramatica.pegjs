{{
    import { ids, usos} from '../../index.js'
    import { ErrorReglas } from './error.js';
    import { errores } from '../../index.js'
    import * as n from '../visitor/CST.js';
}}

gramatica
  = _  block:block_code? prods:producciones+ _ {
    let duplicados = ids.filter((item, index) => ids.indexOf(item) !== index);
    if (duplicados.length > 0) {
        errores.push(new ErrorReglas("Regla duplicada: " + duplicados[0]));
    }

    // Validar que todos los usos están en ids
    let noEncontrados = usos.filter(item => !ids.includes(item));
    if (noEncontrados.length > 0) {
        errores.push(new ErrorReglas("Regla no encontrada: " + noEncontrados[0]));
    }
    
    prods[0].start = true;
    if(block){
      prods.push(block)
    }

    return prods;
  }


block_code 
          = "\{" codeBlock:([^}]*) "\}" {return new n.Block(codeBlock.join('')) }

producciones
  = _ id:identificador _ alias:$(literales)? _ "=" _ expr:opciones (_";")? {
    ids.push(id);
    return new n.Productions(id, expr, alias);
  }

opciones
  = expr:union rest:(_ "/" _ @union)* {
    return new n.Options([expr, ...rest]);
  }

union
  = expr:expresion rest:(_ @expresion !(_ literales? _ "=") )* {
    return new n.Union([expr, ...rest]);
  }

expresion
  = label:$(etiqueta/varios)? _ expr:expresiones _ qty:$([?+*]/conteo)? {
    console.log(qty)
    return new n.Expression(expr, label, qty);
  }

etiqueta = ("@")? _ id:identificador _ ":" (varios)?

varios = ("!"(!".") /"$"/"@"/"&")

expresiones
  = id:identificador {
    usos.push(id);
    return new n.Identifier(id);
  }
  / val:$literales isCase:"i"? {
    return new n.String(val.replace(/['"]/g, ''), isCase);
  }
  / "(" _ opciones:opciones _ ")"
  / exprs:clase isCase:"i"?{
    return new n.Clase(exprs, isCase);

  }
  / "." {
    return new n.Dot(true);
  }
  / "!."{
    return new n.End();
  }

// conteo = "|" parteconteo _ (_ delimitador )? _ "|"

conteo = "|" _ qty:(numero / identificador) _ "|" {console.log(qty); return text()}
        / "|" _ (numero / id:identificador)? _ ".." _ (numero / id2:identificador)? _ "|"
        / "|" _ (numero / id:identificador)? _ "," _ opciones _ "|"
        / "|" _ (numero / id:identificador)? _ ".." _ (numero / id2:identificador)? _ "," _ opciones _ "|"

// parteconteo = identificador
//             / [0-9]? _ ".." _ [0-9]?
// 			/ [0-9]

// delimitador =  "," _ expresion

// Regla principal que analiza corchetes con contenido
clase
  = "[" @contenidoClase+ "]"

contenidoClase
  = bottom:$caracter "-" top:$caracter {
    return new n.Range(bottom, top);
  }
  / $caracter

caracter
  = [^\[\]\\]
  / "\\" .

literales
  = '"' @stringDobleComilla* '"'
  / "'" @stringSimpleComilla* "'"

stringDobleComilla = !('"' / "\\" / finLinea) .
                    / "\\" escape
                    / continuacionLinea

stringSimpleComilla = !("'" / "\\" / finLinea) .
                    / "\\" escape
                    / continuacionLinea

continuacionLinea = "\\" secuenciaFinLinea

finLinea = [\n\r\u2028\u2029]

escape = "'"
        / '"'
        / "\\"
        / "b"
        / "f"
        / "n"
        / "r"
        / "t"
        / "v"
        / "u"

secuenciaFinLinea = "\r\n" / "\n" / "\r" / "\u2028" / "\u2029"

// literales = 
//     "\"" [^"]* "\""
//     / "'" [^']* "'"
    

numero = [0-9]+

identificador = [_a-z]i[_a-z0-9]i* { return text() }


_ = (Comentarios /[ \t\n\r])*


Comentarios = 
    "//" [^\n]* 
    / "/*" (!"*/" .)* "*/"

