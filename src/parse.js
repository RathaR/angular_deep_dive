/* jshint globalstrict: true */
'use strict';
function Parser(lexer) {
    this.lexer = lexer;
}

Parser.prototype.parse = function (text) {
    this.tokens = this.lexer.lex(text);
};

function Lexer() {

}

Lexer.prototype.lex = function (text) {

};

function parse(expr) {
    var lexer = new Lexer();
    var parser = new Parser(lexer);
    return parser.parse(expr);
}