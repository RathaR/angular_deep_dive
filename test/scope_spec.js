/* jshint globalstrict: true */
/* global Scope: true */
'use strict';
describe('Scope', function () {

    describe('digest', function () {
        var scope;
        beforeEach(function () {
            publishExternalAPI();
            scope = createInjector(['ng']).get('$rootScope');
        });

        it('calls the listener function of a watch on first $digest', function () {
            var watchFn = function () {
                return 'wat';
            };
            var listenerFn = jasmine.createSpy();
            scope.$watch(watchFn, listenerFn);
            scope.$digest();
            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls the watch function with the scope as the argument', function () {
            var watchFn = jasmine.createSpy();
            var listenerFn = function () {
            };
            scope.$watch(watchFn, listenerFn);
            scope.$digest();
            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it('calls the listener function when the watched value changes', function () {
            scope.someValue = 'a';
            scope.counter = 0;
            scope.$watch(
                function (scope) {
                    return scope.someValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.someValue = 'b';
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('calls listener when values is first undefined', function () {
            scope.counter = 0;
            scope.$watch(
                function (scope) {
                    return scope.someValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('calls listener with new value as old value the first time', function () {
            scope.someValue = 123;
            var oldValueGiven;
            scope.$watch(
                function (scope) {
                    return scope.someValue;
                },
                function (newValue, oldValue, scope) {
                    oldValueGiven = oldValue;
                });
            scope.$digest();
            expect(oldValueGiven).toBe(123);
        });

        it('may have watcher that omit the listener function', function () {
            var watchFn = jasmine.createSpy().and.returnValue('something');
            scope.$watch(watchFn);
            scope.$digest();
            expect(watchFn).toHaveBeenCalled();
        });

        it('triggers chained watchers on the same digest', function () {
            scope.name = 'Jane';
            scope.$watch(
                function (scope) {
                    return scope.nameUpper;
                },
                function (newValue, oldValue, scope) {
                    if (newValue) {
                        scope.initial = newValue.substring(0, 1) + '.';
                    }
                }
            );
            scope.$watch(
                function (scope) {
                    return scope.name;
                },
                function (newValue, oldValue, scope) {
                    if (newValue) {
                        scope.nameUpper = newValue.toUpperCase();
                    }
                }
            );
            scope.$digest();
            expect(scope.initial).toBe('J.');
            scope.name = 'Bob';
            scope.$digest();
            expect(scope.initial).toBe('B.');
        });

        it('gives up on the watches after 10 iterations', function () {
            scope.counterA = 0;
            scope.counterB = 0;
            scope.$watch(
                function (scope) {
                    return scope.counterA;
                },
                function (newValue, oldValue, scope) {
                    scope.counterB++;
                }
            );
            scope.$watch(
                function (scope) {
                    return scope.counterB;
                },
                function (newValue, oldValue, scope) {
                    scope.counterA++;
                }
            );
            expect((function () {
                scope.$digest();
            })).toThrow();
        });

        it('ends the digest when the last watch is clean', function () {
            scope.array = _.range(100);
            var watchExecutions = 0;
            _.times(100, function (i) {
                scope.$watch(function (scope) {
                    watchExecutions++;
                    return scope.array[i];
                }, function (newValue, oldValue, scope) {
                });
            });
            scope.$digest();
            expect(watchExecutions).toBe(200);
            scope.array[0] = 420;
            scope.$digest();
            expect(watchExecutions).toBe(301);
        });

        it('does not end digest so that new watches are not run', function () {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.$watch(
                        function (scope) {
                            return scope.aValue;
                        },
                        function (newValue, oldValue, scope) {
                            scope.counter++;
                        }
                    )
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('compares based on value if enabled', function () {
            scope.aValue = [1, 2, 3];
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                },
                true
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.aValue.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('correctly handles NaNs', function () {
            scope.number = 0 / 0;
            scope.counter = 0;
            scope.$watch(
                function (scope) {
                    return scope.number;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('executes $eval\'ed function and returns result', function () {
            scope.aValue = 42;
            var result = scope.$eval(function (scope) {
                return scope.aValue;
            });
            expect(result).toBe(42);
        });

        it('passed the second $eval argument straight through', function () {
            scope.aValue = 42;
            var result = scope.$eval(function (scope, arg) {
                return scope.aValue + arg;
            }, 2);
            expect(result).toBe(44);
        });

        it('executes $apply\'ed function and starts the digest', function () {
            scope.aValue = 'someValue';
            scope.counter = 0;
            scope.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$apply(function (scope) {
                scope.aValue = 'someOtherValue';
            });
        });

        it('executes $evalAsynced function later in the same cycle', function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedImmediately = false;
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.$evalAsync(function (scope) {
                        scope.asyncEvaluated = true;
                    });
                    scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
                });
            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediately).toBe(false);
        });

        it('executes $evalAsynced functions added by watch functions', function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.$watch(
                function (scope) {
                    if (!scope.asyncEvaluated) {
                        scope.$evalAsync(function () {
                            scope.asyncEvaluated = true;
                        });
                    }
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {

                });
            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
        });

        it('executes $evalAsynced functions even when not dirty', function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluatedTimes = 0;
            scope.$watch(function (scope) {
                if (scope.asyncEvaluatedTimes < 2) {
                    scope.$evalAsync(function (scope) {
                        scope.asyncEvaluatedTimes++;
                    })
                }
                return scope.aValue;
            }, function (newValue, oldValue, scope) {

            });
            scope.$digest();
            expect(scope.asyncEvaluatedTimes).toBe(2);
        });

        it('eventually halts $evalAsync added by watches', function () {
            scope.aValue = [1, 2, 3];
            scope.$watch(
                function (scope) {
                    scope.$evalAsync(
                        function (scope) {

                        });
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {

                }
            );

            expect(function () {
                scope.$digest();
            }).toThrow();
        });

        it('has a $$phase field whose value is the current digest phase', function () {
            scope.aValue = [1, 2, 3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenFunction = undefined;
            scope.phaseInApplyFunction = undefined;

            scope.$watch(function (scope) {
                scope.phaseInWatchFunction = scope.$$phase;
            }, function (newValue, oldValue, scope) {
                scope.phaseInListenFunction = scope.$$phase;
            });
            scope.$apply(function (scope) {
                scope.phaseInApplyFunction = scope.$$phase;
            });

            expect(scope.phaseInApplyFunction).toBe('$apply');
            expect(scope.phaseInListenFunction).toBe('$digest');
            expect(scope.phaseInWatchFunction).toBe('$digest');
        });

        it('schedules a digest in $evalAsync', function (done) {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                });
            scope.$evalAsync(function () {
            });

            expect(scope.counter).toBe(0);
            setTimeout(function () {
                expect(scope.counter).toBe(1);
                done();
            }, 50);
        });

        it('allows async $apply with $applyAsync', function (done) {
            scope.counter = 0;
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            expect(scope.counter).toBe(1);
            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('never executes $applyAsynced in the same cycle', function (done) {
            scope.aValue = [1, 2, 3];
            scope.asyncApplied = false;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.$applyAsync(function (scope) {
                        scope.asyncApplied = true;
                    });
                });

            scope.$digest();
            expect(scope.asyncApplied).toBe(false);
            setTimeout(function () {
                expect(scope.asyncApplied).toBe(true);
                done();
            }, 50);
        });

        it('coalesces many calls to $applyAsync', function (done) {
            scope.counter = 0;

            scope.$watch(function (scope) {
                    scope.counter++;
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {

                });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'def';
            });
            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('cancels and flushes $aplyAsync if digest first', function (done) {
            scope.counter = 0;

            scope.$watch(function (scope) {
                    scope.counter++;
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {

                });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'def';
            });

            scope.$digest();
            expect(scope.counter).toBe(2);
            expect(scope.aValue).toBe('def');
            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('runs $$postDigest after each digest', function () {
            scope.counter = 0;
            scope.$$postDigest(function () {
                scope.counter++;
            });

            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('does not include $$postDigest in the digest', function () {
            scope.aValue = 'original';
            scope.$$postDigest(function () {
                scope.aValue = 'changed';
            });
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.watchedValue = newValue;
                }
            );

            scope.$digest();
            expect(scope.watchedValue).toBe('original');
            scope.$digest();
            expect(scope.watchedValue).toBe('changed');
        });

        it('catches exceptions in watch functions and continues', function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    throw 'error'
                },
                function (newValue, oldValue, scope) {
                }
            );
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('catches exceptions in listener functions and continues', function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    throw 'Error';
                });
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                });
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('catches exceptions in $evalAsync', function (done) {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$evalAsync(function (scope) {
                throw 'Error';
            });

            setTimeout(function () {
                expect(scope.counter).toBe(1);
                done();
            }, 50);
        });

        it('catches exceptions in $applyAsync', function (done) {

            scope.$applyAsync(function (scope) {
                throw 'Error';
            });
            scope.$applyAsync(function (scope) {
                throw 'Error';
            });
            scope.$applyAsync(function (scope) {
                scope.applied = true;
            });

            setTimeout(function () {
                expect(scope.applied).toBe(true);
                done();
            }, 50);
        });

        it('catches exceptions in $$postDigest', function () {
            var didRun = false;

            scope.$$postDigest(function () {
                didRun = true;
            });
            scope.$digest();
            expect(didRun).toBe(true);
        });

        it('allows destroying a $watch with a removal function', function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            var destroyWatch = scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                });
            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.aValue = 'ghi';
            destroyWatch();
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('allows destroying a $watch during digest', function () {
            scope.aValue = 'abc';
            var watchCalls = [];

            scope.$watch(function (scope) {
                watchCalls.push('1');
                return scope.aValue;
            });
            var destroyWatch = scope.$watch(
                function (scope) {
                    watchCalls.push('2');
                    destroyWatch();
                });

            scope.$watch(function (scope) {
                watchCalls.push('3');
                return scope.aValue;
            });
            scope.$digest();
            expect(watchCalls).toEqual(['1', '2', '3', '1', '3']);
        });

        it('allows a $watch to destroy another during $digest', function () {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    destroyWatch();
                });
            var destroyWatch = scope.$watch(
                function (scope) {

                },
                function (newValue, oldValue, scope) {

                });
            scope.$watch(function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                });
            scope.$digest();
            expect(scope.counter).toBe(1);

        });

        it('allow destroying several watchers during digest', function () {
            scope.aValue = 'abc';
            scope.counter = 0;
            var destroyWatch1 = scope.$watch(function (scope) {
                destroyWatch1();
                destroyWatch2();
            });
            var destroyWatch2 = scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(0);
        });

        it('accepts expressions for watch functions', function () {
            var theValue;

            scope.aValue = 42;
            scope.$watch('aValue', function (newValue, oldValue, scope) {
                theValue = newValue;
            });
            scope.$digest();

            expect(theValue).toBe(42);
        });

        it('accepts expressions in $eval', function () {
            expect(scope.$eval('42')).toBe(42);
        });

        it('accepts expressions in $apply', function () {
            scope.aFunction = _.constant(42);
            expect(scope.$apply('aFunction()')).toBe(42);
        });

        it('accepts expressions in $evalAsync', function (done) {
            var called;
            scope.aFunction = function () {
                called = true;
            };
            scope.$evalAsync('aFunction()');
            scope.$$postDigest(function () {
                expect(called).toBe(true);
                done();
            });
        });

        it('remove constant watches after first invocation', function () {
            scope.$watch('[1, 2, 3]', function () {
            });
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });

        it('accepts one-time watches', function () {
            var theValue;
            scope.aValue = 42;
            scope.$watch('::aValue', function (newValue, oldValue, scope) {
                theValue = newValue;
            });
            scope.$digest();

            expect(theValue).toBe(42);
        });

        it('removes one-time watches after first invocation', function () {
            scope.aValue = 42;
            scope.$watch('::aValue', function () {

            });
            scope.$digest();

            expect(scope.$$watchers.length).toBe(0);
        });

        it('does not contaminate other expressions with one-time watches', function () {
            scope.aValue = 42;
            scope.$watch('::aValue', function () {
            });
            scope.$watch('aValue', function () {
            });
            scope.$digest();
            expect(scope.$$watchers.length).toBe(1);
        });

        it('does not remove one-time watches until value is defined', function () {
            scope.$watch('::aValue', function () {
            });

            scope.$digest();
            expect(scope.$$watchers.length).toBe(1);

            scope.aValue = 42;
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });

        it('does not remove one-time watches until value stays defined', function () {
            scope.$watch('::aValue', function () {
            });
            var unwatcherDeleter = scope.$watch('aValue', function () {
                delete scope.aValue;
            });

            scope.$digest();
            expect(scope.$$watchers.length).toBe(2);

            scope.aValue = 42;
            unwatcherDeleter();
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });

        ///TODO resolve problem with array and object literals(constant property in parseFn
        xit('does not remove one-time watches before all array items defined', function () {
            scope.$watch('::[1, 2, aValue]', function () {
            });
            scope.$digest();
            expect(scope.$$watchers.length).toBe(1);

            scope.aValue = 3;
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });

        xit('does not remove one-time watches before all object value defined', function () {
            scope.$watch('::{a:1, b: aValue]', function () {
            });
            scope.$digest();
            expect(scope.$$watchers.length).toBe(1);

            scope.aValue = 3;
            scope.$digest();
            expect(scope.$$watchers.length).toBe(0);
        });

    });

    describe('$watchGroup', function () {

        var scope;
        beforeEach(function () {
            publishExternalAPI();
            scope = createInjector(['ng']).get('$rootScope');
        });

        it('takes watches as an array and calls listener with arrays', function () {
            var gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([
                    function (scope) {
                        return scope.aValue;
                    },
                    function (scope) {
                        return scope.anotherValue;
                    }],
                function (newValues, oldValues, scope) {
                    gotNewValues = newValues;
                    gotOldValues = oldValues;
                });
            scope.$digest();
            expect(gotNewValues).toEqual([1, 2]);
            expect(gotOldValues).toEqual([1, 2]);

        });

        it('only calls listener once per digest', function () {
            var counter = 0;
            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([
                    function (scope) {
                        return scope.aValue;
                    },
                    function (scope) {
                        return scope.anotherValue;
                    }
                ],
                function (newValues, oldValues, scope) {
                    counter++;
                });
            scope.$digest();

            expect(counter).toEqual(1);
        });

        it('use the same array of old and new values on first run', function () {
            var gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                },
                function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });
            scope.$digest();
            expect(gotNewValues).toBe(gotOldValues);
        });

        it('uses different arrays for old and new values on subsequent runs', function () {
            var gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([
                    function (scope) {
                        return scope.aValue;
                    },
                    function (scope) {
                        return scope.anotherValue;
                    }],
                function (newValues, oldValues, scope) {
                    gotNewValues = newValues;
                    gotOldValues = oldValues;
                });
            scope.$digest();

            scope.anotherValue = 3;
            scope.$digest();
            expect(gotNewValues).toEqual([1, 3]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        it('calls the listener once when the watch array is empty', function () {
            var gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([],
                function (newValues, oldValues, scope) {
                    gotNewValues = newValues;
                    gotOldValues = oldValues;
                });
            scope.$digest();
            expect(gotNewValues).toEqual([]);
            expect(gotOldValues).toEqual([]);
        });

        it('can be deregistered', function () {
            var counter = 0;

            scope.aValue = 1;
            scope.anotherValue = 2;

            var destroyGroup = scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                }, function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                counter++;
            });
            scope.$digest();

            scope.anotherValue = 3;
            destroyGroup();
            scope.$digest();

            expect(counter).toEqual(1);
        })

        it('does not call the zero-watch listener when deregistred first', function () {
            var counter = 0;
            var destroyGroup = scope.$watchGroup([], function (newValues, oldValues, scope) {
                counter++;
            });
            destroyGroup();
            scope.$digest();
            expect(counter).toEqual(0);
        });

    });

    describe('inheritance', function () {

        var parent;
        beforeEach(function () {
            publishExternalAPI();
            parent = createInjector(['ng']).get('$rootScope');
        });

        it('inherits the parents properties', function () {
            parent.aValue = [1, 2, 3];
            var child = parent.$new();
            expect(child.aValue).toEqual([1, 2, 3]);
        });

        it('does not cause a parent to inherit its properties', function () {
            var child = parent.$new();
            child.aValue = [1, 2, 3];
            expect(parent.aValue).toBeUndefined();
        });

        it('inherits the parents properties whenever they are defined', function () {
            var child = parent.$new();

            parent.aValue = [1, 2, 3];
            expect(child.aValue).toEqual([1, 2, 3]);
        });

        it('can manipulate a parent scopes property', function () {
            var child = parent.$new();

            parent.aValue = [1, 2, 3];
            child.aValue.push(4);

            expect(child.aValue).toEqual([1, 2, 3, 4]);
            expect(parent.aValue).toEqual([1, 2, 3, 4]);
        });

        it('can watch a property in the parent', function () {
            var child = parent.$new();
            parent.aValue = [1, 2, 3];
            child.counter = 0;

            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                },
                true
            );
            child.$digest();
            expect(child.counter).toBe(1);

            parent.aValue.push(4);
            child.$digest();
            expect(child.counter).toBe(2);
        });

        it('can be nested in any depth', function () {
            var a = parent;
            var aa = a.$new();
            var aaa = aa.$new();
            var aab = aa.$new();
            var ab = a.$new();
            var abb = ab.$new();

            a.value = 1;

            expect(aa.value).toBe(1);
            expect(aaa.value).toBe(1);
            expect(aab.value).toBe(1);
            expect(ab.value).toBe(1);
            expect(abb.value).toBe(1);

            ab.anotherValue = 2;

            expect(abb.anotherValue).toBe(2);
            expect(aa.anotherValue).toBeUndefined();
            expect(aaa.anotherValue).toBeUndefined();

        });

        it('shadows a parents property with the same name', function () {
            var child = parent.$new();

            parent.name = 'Joe';
            child.name = 'Jill';

            expect(child.name).toBe('Jill');
            expect(parent.name).toBe('Joe');
        });

        it('does not shadow member of parent scopes attributes', function () {
            var child = parent.$new();

            parent.user = {name: 'Joe'};
            child.user.name = 'Jill';

            expect(child.user.name).toBe('Jill');
            expect(parent.user.name).toBe('Jill');
        });

        it('does not digest its parents', function () {
            var child = parent.$new();
            parent.aValue = 'abc';

            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );
            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });

        it('keeps a record of its children', function () {
            var child1 = parent.$new();
            var child2 = parent.$new();
            var child2_1 = child2.$new();

            expect(parent.$$children.length).toBe(2);
            expect(parent.$$children[0]).toBe(child1);
            expect(parent.$$children[1]).toBe(child2);
            expect(child1.$$children.length).toBe(0);
            expect(child2.$$children.length).toBe(1);
            expect(child2.$$children[0]).toBe(child2_1);
        });

        it('digest its children', function () {
            var child = parent.$new();

            parent.aValue = 'abc';
            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );
            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        it('digest from root on apply', function () {
            var child = parent.$new();
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            child2.$apply(function (scope) {
            });

            expect(parent.counter).toBe(1);
        });

        it('schedules a digest from root on $evalAsync', function (done) {
            var child1 = parent.$new();
            var child2 = child1.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                });
            child2.$evalAsync(function (scope) {
            });
            setTimeout(function () {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });

        it('does not have access to parent attributes when isolated', function () {
            var child = parent.$new(true);

            parent.aValue = 'abc';
            expect(child.aValue).toBeUndefined();
        });

        it('can not watch parent attribute when isolated', function () {
            var child = parent.$new(true);

            parent.aValue = 'abc';
            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );
            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });

        xit('digest its isolated children', function () {
            var child = parent.$new(true);

            child.aValue = 'abc';
            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );
            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        it('digest from root on $apply when isolated', function () {
            var child1 = parent.$new(true);
            var child2 = child1.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            child2.$apply(function (scope) {
            });
            expect(parent.counter).toBe(1);
        });

        it('schedules a digest from root on $evalAsync when isolated', function (done) {
            var child = parent.$new(true);
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            child2.$evalAsync(function (scope) {
            });
            setTimeout(function () {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });

        it('executes $evalAsync functions on isolated scopes', function (done) {
            var child = parent.$new(true);

            child.$evalAsync(function (scope) {
                scope.didEvallAsync = true;
            });

            setTimeout(function () {
                expect(child.didEvallAsync).toBe(true);
                done();
            }, 50);
        });

        it('executes $$postDigest functions on isolated scopes', function () {
            var child = parent.$new(true);
            child.$$postDigest(function () {
                child.didPostDigest = true;
            });
            parent.$digest();

            expect(child.didPostDigest).toBe(true);
        });

        it('can take some other scope as the parent', function () {
            var prototypeParent = parent.$new();
            var hirerarchyParent = parent.$new();
            var child = prototypeParent.$new(false, hirerarchyParent);
            prototypeParent.a = 42;
            expect(child.a).toBe(42);

            child.counter = 0;
            child.$watch(function (scope) {
                scope.counter++;
            });

            prototypeParent.$digest();
            expect(child.counter).toBe(0);

            hirerarchyParent.$digest();
            expect(child.counter).toBe(2);
        });

        xit('is no longer digested when $destroy has been called', function () {
            var child = parent.$new();

            child.aValue = [1, 2, 3];
            child.counter = 0;
            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                },
                true
            );
            parent.$digest();
            expect(child.counter).toBe(1);

            child.aValue.push(4);
            parent.$digest();
            expect(child.counter).toBe(2);

            child.$destroy();
            child.aValue.push(5);
            parent.$digest();
            expect(child.counter).toBe(2);
        });

    });

    describe('$watchCollection', function () {
        var scope;
        beforeEach(function () {
            publishExternalAPI();
            scope = createInjector(['ng']).get('$rootScope');
        });

        it('works like a normal watch for non-collections', function () {
            var valueProvided;

            scope.aValue = 42;
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    valueProvided = newValue;
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            expect(valueProvided).toBe(scope.aValue);

            scope.aValue = 43;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);

        });

        it('works like a normal watch for NaNs', function () {
            scope.aValue = 0 / 0;
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('notices when the value becomes an array', function () {
            scope.counter = 0;
            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.arr = [1, 2, 3];

            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices when item added to an array', function () {
            scope.counter = 0;
            scope.arr = [1, 2, 3];

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices when item removed from an array', function () {
            scope.counter = 0;
            scope.arr = [1, 2, 3];

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.shift();
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('noticed an item replaced in array', function () {
            scope.arr = [1, 2, 3];
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr[1] = 42;
            scope.$digest();

            expect(scope.counter).toBe(2);
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('noticed items reordered in an array', function () {
            scope.arr = [2, 1, 3];
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.sort();
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('does not fail on Nans in arrays', function () {
            scope.arr = [2, NaN, 3];
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('notices an item replaced in an arguments object', function () {
            (function () {
                scope.arrayLike = arguments;
            })(1, 2, 3);
            scope.counter = 0;


            scope.$watchCollection(
                function (scope) {
                    return scope.arrayLike;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arrayLike[1] = 42;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item replaced in an NodeList object', function () {
            document.documentElement.appendChild(document.createElement('div'));
            scope.arrayLike = document.getElementsByTagName('div');
            scope.counter = 0;


            scope.$watchCollection(
                function (scope) {
                    return scope.arrayLike;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            document.documentElement.appendChild(document.createElement('div'));
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices when the value becomes an object', function () {
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.obj;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.obj = {a: 1};
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notice when an attribute is added to an object', function () {
            scope.counter = 0;
            scope.obj = {a: 1}

            scope.$watchCollection(
                function (scope) {
                    return scope.obj;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.obj.b = 2;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);

        });

        it('notice when an attribute is changed in an object', function () {
            scope.counter = 0;
            scope.obj = {a: 1}

            scope.$watchCollection(
                function (scope) {
                    return scope.obj;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.obj.a = 2;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);

        });

        it('does not fail on NaN attributes in object', function () {
            scope.counter = 0;
            scope.obj = {a: NaN};

            scope.$watchCollection(
                function (scope) {
                    return scope.obj;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('noticed when an attribute is removed from an object', function () {
            scope.counter = 0;
            scope.obj = {a: 1};

            scope.$watchCollection(
                function (scope) {
                    return scope.obj;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            delete scope.obj.a;

            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('does not consider any object with a length property an array', function () {
            scope.obj = {
                length: 42,
                otherKey: 'abc'
            };
            scope.counter = 0;
            scope.$watchCollection(
                function (scope) {
                    return scope.obj;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            scope.obj.newKey = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('gives the old non-collection value to listeners', function () {
            scope.aValue = 42;
            var oldValueGiven;
            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    oldValueGiven = oldValue;
                }
            );
            scope.$digest();

            scope.aValue = 43;
            scope.$digest();

            expect(oldValueGiven).toBe(42);
        });

        it('gives the old array value to listeners', function () {
            scope.aValue = [1, 2, 3];
            var oldValueGiven;

            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    oldValueGiven = oldValue;
                }
            );
            scope.$digest();

            scope.aValue.push(4);
            scope.$digest();

            expect(oldValueGiven).toEqual([1, 2, 3]);
        });

        it('gives the old object value to listeners', function () {
            scope.aValue = {a: 1, b: 2};
            var oldValueGiven;

            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    oldValueGiven = oldValue;
                }
            );
            scope.$digest();

            scope.aValue.c = 3;
            scope.$digest();

            expect(oldValueGiven).toEqual({a: 1, b: 2});
        });

        it('uses the new values as the old value on first digest', function () {
            scope.aValue = {a: 1, b: 2};
            var oldValueGiven;

            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    oldValueGiven = oldValue;
                }
            );
            scope.$digest();

            expect(oldValueGiven).toEqual({a: 1, b: 2});
        });

        it('accepts expressions for watch functions', function () {
            var theValue;
            scope.aColl = [1, 2, 3];
            scope.$watchCollection('aColl', function (newValue, oldValue, scope) {
                theValue = newValue;
            });
            scope.$digest();

            expect(theValue).toEqual([1, 2, 3]);
        });
    });

    describe('Events', function () {
        var parent;
        var scope;
        var child;
        var isolatedChild;
        beforeEach(function () {
            publishExternalAPI();
            parent = createInjector(['ng']).get('$rootScope');
            scope = parent.$new();
            child = scope.$new();
            isolatedChild = scope.$new(true);
        });

        it('allows registering listeners', function () {
            var listener1 = function () {

            };
            var listener2 = function () {

            };
            var listener3 = function () {

            };
            scope.$on('someEvent', listener1);
            scope.$on('someEvent', listener2);
            scope.$on('someOtherEvent', listener3);
            expect(scope.$$listeners).toEqual({
                someEvent: [listener1, listener2],
                someOtherEvent: [listener3]
            });

        });

        it('register different listeners for every scope', function () {
            var listener1 = function () {

            };
            var listener2 = function () {

            };
            var listener3 = function () {

            };
            scope.$on('someEvent', listener1);
            child.$on('someEvent', listener2);
            isolatedChild.$on('someOtherEvent', listener3);

            expect(scope.$$listeners).toEqual({someEvent: [listener1]});
            expect(child.$$listeners).toEqual({someEvent: [listener2]});
            expect(isolatedChild.$$listeners).toEqual({someOtherEvent: [listener3]});
        });

        _.forEach(['$emit', '$broadcast'], function (method) {

            it('calls the listeners of the matching event on ' + method, function () {
                var listener1 = jasmine.createSpy();
                var listener2 = jasmine.createSpy();

                scope.$on('someEvent', listener1);
                scope.$on('someOtherEvent', listener1);

                scope[method]('someEvent');

                expect(listener1).toHaveBeenCalled();
                expect(listener2).not.toHaveBeenCalled();
            });

            it('passes an event object with a name to listeners on ' + method, function () {
                var listener = jasmine.createSpy();
                scope.$on('someEvent', listener);
                scope[method]('someEvent');

                expect(listener).toHaveBeenCalled();
                expect(listener.calls.mostRecent().args[0].name).toEqual('someEvent');
            });

            it('passes an the same event object to each listener on ' + method, function () {
                var listener1 = jasmine.createSpy();
                var listener2 = jasmine.createSpy();

                scope.$on('someEvent', listener1);
                scope.$on('someEvent', listener2);

                scope[method]('someEvent');

                var event1 = listener1.calls.mostRecent().args[0];
                var event2 = listener2.calls.mostRecent().args[0];

                expect(event1).toBe(event2);
            });

            it('passes additional arguments to listeners on ' + method, function () {
                var listener = jasmine.createSpy();
                scope.$on('someEvent', listener);

                scope[method]('someEvent', 'and', ['additional', 'arguments'], '...');

                expect(listener.calls.mostRecent().args[1]).toEqual('and');
                expect(listener.calls.mostRecent().args[2]).toEqual(['additional', 'arguments']);
                expect(listener.calls.mostRecent().args[3]).toEqual('...');
            });

            it('returns the event object on ' + method, function () {
                var returnedEvent = scope[method]('someEvent');

                expect(returnedEvent).toBeDefined();
                expect(returnedEvent.name).toEqual('someEvent');
            });

            it('can be deregistered ' + method, function () {
                var listener = jasmine.createSpy();
                var deregister = scope.$on('someEvent', listener);

                deregister();
                scope[method]('someEvent');

                expect(listener).not.toHaveBeenCalled();
            });

            it('does not skip the next listener when removed on' + method, function () {
                var deregister;
                var listener = function () {
                    deregister();
                };
                var nextListener = jasmine.createSpy();

                deregister = scope.$on('someEvent', listener);
                scope.$on('someEvent', nextListener);

                scope[method]('someEvent');

                expect(nextListener).toHaveBeenCalled();
            });

            it('is set defaultPrevented when preventDefault called on ' + method), function () {
                var listener = function (event) {
                    event.stopPropagation();
                };
                scope.$on('someEvent', listener);

                var event = scope[method]('someEvent');

                expect(event.defaultPrevented).toBe(true);
            };

            it('does not stop on exceptions on ' + method, function () {
                var listener1 = function (event) {
                    throw 'listener1 throwing an exception';
                };
                var listener2 = jasmine.createSpy();
                scope.$on('someEvent', listener1);
                scope.$on('someEvent', listener2);

                scope[method]('someEvent');

                expect(listener2).toHaveBeenCalled();
            });

        });

        it('propagates up the scope hierarchy on $emit', function () {
            var parentListener = jasmine.createSpy();
            var scopeListener = jasmine.createSpy();

            parent.$on('someEvent', parentListener);
            scope.$on('someEvent', scopeListener);
            scope.$emit('someEvent');

            expect(scopeListener).toHaveBeenCalled();
            expect(parentListener).toHaveBeenCalled();

        });

        it('propagates the same event up on $emit', function () {
            var parentListener = jasmine.createSpy();
            var scopeListener = jasmine.createSpy();

            parent.$on('someEvent', parentListener);
            scope.$on('someEvent', scopeListener);

            scope.$emit('someEvent');

            var scopeEvent = scopeListener.calls.mostRecent().args[0];
            var parentEvent = scopeListener.calls.mostRecent().args[0];
            expect(scopeEvent).toBe(parentEvent);
        });

        it('broadcasting down in the scope hierarchy on $broadcast', function () {
            var scopeListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();
            var isolatedChildListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);
            isolatedChild.$on('someEvent', isolatedChildListener);

            scope.$broadcast('someEvent');

            expect(scopeListener).toHaveBeenCalled();
            expect(childListener).toHaveBeenCalled();
            expect(isolatedChildListener).toHaveBeenCalled();

        });
        it('propagates the same event down $broadcast', function () {
            var scopeListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);

            scope.$broadcast('someEvent');

            var scopeEvent = scopeListener.calls.mostRecent().args[0];
            var childEvent = scopeListener.calls.mostRecent().args[0];
            expect(scopeEvent).toBe(childEvent);
        });

        it('attaches targetScope on $emit', function () {
            var scopeListener = jasmine.createSpy();
            var parentListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', parentListener);

            scope.$emit('someEvent');

            expect(scopeListener.calls.mostRecent().args[0].targetScope).toBe(scope);
            expect(parentListener.calls.mostRecent().args[0].targetScope).toBe(scope);
        });

        it('attaches targetScope on $broadcast', function () {
            var scopeListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);

            scope.$broadcast('someEvent');

            expect(scopeListener.calls.mostRecent().args[0].targetScope).toBe(scope);
            expect(childListener.calls.mostRecent().args[0].targetScope).toBe(scope);
        });

        it('attaches currentScope on $emit', function () {
            var currentScopeOnScope, currentScopeOnParent;
            var scopeListener = function (event) {
                currentScopeOnScope = event.currentScope;
            };
            var parentListener = function (event) {
                currentScopeOnParent = event.currentScope;
            };
            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', parentListener);

            scope.$emit('someEvent');

            expect(currentScopeOnParent).toBe(parent);
            expect(currentScopeOnScope).toBe(scope);
        });

        xit('attaches currentScope on $broadcast', function () {
            var currentScopeOnScope, currentScopeOnChild;
            var scopeListener = function (event) {
                currentScopeOnScope = event.currentScope;
            };
            var childListener = function (event) {
                currentScopeOnChild = event.currentScope;
            };
            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', childListener);

            scope.$broadcast('someEvent');

            expect(currentScopeOnChild).toBe(parent);
            expect(currentScopeOnScope).toBe(scope);
        });

        it('sets currentScope to null after propagation on $emit', function () {
            var event;
            var scopeListener = function (evt) {
                event = evt;
            };
            scope.$on('someEvent', scopeListener);
            scope.$emit('someEvent');
            expect(event.currentScope).toBe(null);
        });

        it('sets currentScope to null after propagation on $broadcast', function () {
            var event;
            var scopeListener = function (evt) {
                event = evt;
            };
            scope.$on('someEvent', scopeListener);
            scope.$broadcast('someEvent');
            expect(event.currentScope).toBe(null);
        });


        it('does not propagate to parent when stopped', function () {
            var scopeListener = function (event) {
                event.stopPropagation();
            };

            var parentListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', parentListener);

            scope.$emit('someEvent');

            expect(parentListener).not.toHaveBeenCalled();
        });

        it('is received by listeners on current scope after being stopped', function () {
            var listener1 = function (event) {
                event.stopPropagation();
            };
            var listener2 = jasmine.createSpy();

            scope.$on('someEvent', listener1);
            scope.$on('someEvent', listener2);

            scope.$emit('someEvent');

            expect(listener2).toHaveBeenCalled();
        });

        it('fires $destroy when destroyed', function () {
            var listener = jasmine.createSpy();
            scope.$on('$destroy', listener);

            scope.$destroy();

            expect(listener).toHaveBeenCalled();
        });


    });

    describe('TTL configurability', function () {
        beforeEach(function () {
            publishExternalAPI();
        });

        it('allows configuring a shorter TTL', function () {
            var injector = createInjector(['ng', function ($rootScopeProvider) {
                $rootScopeProvider.digestTtl(5);
            }]);
            var scope = injector.get('$rootScope');
            scope.counterA = 0;
            scope.counterB = 0;

            scope.$watch(function (scope) {
                return scope.counterA;
            }, function (newValue, oldValue, scope) {
                if (scope.counterB < 5) {
                    scope.counterB++;
                }
            });
            scope.$watch(
                function (scope) {
                    return scope.counterB;
                },
                function (newValue, oldValue, scope) {
                    scope.counterA++;
                });
            expect(function () {
                scope.$digest();
            }).toThrow();
        });
    });
});
