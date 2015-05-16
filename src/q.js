/* jshint globalstrict: true */
'use strict';

function $QProvider() {
    this.$get = ['$rootScope', function ($rootScope) {

        function Promise() {
            this.$$state = {};
        }

        Promise.prototype.then = function (onFulfilled) {
            this.$$state.pending = this.$$state.pending || [];
            this.$$state.pending.push(onFulfilled);
            if (this.$$state.status > 0) {
                scheduleProcessQueue(this.$$state);
            }
        };

        function Deferred() {
            this.promise = new Promise();
        }

        function processQueue(state) {
            var pending = state.pending;
            delete state.pending;
            _.forEach(pending, function (onFulfiled) {
                onFulfiled(state.value);
            });
        }

        function scheduleProcessQueue(state) {
            $rootScope.$evalAsync(function () {
                processQueue(state);
            });
        }

        Deferred.prototype.resolve = function (v) {
            if (this.promise.$$state.status) {
                return;
            }
            this.promise.$$state.status = 1;
            this.promise.$$state.value = v;
            scheduleProcessQueue(this.promise.$$state);
        };

        function defer() {
            return new Deferred();
        }

        return {
            defer: defer
        }
    }];
}