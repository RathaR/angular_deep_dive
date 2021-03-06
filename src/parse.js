/* jshint globalstrict: true */
'use strict';
var ESCAPES = {'n': '\n', 'f': '\f', 'r': '\r', 't': '\t', 'v': '\v', '\'': '\'', '"': '"'};

var CONSTANTS = {
    'null': _.constant(null),
    'true': _.constant(true),
    'false': _.constant(false)
};

_.forEach(CONSTANTS, function (fn, constantName) {
    fn.constant = fn.literal = fn.sharedGetter = true;
});


///TODO add and extend Parser.Zero, p 305

var getterFn = _.memoize(function (ident) {
    var pathKeys = ident.split('.');
    var fn;
    if (pathKeys.length === 1) {
        fn = simpleGetterFn1(pathKeys[0]);
    } else if (pathKeys.length === 2) {
        fn = simpleGetterFn2(pathKeys[0], pathKeys[1]);
    } else {
        fn = generatedGetterFn(pathKeys);
    }
    fn.sharedGetter = true;
    return fn;
});

var generatedGetterFn = function (keys) {
    var code = '';
    _.forEach(keys, function (key, idx) {
        code += 'if(!scope) { return undefined; }\n';
        if (idx === 0) {
            code += 'scope =(locals && locals.hasOwnProperty("' + key + '")) ? ' +
            'locals["' + key + '"] : ' +
            'scope["' + key + '"];\n';
        } else {
            code += 'scope = scope["' + key + '"];\n';
        }
    });
    code += 'return scope;\n';
    /* jshint -W054 */
    return new Function('scope', 'locals', code);
    /* jshint +W054 */
};

var simpleGetterFn1 = function (key) {
    return function (scope, locals) {
        if (!scope) {
            return undefined;
        }
        return (locals && locals.hasOwnProperty(key)) ? locals[key] : scope[key];
    };
};

var simpleGetterFn2 = function (key1, key2) {
    return function (scope, locals) {
        if (!scope) {
            return undefined;
        }
        scope = (locals && locals.hasOwnProperty(key1)) ?
            locals[key1] :
            scope[key1];
        return scope ? scope[key2] : undefined;
    }
};

function constantWatchDelegate(scope, listenerFn, valueEq, watchFn) {

    var unwatch = scope.$watch(
        function () {
            return watchFn(scope);
        },
        function (newValue, oldValue, scope) {
            if (_.isFunction(listenerFn)) {
                listenerFn.apply(this, arguments);
            }
            unwatch();
        },
        valueEq
    );
    return unwatch;
}

function oneTimeWatchDelegate(scope, listenerFn, valueEq, watchFn) {

    var lastValue;
    var unwatch = scope.$watch(
        function () {
            return watchFn(scope);
        },
        function (newValue, oldValue, scope) {
            lastValue = newValue;
            if (_.isFunction(listenerFn)) {
                listenerFn.apply(this, arguments);
            }
            if (!_.isUndefined(newValue)) {
                scope.$$postDigest(function () {
                    if (!_.isUndefined(lastValue)) {
                        unwatch();
                    }
                });
            }
        },
        valueEq
    );
    return unwatch;
}

function oneTimeLiteralWatchDelegate(scope, listenerFn, valueEq, watchFn) {

    function isAllDefined(val) {
        return !_.any(val, _.isUndefined);
    }

    var unwatch = scope.$watch(
        function () {
            return watchFn(scope);
        },
        function (newValue, oldValue, scope) {
            if (_.isFunction(listenerFn)) {
                listenerFn.apply(this, arguments);
            }
            if (isAllDefined(newValue)) {
                scope.$$postDigest(function () {
                    if (isAllDefined(newValue)) {
                        unwatch();
                    }
                });
            }
        },
        valueEq
    );
    return unwatch;
}


function wrapSharedExpression(exprFn) {
    var wrapped = exprFn;
    if (wrapped.sharedGetter) {
        wrapped = function (self, locals) {
            return exprFn(self, locals);
        };
        wrapped.constant = exprFn.constant;
        wrapped.literal = exprFn.literal;
        wrapped.assign = exprFn.assign;
    }
    return wrapped;
}

function Parser(lexer) {
    this.lexer = lexer;
}

