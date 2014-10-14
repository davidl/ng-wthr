var app = angular.module('wthr', []);

app.service('weatherHelpers', function() {
    this.processResults = function(data) {
        var conditions = [];
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

    this.convertUnits = function() {
        /*
        // Ensure value is "imperial" or "metric":
        if ( unit !== 'imperial' && unit !== 'metric' ) {
            return;
        }
        if ( $('#results').is(':visible') ) {
            $('.temp').each(function(i, item){
                var value = unit == 'metric' ? 
                    Math.round(($(item).text() - 32) * 5 / 9) : // F to C
                    Math.round($(item).text() * 9 / 5 + 32); // C to F
                $(item).text(value);
            });
        }
        */
    };
});

app.controller('WeatherCtrl', function($scope, $http, $log, weatherHelpers) {
    var conditions = [];
    $scope.units = 'imperial';
    $scope.geolocationAvailable = !!navigator.geolocation;

    $scope.getWeatherByPlacename = function() {
        $scope.getWeather({'q': this.place});
    };

    $scope.getWeatherByLatLon = function() {
        function geoSuccess(position) {
            $scope.getWeather({
                'lat': position.coords.latitude,
                'lon': position.coords.longitude
            })
        };
        function geoError(error) {
            $log.error('ERROR(' + error.code + '): ' + error.message);
        };
        navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
    };

    $scope.getWeather = function(queryData) {
        queryData['units'] = $scope.units;
        $log.log(queryData);
        $http.get('http://api.openweathermap.org/data/2.5/weather', {
            params: queryData
        })
        .success( function(data) {
            $log.log(data);
            // API doesn't change HTTP status code,
            // instead we must check the "cod" value:
            if ( data.cod == '200' ) {
                $scope.conditions = weatherHelpers.processResults(data).conditions;
                $log.log($scope.conditions);
            } else {
                $log.error('Error calling OpenWeatherMap API (data)');
            }
        })
        .error( function() {
            $log.error('Error calling OpenWeatherMap API');
        });
    };
});