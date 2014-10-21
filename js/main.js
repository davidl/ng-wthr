/**
 * @file JavaScript for ng-wthr written in AngularJS.
 * @author David Lantner <davidlantner@gmail.com>
 * Attempts to follow the styleguide by @toddmotto: https://github.com/toddmotto/angularjs-styleguide
 * Checked via JSLint
 */
/*global angular*/
(function () {
    'use strict';
    
    var httpProviderConfig = ['$httpProvider', function ($httpProvider) {
        // Using Jim Lavin's Publish/Subscribe Pattern approach:
        // http://codingsmackdown.tv/blog/2013/04/20/using-response-interceptors-to-show-and-hide-a-loading-widget-redux/
        var $http,
            interceptor = ['$q', '$injector', function ($q, $injector) {
                var notificationChannel;

                function success(response) {
                    // get $http via $injector because of circular dependency problem
                    $http = $http || $injector.get('$http');
                    // don't send notification until all requests are complete
                    if ($http.pendingRequests.length < 1) {
                        // get requestNotificationChannel via $injector because of circular dependency problem
                        notificationChannel = notificationChannel || $injector.get('requestNotificationChannel');
                        // send a notification requests are complete
                        notificationChannel.requestEnded();
                    }
                    return response;
                }

                function error(response) {
                    // get $http via $injector because of circular dependency problem
                    $http = $http || $injector.get('$http');
                    // don't send notification until all requests are complete
                    if ($http.pendingRequests.length < 1) {
                        // get requestNotificationChannel via $injector because of circular dependency problem
                        notificationChannel = notificationChannel || $injector.get('requestNotificationChannel');
                        // send a notification requests are complete
                        notificationChannel.requestEnded();
                    }
                    return $q.reject(response);
                }

                return function (promise) {
                    // get requestNotificationChannel via $injector because of circular dependency problem
                    notificationChannel = notificationChannel || $injector.get('requestNotificationChannel');
                    // send a notification requests are complete
                    notificationChannel.requestStarted();
                    return promise.then(success, error);
                }
            }];

        $httpProvider.responseInterceptors.push(interceptor);
    }];
    
    var requestNotificationChannelFactory = ['$rootScope', function ($rootScope) {
        // private notification messages
        var startRequest = '_START_REQUEST_',
            endRequest = '_END_REQUEST_',
            // publish start request notification
            requestStarted = function () {
                $rootScope.$broadcast(startRequest);
            },
            // publish end request notification
            requestEnded = function () {
                $rootScope.$broadcast(endRequest);
            },
            // subscribe to start request notification
            onRequestStarted = function ($scope, handler) {
                $scope.$on(startRequest, function (event) {
                    handler();
                });
            },
            // subscribe to end request notification
            onRequestEnded = function ($scope, handler) {
                $scope.$on(endRequest, function (event) {
                    handler();
                });
            };

        return {
            requestStarted:  requestStarted,
            requestEnded: requestEnded,
            onRequestStarted: onRequestStarted,
            onRequestEnded: onRequestEnded
        };
    }];
    
    var loadingWidgetDirective = ['requestNotificationChannel', function (requestNotificationChannel) {
        return {
            restrict: "A",
            link: function (scope, element) {
                // hide the element initially
                element[0].style.visibility = 'hidden';

                var startRequestHandler = function () {
                    // got the request start notification, show the element
                    element[0].style.visibility = 'visible';
                };

                var endRequestHandler = function () {
                    // got the request start notification, show the element
                    element[0].style.visibility = 'hidden';
                };

                requestNotificationChannel.onRequestStarted(scope, startRequestHandler);

                requestNotificationChannel.onRequestEnded(scope, endRequestHandler);
            }
        };
    }];
   
    // Service
    function weatherHelpers() {
        /**
         * @name processResults
         * @desc Simplify the weather data returned from API
         * @param {Array} data
         * @returns {Array} conditions
         */
        function processResults(data) {
            var conditions = [];
            conditions.code = data.weather[0].id;
            conditions.name = data.name;
            conditions.current = Math.round(data.main.temp);
            conditions.low = Math.round(data.main.temp_min);
            conditions.high = Math.round(data.main.temp_max);
            conditions.descriptionFull = data.weather[0].description;
            conditions.description = data.weather[0].main;
            return {
                conditions: conditions
            };
        }

        /**
         * @name fToC
         * @desc Convert certain values to Celsius (from Fahrenheit)
         * @param {Array} conditions array
         * @returns {Array} conditions array
         */
        function fToC(conditions) {
            var conditionsTemps = ['current', 'low', 'high'],
                prop,
                valueF,
                valueC;
            for (prop in conditionsTemps) {
                if (conditionsTemps.hasOwnProperty(prop)) {
                    valueF = conditions[conditionsTemps[prop]];
                    valueC = Math.round((valueF - 32) * 5 / 9);
                    conditions[conditionsTemps[prop]] = valueC;
                }
            }
            return conditions;
        }

        /**
         * @name cToF
         * @desc Convert certain values to Fahrenheit (from Celsius)
         * @param {Array} conditions array
         * @returns {Array} conditions array
         */
        function cToF(conditions) {
            var conditionsTemps = ['current', 'low', 'high'],
                prop,
                valueC,
                valueF;
            for (prop in conditionsTemps) {
                if (conditionsTemps.hasOwnProperty(prop)) {
                    valueC = conditions[conditionsTemps[prop]];
                    valueF = Math.round(valueC * 9 / 5 + 32);
                    conditions[conditionsTemps[prop]] = valueF;
                }
            }
            return conditions;
        }

        return {
            processResults: processResults,
            fToC: fToC,
            cToF: cToF
        };
    }

    // Controller
    function WeatherCtrl($scope, $http, $log, weatherHelpers) {
        $scope.conditions = {};
        $scope.units = 'imperial';
        $scope.geolocationAvailable = !!navigator.geolocation;
        $scope.showError = false;
        $scope.errorMessage = 'An error occured. Please try again.';

        /**
         * @name getWeatherByPlacename
         * @desc Call getWeather() with a place name
         */
        $scope.getWeatherByPlacename = function () {
            if (!$scope.place) {
                return;
            }
            $scope.getWeather({
                'q': $scope.place
            });
        };

        /**
         * @name getWeatherByLatLon
         * @desc Obtain geolocation from the browser and call getWeather() with lat/lon
         */
        $scope.getWeatherByLatLon = function () {
            function geoSuccess(position) {
                $scope.getWeather({
                    'lat': position.coords.latitude,
                    'lon': position.coords.longitude
                });
            }

            function geoError(error) {
                $log.error('ERROR(' + error.code + '): ' + error.message);
            }

            navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
        };

        /**
         * @name getWeather
         * @desc Call Open Weather Map API
         * @param {Object} queryData
         */
        $scope.getWeather = function (queryData) {
            $scope.showError = false;
            queryData.units = this.units;
            $log.log(queryData);
            $http
                .get('http://api.openweathermap.org/data/2.5/weather', {
                    params: queryData
                })
                .success(function (data) {
                    // API doesn't change HTTP status code, so check the "cod" value:
                    if (data.cod === 200) {
                        $scope.conditions = weatherHelpers.processResults(data).conditions;
                    } else {
                        $log.error('Error calling OpenWeatherMap API (data)');
                    }
                })
                .error(function () {
                    $log.error('Error calling OpenWeatherMap API');
                    $scope.showError = true;
                });
        };

        /**
         * @name convertUnits
         * @desc Call the appropriate service function to convert temperature values.
         */
        $scope.convertUnits = function () {
            $scope.conditions = $scope.units === 'metric' ? weatherHelpers.fToC($scope.conditions) : weatherHelpers.cToF($scope.conditions);
        };
    }

    angular
        .module('wthr', [])
        .run(function ($timeout) {
            $timeout(function () {
                document.getElementById('units-imperial').checked = true;
            }, 1);
        })
        .config(httpProviderConfig)
        .factory('requestNotificationChannel', requestNotificationChannelFactory)
        .directive('loadingWidget', loadingWidgetDirective)
        .service('weatherHelpers', weatherHelpers)
        .controller('WeatherCtrl', WeatherCtrl);

}());