Parser.prototype.parse = function (text) {
    this.tokens = this.lexer.lex(text);
    return this.primary();
};

Parser.prototype.primary = function () {
    var primary;
    if (this.expect('[')) {
        primary = this.arrayDeclaration();
    } else if (this.expect('{')) {
        primary = this.object();
    } else {
        var token = this.expect();
        primary = token.fn;
        if (token.constant) {
            primary.constant = true;
            primary.literal = true;
        }
    }
    var next;
    while (next = this.expect('[', '.', '(')) {
        if (next.text === '[') {
            primary = this.objectIndex(primary);
        } else if (next.text === '.') {
            primary = this.fieldAccess(primary);
        } else if (next.text === '(') {
            primary = this.functionCall(primary);
        }
    }
    return primary;
};

Parser.prototype.functionCall = function (fnFn) {
    var argsFn = [];
    if (!this.peek(')')) {
        do {
            argsFn.push(this.primary())
        } while (this.expect(','))
    }
    this.consume(')');

    return function (scope, locals) {
        var fn = fnFn(scope, locals);
        var args = _.map(argsFn, function (argFn) {
            return argFn(scope, locals);
        });
        return fn.apply(null, args);
    };
};

Parser.prototype.objectIndex = function (objFn) {
    var indexFn = this.primary();
    this.consume(']');
    return function (scope, locals) {
        var obj = objFn(scope, locals);
        var index = indexFn(scope, locals);
        return obj[index];
    };
};

Parser.prototype.expect = function (e) {
    if (this.tokens.length > 0) {
        if (this.tokens[0].text === e || !e) {
            return this.tokens.shift();
        }
    }
};

Parser.prototype.arrayDeclaration = function () {
    var elementsFns = [];
    if (!this.peek(']')) {
        do {
            if (this.peek(']')) {
                break;
            }
            elementsFns.push(this.primary());
        } while (this.expect(','));
    }
    this.consume(']');
    var arrayFn = function () {
        return _.map(elementsFns, function (elementFn) {
            return elementFn();
        });
    };
    arrayFn.literal = true;
    arrayFn.constant  =_.every(elementsFns, 'constant');
    return arrayFn;
};

Parser.prototype.object = function () {
    var keyValues = [];
    if (!this.peek('}')) {
        do {
            var keyToken = this.expect();
            this.consume(':');
            var valueExpression = this.primary();
            keyValues.push({
                key: keyToken.string || keyToken.text,
                value: valueExpression
            });
        } while (this.expect(','));
    }
    this.consume('}');
    var objectFn = function () {
        var object = {};
        _.forEach(keyValues, function (kv) {
            object[kv.key] = kv.value();
        });
        return object;
    };
    objectFn.literal = true;
    objectFn.constant = true;
    return objectFn;
};

Parser.prototype.peek = function (e1, e2, e3, e4) {
    if (this.tokens.length > 0) {
        var text = this.tokens[0].text;
        if (text === e1 || text === e2 || text === e3 || text === e4 || (!e1 && !e2 && !e3 && !e4)) {
            return this.tokens[0];
        }
    }
};

Parser.prototype.consume = function (e) {
    if (!this.expect(e)) {
        throw 'Unexpected. Expecting ' + e;
    }
};

Parser.prototype.fieldAccess = function (objFn) {
    var getter = this.expect().fn;
    return function (scope, locals) {
        var obj = objFn(scope, locals);
        return getter(obj);
    };
};

Parser.prototype.expect = function (e1, e2, e3, e4) {
    var token = this.peek(e1, e2, e3, e4);
    if (token) {
        return this.tokens.shift();
    }
};

function Lexer() {

}

Lexer.prototype.lex = function (text) {
    this.text = text;
    this.index = 0;
    this.ch = undefined;
    this.tokens = [];

    while (this.index < this.text.length) {
        this.ch = this.text.charAt(this.index);

        if (this.isNumber(this.ch) || ((this.is('.') && this.isNumber(this.peek())))) {
            this.readNumber();
        } else if (this.is('\'"')) {
            this.readString(this.ch);
        } else if (this.is('[],{}:.()')) {
            this.tokens.push({
                text: this.ch
            });
            this.index++;
        } else if (this.isIdent(this.ch)) {
            this.readIdent();
        } else if (this.isWhitespace(this.ch)) {
            this.index++;
        } else {
            throw 'Unexpected next character ' + this.ch;
        }
    }
    return this.tokens;
};

