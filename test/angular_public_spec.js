describe('angularPublic', function () {
    'use strict';

    it('set up the angular object and the module loader', function () {
        publishExternalAPI()
        expect(window.angular).toBeDefined();
        expect(window.angular.module).toBeDefined();
    });

    it('set up th ng module', function () {
        publishExternalAPI();
        expect(createInjector(['ng'])).toBeDefined()
    });

    it('set up the $parse service', function () {
        publishExternalAPI();
        var injector = createInjector(['ng']);
        expect(injector.has('$parse')).toBe(true);
    });
    it('set up the $rootScope', function () {
        publishExternalAPI();
        var injector = createInjector(['ng'])
        expect(injector.has('$rootScope')).toBe(true);
    });
});