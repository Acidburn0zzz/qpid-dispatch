/*
Licensed to the Apache Software Foundation (ASF) under one
  or more contributor license agreements.  See the NOTICE file
  distributed with this work for additional information
  regarding copyright ownership.  The ASF licenses this file
  to you under the Apache License, Version 2.0 (the
  "License"); you may not use this file except in compliance
  with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing,
  software distributed under the License is distributed on an
  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, either express or implied.  See the License for the
  specific language governing permissions and limitations
  under the License.
*/
/**
 * @module QDR
 */
var QDR = (function(QDR) {

  // The QDR service handles the connection to the router
  QDR.module.factory("QDRService", ['$timeout', '$location', function($timeout, $location) {
    var dm = require("dispatch-management")
    var self = {
      management: new dm.Management($location.protocol()),
      utilities: dm.Utilities,

      onDisconnect: function () {
        $timeout( function () {
          $location.path('/connect')
          var curPath = $location.path()
          var org = curPath.substr(1)
          if (org && org.length > 0 && org !== "connect") {
            $location.search('org', org)
          } else {
            $location.search('org', null)
          }
        })
      }

    }

    return self;
  }]);

  return QDR;

}(QDR || {}));

(function() {
  console.dump = function(o) {
    if (window.JSON && window.JSON.stringify)
      QDR.log.info(JSON.stringify(o, undefined, 2));
    else
      console.log(o);
  };
})();

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function (searchString, position) {
    return this.substr(position || 0, searchString.length) === searchString
  }
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.lastIndexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}

// https://tc39.github.io/ecma262/#sec-array.prototype.findIndex
if (!Array.prototype.findIndex) {
  Object.defineProperty(Array.prototype, 'findIndex', {
    value: function(predicate) {
     // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return k.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return k;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return -1.
      return -1;
    }
  });
}
