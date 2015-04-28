/* jshint globalstrict: true */
'use strict';

function setupModuleLoader(window) {

    var ensure = function (obj, name, factory) {
        return obj[name] || (obj[name] = factory());
    };
    var createModule = function (name, requires, modules) {
        if (name === 'hasOwnProperty') {
            throw 'hasOwnProperty is not a valid module name';
        }

        var invokeQueue = [];
        var moduleInstance = {
            name: name,
            requires: requires,
            _invokeQueue: invokeQueue,
            constant: function (key, value) {
                invokeQueue.push(['constant', [key, value]]);
            }
        };
        modules[name] = moduleInstance;
        return moduleInstance;
    };
    var getModule = function (name, modules) {
        if (modules.hasOwnProperty(name)) {
            return modules[name]
        } else {
            throw 'Module ' + name + ' is not available!';
        }
    };

    var angular = ensure(window, 'angular', Object);
    ensure(angular, 'module', function () {
        var modules = {};
        return function (name, requires) {
            if (requires) {
                return createModule(name, requires, modules);
            } else {
                return getModule(name, modules);
            }
        };
    });
}