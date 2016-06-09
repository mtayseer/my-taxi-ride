var map;

var mapboxLayer = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v9/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    accessToken: 'pk.eyJ1IjoibXRheXNlZXIiLCJhIjoiY2lwOGh2ajY2MDAwdW5xbmwwbXkyeDB0byJ9.48VPa3BIcLxf9ygWsmtZyQ'
});

map = L.map("map", {
    zoom: 11,
    center: new L.LatLng(30.067, 31.264),
    layers: [mapboxLayer]
});

var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
    draw: {
        polyline: {
            metric: true,
            shapeOptions: {
                color: 'green',
                weight: 4
            }
        },
        circle: false, polygon: false, marker: false, rectangle: false
    },
    edit: {
        featureGroup: drawnItems
    }
});

// Change the tooltip text of the control. This should be done before the control is added to the map
L.drawLocal.draw.toolbar.buttons.polyline = 'Draw the taxi path';
map.addControl(drawControl);

L.Polyline.prototype.length = function() {
    var length = 0;
    for (var i = 0; i < this._latlngs.length - 1; i++) {
        length += this._latlngs[i].distanceTo(this._latlngs[i+1]);
    }
    return length;
};

function pathCost(lengthInM) {
    var lengthInKM = lengthInM / 1000;
    var cost = Math.max(2.5, 2.5 + 1.25 * (lengthInKM - 1));
    return Math.round(cost * 4) / 4;
}

// Copied from https://github.com/DennisOSRM/Project-OSRM-Web/blob/master/WebContent/routing/OSRM.RoutingGeometry.js
function decode(encoded, precision) {
    precision = Math.pow(10, -precision);
    var len = encoded.length, index=0, lat=0, lng = 0, array = [];
    while (index < len) {
        var b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        //array.push( {lat: lat * precision, lng: lng * precision} );
        array.push( [lat * precision, lng * precision] );
    }
    return array;
}

map.on('draw:created', function (e) {
    var type = e.layerType,
        layer = e.layer;

    if (type === 'polyline') {
        var url = 'https://router.project-osrm.org/viaroute?z=14&output=json&jsonp=?&instructions=true';
        for (var i = 0; i < layer._latlngs.length; i++) {
            var point = layer._latlngs[i];
            url += '&loc=' + point.lat.toFixed(6) + ',' + point.lng.toFixed(6);
        }
        $.ajax({
            dataType: "json",
            url: url,
            cache: true
        }).done(function(response) {
            console.log(response);
            var line = decode(response['route_geometry'], 6);
            var costMsg = "Path length = " + L.GeometryUtil.readableDistance(layer.length(), true) + "<br>" +
                        "Cost = " + pathCost(layer.length()) + " EGP";
            layer.setLatLngs(line).bindLabel(costMsg).bindPopup(costMsg);
        });


    }

    drawnItems.addLayer(layer);
});
