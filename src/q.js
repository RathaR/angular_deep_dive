/* jshint globalstrict: true */
'use strict';

function $QProvider() {
    this.$get = ['$rootScope', function ($rootScope) {

        function Promise() {
            this.$$state = {};
        }

        Promise.prototype.then = function (onFulfilled) {
            this.$$state.pending = onFulfilled;
        };

        function Deferred() {
            this.promise = new Promise();
        }

        function processQueue(state) {
            state.pending(state.value);
        }

        function scheduleProcessQueue(state) {
            $rootScope.$evalAsync(function () {
                processQueue(state);
            });
        }

        Deferred.prototype.resolve = function (v) {
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