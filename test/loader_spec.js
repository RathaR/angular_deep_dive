/* jshint globalstrict: true */
/* jshint setupModuleLoader: true */
'use strict';
describe('setupModuleLoader', function() {
   it('exposes angular on the window', function() {
     setupModuleLoader(window);
       expect(window.angular).toBeDefined();
   });
});