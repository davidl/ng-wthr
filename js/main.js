// Service

function weatherHelpers ($log) {
    /**
     * @name processResults
     * @desc Simplify the weather data returned from API
     * @param {Array} data
     * @returns {Array} conditions
     */
    this.processResults = function(data) {
        var conditions = [];
        conditions['code'] = data.weather[0].id;
        conditions['name'] = data.name;
        conditions['current'] = Math.round(data.main.temp);
        conditions['low'] = Math.round(data.main.temp_min);
        conditions['high'] = Math.round(data.main.temp_max);
        conditions['descriptionFull'] = data.weather[0].description;
        conditions['description'] = data.weather[0].main;
        return {
            conditions: conditions
        }
    }

    /**
     * @name fToC
     * @desc Convert certain values to Celsius (from Fahrenheit)
     * @param {Array} conditions array
     * @returns {Array} conditions array
     */
    this.fToC = function(conditions) {
        var conditionsTemps = ['current', 'low', 'high'];
        for (var prop in conditionsTemps) {
            var valueF = conditions[conditionsTemps[prop]];
            var valueC = Math.round((valueF - 32) * 5 / 9);
            conditions[conditionsTemps[prop]] = valueC;
        }
        return conditions;
    };

    /**
     * @name cToF
     * @desc Convert certain values to Fahrenheit (from Celsius)
     * @param {Array} conditions array
     * @returns {Array} conditions array
     */
    this.cToF = function(conditions) {
        var conditionsTemps = ['current', 'low', 'high'];
        for (var prop in conditionsTemps) {
            var valueC = conditions[conditionsTemps[prop]];
            var valueF = Math.round(valueC * 9 / 5 + 32);
            conditions[conditionsTemps[prop]] = valueF;
        }
        return conditions;
    };
}

// Controller

function WeatherCtrl ($scope, $http, $log, weatherHelpers) {
    $scope.conditions = {};
    this.units = 'imperial';
    this.geolocationAvailable = !!navigator.geolocation;

    /**
     * @name getWeatherByPlacename
     * @desc Call getWeather() with a place name
     */
    this.getWeatherByPlacename = function() {
        if (!this.place) {
            return
        }
        this.getWeather({'q': this.place});
    };

    /**
     * @name getWeatherByLatLon
     * @desc Obtain geolocation from the browser and call getWeather() with lat/lon
     */
    this.getWeatherByLatLon = function() {
        function geoSuccess(position) {
            this.getWeather({
                'lat': position.coords.latitude,
                'lon': position.coords.longitude
            })
        };

        function geoError(error) {
            $log.error('ERROR(' + error.code + '): ' + error.message);
        };

        navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
    };

    /**
     * @name getWeather
     * @desc Call Open Weather Map API
     * @param {Object} queryData
     */
    this.getWeather = function(queryData) {
        queryData['units'] = this.units;
        $log.log(queryData);
        $http.get('http://api.openweathermap.org/data/2.5/weather', {
            params: queryData
        })
        .success( function(data) {
            // API doesn't change HTTP status code,
            // instead we must check the "cod" value:
            if ( data.cod == '200' ) {
                $scope.conditions = weatherHelpers.processResults(data).conditions;
            } else {
                $log.error('Error calling OpenWeatherMap API (data)');
            }
        })
        .error( function() {
            $log.error('Error calling OpenWeatherMap API');
        });
    };

    /**
     * @name convertUnits
     * @desc Call the appropriate service function to convert temperature values.
     */
    this.convertUnits = function() {
        $scope.conditions = this.units == 'metric' ?
            weatherHelpers.fToC($scope.conditions) :
            weatherHelpers.cToF($scope.conditions);
    };
}

angular
    .module('wthr', [])
    .service('weatherHelpers', weatherHelpers)
    .controller('WeatherCtrl', WeatherCtrl);