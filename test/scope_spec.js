/* jshint globalstrict: true */
/* global Scope: true */
'use strict';
describe('Scope', function () {
    it('can be constructed and used as an object', function () {
        var scope = new Scope();
        scope.aProperty = 1;
        expect(scope.aProperty).toBe(1);
    });

    describe('digest', function () {
        var scope;
        beforeEach(function () {
            scope = new Scope();
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

        it('shedules a digest in $evalAsync', function (done) {
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
    });

    describe('$watchGroup', function () {

        var scope;
        beforeEach(function () {
            scope = new Scope();
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
});
