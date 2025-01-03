{{
    import { ids, usos} from '../../index.js'
    import { ErrorReglas } from './error.js';
    import { errores } from '../../index.js'
    import * as n from '../visitor/CST.js';
}}
  
gramatica
  = _  code:globalCode? prods:regla+ _ {
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
    return new n.Grammar(prods, code);
  }

globalCode
  = "{" _ before:$(. !"contains")* [ \t\n\r]* "contains" [ \t\n\r]* after:$[^}]* "}"{
    return after ? {before, after} : {before}
  }

regla
  = _ id:identificador _ alias:(literales)? _ "=" _ expr:opciones (_ ";")? {
    ids.push(id);
    expr.type = "main";
    return new n.Regla(id, expr, alias);
  }

opciones
  = expr:union rest:(_ "/" _ @union)* {
    return new n.Options([expr, ...rest]);
  }

union
  = expr:parsingExpression rest:(_ @parsingExpression !(_ literales? _ "=") )* action:(_ @predicate)? {
    const exprs = [expr, ...rest];
    const labeledExprs = exprs  
        .filter((expr) => expr instanceof n.Pluck)
        .filter((expr) => expr.labeledExpr.label);
    if (labeledExprs.length > 0) {
        action.params = labeledExprs.reduce((args, labeled) => {
            const expr = labeled.labeledExpr.annotatedExpr.expr;
            args[labeled.labeledExpr.label] =
                expr instanceof n.Identifier ? expr.id : '';
            return args;
        }, {});
    }
    return new n.Union(exprs, action);
  }

parsingExpression
  = pluck 
  / "!" assertion:(match){
    return new n.NegAssertion(assertion);
  }
  / "&" assertion:(match){
    return new n.Assertion(assertion);
  }
  / "!." {
    return new n.End();
  }


pluck
  = pluck:"@"? _ expr:label {
   
    return new n.Pluck(expr, pluck ? true : false);
  }

label 
  = label:(@identificador _ ":")? _ expr:annotated {
 
    return new n.Label(expr, label);
  }

annotated
  = text:"$"? _ expr:match _ qty:([?+*]/conteo)? {
    console.log(qty, 'qty')
    return new n.Annotated(expr, qty, text ? true : false);
  }

match
  = id:identificador {
    usos.push(id);
    return new n.Identifier(id);
  }
  / val:$literales isCase:"i"? {
    return new n.String(val.replace(/['"]/g, ''), isCase ? true : false);
  }
  / "(" _ opt:opciones _ ")" {
    opt.type = "group";
    return new n.Group(opt.exprs)
  }
  / exprs:clase isCase:"i"?{
    return new n.Clase(exprs, isCase ? true : false);
  }
  / "." {
    return new n.Dot();
  }
  

conteo = "|" _ qty:(numero / identificador / predicate) _ "|" {
    if(! qty instanceof n.Predicate){
      return text()
    }else{
      console.log(qty, 'enter here')
      return qty
    }
  }
        / "|" _ (numero / id:identificador)? _ ".." _ (numero / id2:identificador)? _ "|"
        / "|" _ (numero / id:identificador)? _ "," _ opciones _ "|"
        / "|" _ (numero / id:identificador)? _ ".." _ (numero / id2:identificador)? _ "," _ opciones _ "|"

predicate
  = _ symbol:("&"/"!")? _"{" [ \t\n\r]* returnType:predicateReturnType code:$[^}]*  "}" {
    return new n.Predicate(returnType, code, symbol, {})
  }

predicateReturnType
  = t:$(. !"::")+ [ \t\n\r]* "::" [ \t\n\r]* "res"{
    return t.trim();
  }

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

numero = [0-9]+

identificador = [_a-z]i[_a-z0-9]i* { return text() }


_ = (Comentarios /[ \t\n\r])*


Comentarios = 
    "//" [^\n]* 
    / "/*" (!"*/" .)* "*/"

