/* jshint globalstrictL true */

'use strict';

function nodeName(element) {
    return element.nodeName ? element.nodeName : element[0].nodeName
}

function $CompileProvider($provide) {

    var hasDirectives = {};
    ///TODO check 'this' issue
    var that = this;
    this.directive = function (name, directiveFactory) {
        if (_.isString(name)) {
            if (name === 'hasOwnProperty') {
                throw 'hasOwnProperty is not a valid directive name';
            }
            if (!hasDirectives.hasOwnProperty(name)) {
                hasDirectives[name] = [];
                $provide.factory(name + 'Directive', ['$injector', function ($injector) {
                    var factories = hasDirectives[name];
                    return _.map(factories, $injector.invoke);
                }]);
            }
            hasDirectives[name].push(directiveFactory);
        } else {
            _.forEach(name, function (directiveFactory, name) {
                this.directive(name, directiveFactory);
            }, that);
        }
    };

    this.$get = ['$injector', function ($injector) {

        function addDirective(directives, name) {
            if (hasDirectives.hasOwnProperty(name)) {
                directives.push.apply(directives, $injector.get(name + 'Directive'));
            }
        }

        function collectDirectives(node) {
            var directives = [];
            var normalizedNodeName = _.camelCase(nodeName(node).toLowerCase());
            addDirective(directives, normalizedNodeName);
            return directives;
        }

        function applyDirectivesToNode(directives, compileNode) {
            var $compileNode = $(compileNode);
            _.forEach(directives, function (directive) {
                if (directive.compile) {
                    directive.compile($compileNode);
                }
            });
        }

        function compileNodes($compileNodes) {
            _.forEach($compileNodes, function (node) {
                var directives = collectDirectives(node);
                applyDirectivesToNode(directives, node);
            });
        }

        function compile($compileNodes) {
            return compileNodes($compileNodes);
        }

        return compile;
    }];
}

$CompileProvider.$inject = ['$provide'];