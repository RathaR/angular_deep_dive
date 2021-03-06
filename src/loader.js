/* jshint globalstrict: true */
'use strict';

function setupModuleLoader(window) {

    var ensure = function (obj, name, factory) {
        return obj[name] || (obj[name] = factory());
    };
    var createModule = function (name, requires, modules, configFn) {
        if (name === 'hasOwnProperty') {
            throw 'hasOwnProperty is not a valid module name';
        }

        var invokeQueue = [];
        var configBlocks = [];

        var invokeLater = function (service, method, arrayMethod, queue) {
            return function () {
                queue = queue || invokeQueue;
                queue[arrayMethod || 'push']([service, method, arguments]);
                return moduleInstance;
            }
        };
        var moduleInstance = {
            name: name,
            requires: requires,
            _runBlocks: [],
            _invokeQueue: invokeQueue,
            _configBlocks: configBlocks,
            constant: invokeLater('$provide', 'constant', 'unshift'),
            provider: invokeLater('$provide', 'provider'),
            config: invokeLater('$injector', 'invoke', 'push', configBlocks),
            factory: invokeLater('$provide', 'factory'),
            value: invokeLater('$provide', 'value'),
            service: invokeLater('$provide', 'service'),
            directive: invokeLater('$compileProvider', 'directive'),
            run: function (fn) {
                moduleInstance._runBlocks.push(fn);
                return moduleInstance;
            }
        };
        modules[name] = moduleInstance;

        if (configFn) {
            moduleInstance.config(configFn);
        }
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
        return function (name, requires, configFn) {
            if (requires) {
                return createModule(name, requires, modules, configFn);
            } else {
                return getModule(name, modules);
            }
        };
    });
}