Lexer.prototype.is = function (chs) {
    return chs.indexOf(this.ch) >= 0;
};

Lexer.prototype.isNumber = function (ch) {
    return '0' <= ch && ch <= '9';
};

Lexer.prototype.isIdent = function (ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
};

Lexer.prototype.isWhitespace = function (ch) {
    return (ch === ' ' || ch === '\r' || ch === '\t' || ch === '\n' || ch === '\v' || ch === '\u00A0');
};

Lexer.prototype.peek = function () {
    return this.index < this.text.length - 1 ?
        this.text.charAt(this.index + 1) :
        false;
};

Lexer.prototype.isExpOperator = function (ch) {
    return ch === '-' || ch === '+' || this.isNumber(ch);
};

Lexer.prototype.readNumber = function () {
    var number = '';
    while (this.index < this.text.length) {
        var ch = this.text.charAt(this.index).toLowerCase();
        if (ch === '.' || this.isNumber(ch)) {
            number += ch;
        } else {
            var nextCh = this.peek();
            var prevCh = number.charAt(number.length - 1);
            if (ch === 'e' && this.isExpOperator(nextCh)) {
                number += ch;
            } else if (this.isExpOperator(ch) && prevCh === 'e' && nextCh && this.isNumber(nextCh)) {
                number += ch;
            } else if (this.isExpOperator(ch) && prevCh === 'e' && (!nextCh || !this.isNumber(nextCh))) {
                throw 'Invalid exponent';
            } else {
                break;
            }
        }
        this.index++;
    }
    number = 1 * number;
    this.tokens.push({
        text: number,
        fn: _.constant(number),
        constant: true
    });
};

Lexer.prototype.readString = function (quote) {
    this.index++;
    var rawString = quote;
    var string = '';
    var escape = false;
    while (this.index < this.text.length) {
        var ch = this.text.charAt(this.index);
        rawString += ch;
        if (escape) {
            if (ch === 'u') {
                var hex = this.text.substring(this.index + 1, this.index + 5);
                if (!hex.match(/[\d\a-f]{4}/i)) {
                    throw 'invalid unicode escape';
                }
                rawString += hex;
                this.index += 4;
                string += String.fromCharCode(parseInt(hex, 16));
            } else {
                var replacement = ESCAPES[ch];
                if (replacement) {
                    string += replacement;
                } else {
                    string += ch;
                }
            }

            escape = false;
        } else if (ch === quote) {
            this.index++;
            this.tokens.push({
                fn: _.constant(string),
                constant: true,
                string: string,
                text: rawString
            });
            return;
        } else if (ch === '\\') {
            escape = true;
        } else {
            string += ch;
        }
        this.index++;
    }
    throw 'Unmatched quote';
};

Lexer.prototype.readIdent = function () {
    var text = '';
    while (this.index < this.text.length) {
        var ch = this.text.charAt(this.index);
        if (ch === '.' || this.isIdent(ch) || this.isNumber(ch)) {
            text += ch;
        } else {
            break;
        }
        this.index++;
    }
    var token = {
        text: text,
        fn: CONSTANTS[text] || getterFn(text)
    };
    this.tokens.push(token);
};

function $ParseProvider() {
    this.$get = function() {
        return function(expr) {
            switch (typeof expr) {
                case 'string' :
                    var lexer = new Lexer();
                    var parser = new Parser(lexer);

                    var oneTime = false;
                    if (expr.charAt(0) === ':' && expr.charAt(1) === ':') {
                        oneTime = true;
                        expr = expr.substring(2);
                    }
                    var parseFn = parser.parse(expr);

                    if (parseFn.constant) {
                        parseFn.$$watchDelegate = constantWatchDelegate;
                    } else if (oneTime) {
                        parseFn = wrapSharedExpression(parseFn);
                        parseFn.$$watchDelegate = parseFn.literal ? oneTimeLiteralWatchDelegate : oneTimeWatchDelegate;
                    }

                    return parseFn;
                case 'function':
                    return expr;
                default :
                    return _.noop;
            }
        }
    }
}

