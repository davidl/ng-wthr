/**
 * @file JavaScript for ng-wthr written in AngularJS.
 * @author David Lantner <davidlantner@gmail.com>
 */
/*global angular*/

// Service
function weatherHelpers() {
    'use strict';
    
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
    'use strict';
    $scope.conditions = {};
    $scope.units = 'imperial';
    this.geolocationAvailable = !!navigator.geolocation;

    /**
     * @name getWeatherByPlacename
     * @desc Call getWeather() with a place name
     */
    this.getWeatherByPlacename = function () {
        if (!this.place) {
            return;
        }
        $scope.getWeather({'q': this.place});
    };

    /**
     * @name getWeatherByLatLon
     * @desc Obtain geolocation from the browser and call getWeather() with lat/lon
     */
    this.getWeatherByLatLon = function () {
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
            });
    };

    /**
     * @name convertUnits
     * @desc Call the appropriate service function to convert temperature values.
     */
    this.convertUnits = function () {
        $scope.conditions = this.units === 'metric' ? weatherHelpers.fToC($scope.conditions) : weatherHelpers.cToF($scope.conditions);
    };
}

angular
    .module('wthr', [])
    .run(function ($timeout) {
        'use strict';
        $timeout(function () {
            document.getElementById('units-imperial').checked = true;
        }, 1);
    })
    .service('weatherHelpers', weatherHelpers)
    .controller('WeatherCtrl', WeatherCtrl);