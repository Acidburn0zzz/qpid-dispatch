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

  /**
   * @method SettingsController
   * @param $scope
   * @param QDRServer
   *
   * Controller that handles the QDR settings page
   */

  QDR.module.controller("QDR.SettingsController", ['$scope', 'QDRService', '$timeout', '$location', function($scope, QDRService, $timeout, $location) {

    $scope.connecting = false;
    $scope.connectionError = false;
    $scope.connectionErrorText = undefined;
    $scope.forms = {};

    $scope.formEntity = angular.fromJson(localStorage[QDR.SETTINGS_KEY]) || {
      address: '',
      port: '',
      username: '',
      password: '',
      autostart: false
    };

    $scope.$watch('formEntity', function(newValue, oldValue) {
      if (newValue !== oldValue) {
        localStorage[QDR.SETTINGS_KEY] = angular.toJson(newValue);
      }
    }, true);

    $scope.buttonText = function() {
      if (QDRService.management.connection.is_connected()) {
        return "Disconnect";
      } else {
        return "Connect";
      }
    };

    $scope.connect = function() {
      if (QDRService.management.connection.is_connected()) {
        $timeout( function () {
          QDRService.management.connection.disconnect();
        })
        return;
      }

      if ($scope.settings.$valid) {
        $scope.connectionError = false;
        $scope.connecting = true;
        // timeout so connecting animation can display
        $timeout(function () {
          doConnect()
        })
      }
    }

    var doConnect = function() {
    QDR.log.info("doConnect called on connect page")
      if (!$scope.formEntity.address)
        $scope.formEntity.address = "localhost"
      if (!$scope.formEntity.port)
        $scope.formEntity.port = 5673

      var failed = function() {
        QDR.log.info("disconnect action called");
        $timeout(function() {
          $scope.connecting = false;
          $scope.connectionErrorText = "Unable to connect to " + $scope.formEntity.address + ":" + $scope.formEntity.port
          $scope.connectionError = true
        })
      }
      var options = {address: $scope.formEntity.address, port: $scope.formEntity.port}
      QDRService.management.connection.testConnect(options, function (e) {
        if (e.error) {
          failed()
        } else {
          QDR.log.info("test connect from connect page succeeded")
          QDRService.management.connection.addConnectAction(function() {
            QDR.log.info("real connect from connect page succeeded")
            // get notified if at any time the connection fails
            QDRService.management.connection.addDisconnectAction(QDRService.onDisconnect);
            QDRService.management.getSchema(function () {
              QDR.log.info("got schema after connection")
              QDRService.management.topology.addUpdatedAction("initialized", function () {
                QDRService.management.topology.delUpdatedAction("initialized")
                QDR.log.info("got initial topology")
                $timeout(function() {
                  $scope.connecting = false;
                  if ($location.path().startsWith(QDR.pluginRoot)) {
                      var searchObject = $location.search();
                      var goto = "overview";
                      if (searchObject.org && searchObject.org !== "connect") {
                        goto = searchObject.org;
                      }
                      $location.search('org', null)
                      $location.path(QDR.pluginRoot + "/" + goto);
                  }
                })
              })
              QDR.log.info("requesting a topology")
              QDRService.management.topology.setUpdateEntities([])
              QDRService.management.topology.get()
            })
          });
          options.reconnect = true
          QDRService.management.connection.connect(options)
        }
      })
    }
  }]);


  QDR.module.directive('posint', function() {
    return {
      require: 'ngModel',

      link: function(scope, elem, attr, ctrl) {
        // input type number allows + and - but we don't want them so filter them out
        elem.bind('keypress', function(event) {
          var nkey = !event.charCode ? event.which : event.charCode;
          var skey = String.fromCharCode(nkey);
          var nono = "-+.,"
          if (nono.indexOf(skey) >= 0) {
            event.preventDefault();
            return false;
          }
          // firefox doesn't filter out non-numeric input. it just sets the ctrl to invalid
          if (/[\!\@\#\$\%^&*\(\)]/.test(skey) && event.shiftKey || // prevent shift numbers
            !( // prevent all but the following
              nkey <= 0 || // arrows
              nkey == 8 || // delete|backspace
              nkey == 13 || // enter
              (nkey >= 37 && nkey <= 40) || // arrows
              event.ctrlKey || event.altKey || // ctrl-v, etc.
              /[0-9]/.test(skey)) // numbers
          ) {
            event.preventDefault();
            return false;
          }
        })
          // check the current value of input
        var _isPortInvalid = function(value) {
          var port = value + ''
          var isErrRange = false;
          // empty string is valid
          if (port.length !== 0) {
            var n = ~~Number(port);
            if (n < 1 || n > 65535) {
              isErrRange = true;
            }
          }
          ctrl.$setValidity('range', !isErrRange)
          return isErrRange;
        }

        //For DOM -> model validation
        ctrl.$parsers.unshift(function(value) {
          return _isPortInvalid(value) ? undefined : value;
        });

        //For model -> DOM validation
        ctrl.$formatters.unshift(function(value) {
          _isPortInvalid(value);
          return value;
        });
      }
    };
  });

  return QDR;
}(QDR || {}));
