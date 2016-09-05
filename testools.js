(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['angular'], factory);
  } else {
    root.mvTestTools = factory(root.angular);
  }
})(this, function(angular) {
  'use strict';

  var matchers = {
    rowToIncludeFields: rowToIncludeFields,
    toBePromise: toBePromise,
    toBeResolved: toBeResolved,
    toBeRejected: toBeRejected,
    toHaveState: toHaveState
  };

  setupHelperModule();

  beforeEach(function() {
    jasmine.addMatchers(matchers);
  });

  return {
    returnArray: returnArray,
    returnObject: returnObject,
    returnString: returnString,
    returnFunction: returnFunction,
    returnPassedValue: returnPassedValue,
    returnValue: returnValue,

    log: log,
    logDiff: logDiff,
    spyifyObject: spyifyObject

  };

  /************ ANGULAR HELPERS ************/

  function setupHelperModule() {
    var module = angular.module('mvTestools', []);

    /**
     * Helper for flushing templates without suppressing exceptions
     */
    module.factory('templates', function($httpBackend, $compile) {
      return {
        flush: function() {
          try {
            $httpBackend.flush();
          } catch (error) {
            if (!error.message || error.message.indexOf('No pending request to flush') === -1) {
              throw error;
            }
          }
        },
        compile: function(element, scope) {
          var el = $compile(element)(scope);
          this.flush();
          return el;
        }
      };
    });

    module.factory('$provider', function($injector) {
      return {
        factory: function(moduleName, factoryName, locals) {
          return this.getProvider('factory', moduleName, factoryName, locals);
        },
        service: function(moduleName, serviceName, locals) {
          return this.getProvider('service', moduleName, serviceName, locals);
        },
        getProvider: function(providerType, moduleName, instanceName, locals) {
          var queue = angular.module(moduleName)._invokeQueue;
          var provider;

          for (var i = 0; i < queue.length; i++) {
            var type = queue[i][1];
            var name = queue[i][2][0];

            if (type === providerType && name === instanceName) {
              provider = queue[i];
              break;
            }
          }

          if (!provider) {
            throw '$provider didn\'t find ' + instanceName + ' in ' + moduleName + ' module';
          }

          return $injector.invoke(provider[2][1], {}, locals);
        }
      };
    });
  }

  /************ MATCHERS ************/

  function rowToIncludeFields() {
    return {
      compare: function(actual, expectedFields) {
        var result = { pass: true };
        var tableFieldset = actual;
        var fields = tableFieldset.getRowFields(1);
        var missingFields = [];

        expectedFields.forEach(function(expectedAlias) {
          var hasField = fields.some(function(field) {
            return expectedAlias === tableFieldset.getFieldAlias(field.getName());
          });
          if (!hasField) {
            missingFields.push(expectedAlias);
          }
        });

        if (missingFields.length) {
          result.message = function() {
            return 'Expected fieldset to include fields in row, but it missed [' + missingFields.join(', ') + ']';
          };
          result.pass = false;
        }

        return result;
      }
    };
  }

  function toBePromise() {
    return {
      compare: function(actual) {
        var result = { pass: false };

        if (actual && typeof actual.then === 'function') {
          result.pass = true;
        } else {
          result.message = function() {
            return 'Expected ' + result + ' to be a promise';
          };
        }

        return result;
      }
    }
  }

  function toBeResolved() {
    return {
      compare: function(actual) {
        var result = { pass: false };

        if (actual && actual.$$state && actual.$$state.status === 1) {
          result.pass = true;
        } else {
          result.message = function() {
            return 'Expected ' + result + ' to be a resolved';
          };
        }

        return result;
      }
    }
  }

  function toBeRejected() {
    return {
      compare: function(actual) {
        var result = { pass: false };

        if (actual && actual.$$state && actual.$$state.status === 2) {
          result.pass = true;
        } else {
          result.message = function() {
            return 'Expected ' + result + ' to be a rejected';
          };
        }

        return result;
      }
    }
  }

  function toHaveState() {
    return {
      compare: function(actual, expected) {
        var result = { pass: false };

        actual.forEach(function(item) {
          if (item.state === expected) {
            result.pass = true;
          }
        });

        if (!result.pass) {
          result.message = function() {
            return 'Expected ' + JSON.stringify(actual) + ' state to have state \'' + expected + '\'';
          };
        }

        return result;
      }
    }
  }

  /************ HELPERS ************/

  function returnArray() {
    return [];
  }

  function returnObject() {
    return {};
  }

  function returnString() {
    return '';
  }

  function returnFunction() {
    return angular.noop;
  }

  function returnPassedValue(value) {
    return value;
  }

  function returnValue(value) {
    return function() {
      return value;
    };
  }

  /**
   * logs object fields or array elements one per row
   */
  function log(items) {
    console.log('');
    angular.forEach(items, function(item, key) {
      console.log(key, item);
    });
    console.log('');
  }

  /**
   * logs differences between objects, handy in comparing actual and expected
   */
  function logDiff(item1, item2) {
    console.log('DIFF==');
    var differences = [];
    angular.forEach(item1, function(value1, key) {
      var value2 = item2[key];
      if (value1 !== value2) {
        differences.push({
          key: key,
          value1: value1,
          value2: value2
        });
      }
    });
    differences.forEach(function(difference) {
      console.log(difference);
    });
    console.log('======');
  }

  /**
   * @desc Adds spys to object values
   * @param {string} name
   * @param {Object} object
   * @returns {*}
   */
  function spyifyObject(name, object) {
    var methods = [];
    var key;
    var spy;

    for (key in object) {
      if (angular.isFunction(object[key])) {
        methods.push(key);
      }
    }

    spy = jasmine.createSpyObj(name, methods);

    for (key in object) {
      if (angular.isFunction(object[key])) {
        spy[key].and.callFake(object[key]);
      } else {
        spy[key] = object[key];
      }
    }

    return spy;
  }

});
