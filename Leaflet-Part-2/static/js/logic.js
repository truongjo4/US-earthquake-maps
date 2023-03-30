// Initialise map
let myMap = L.map("map", {
  center: [4.3995, 113.9914],
  zoom: 2
});
  
// Adding the tile layers = Street + Topo
let streetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(myMap);

let topoMapLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.opentopomap.org/">OpenTopoMap</a> contributors'
});

// Perform an API call to the USGS API to get the earthquake information. Call createMarkers when it completes.
const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson"
d3.json(url).then(function(earthquake_data) {
  createMarkers(earthquake_data);
});

//////////// Functions to help with creating map //////////// 
// Function to convert unix time into standard time
function formatDateTime(timestamp) {
  let date = new Date(timestamp);
  let year = date.getFullYear();
  let month = ('0' + (date.getMonth() + 1)).slice(-2);
  let day = ('0' + date.getDate()).slice(-2);
  let hours = ('0' + date.getHours()).slice(-2);
  let minutes = ('0' + date.getMinutes()).slice(-2);

  return year + '/' + month + '/' + day + ', ' + hours + ':' + minutes;
}

// Function to provide descriptions to PAGER reports
function PAGERreport(pagerColor) {
  let pager_result = pagerColor
  if (pager_result == "green") {
    return "(minimal or no impact)"
  }
  else if (pager_result == "yellow") {
    return "(regional impact and response)"
  }

  else if (pager_result == "orange") {
    return "(national-scale impact and response)"
  }

  else if (pager_result == "red") {
    return "(international response)"
  }

  else {return "(N/A)"}
}

// Function to calculate size of circle
function circleSize(magnitude) {
  const c = 3; // Adjust this constant to change the size of the smallest circle 
  const scale = 50000; // Adjust this constant to change the overall scale of the circle sizes
  return Math.max(Math.pow(magnitude - c, 1.8), 0.1) * scale;
}


// Function to get different colours based on earthquake depth
function circleColor(depth) {
  if (depth > 90) return '#800026';
  if (depth > 70) return '#BD0026';
  if (depth > 50) return '#E31A1C';
  if (depth > 30) return '#FC4E2A';
  if (depth > 10) return '#FD8D3C';
  return '#FEB24C';
}
///////////////////////////////////////////////

// Prepare earthquake layer
let earthquakeMarkersLayer = L.layerGroup();

// Main function to create circle markers
function createMarkers(response) {

  // Prep for 'for loop' 
  let earthquakes = response.features;

  // Loop through the earthquake array.
  for (let index = 0; index < earthquakes.length; index++) {
    let earthquake = earthquakes[index];
    let unix_time = earthquake.properties.time;
    let formattedTime = formatDateTime(unix_time);
    let pager = earthquake.properties.alert
    let depth = earthquake.geometry.coordinates[2]

    // For each earthquake, create a circle marker, and bind a popup with the station's name.
    L.circle([earthquake.geometry.coordinates[1], earthquake.geometry.coordinates[0]], {
      color: circleColor(depth),
      fillColor: circleColor(depth),
      fillOpacity: 0.7,
      radius: circleSize(earthquake.properties.mag)
      })
      .bindPopup("<h2>" + earthquake.properties.place + "</h2><p class='property-name'>Magnitude: <strong>" + earthquake.properties.mag + "</strong></p>"
        + "<p class='property-name'>Depth: <strong>" + depth + "</strong></p>"
        + "<p class='property-name'>Status: <strong>" + earthquake.properties.status + "</strong></p>"
        + "<p class='property-name'>Time: <strong>" + formattedTime + "</strong></p>"
        + "<p class='property-name'>PAGER result: <strong>" + pager + " " + PAGERreport(pager) + "</strong></p>")
      .addTo(earthquakeMarkersLayer);
  }
  // Add earthquake circles into map
  earthquakeMarkersLayer.addTo(myMap);
}

// Call the function to add the tectonic plates layer
let platesLayer = L.layerGroup();

function addPlatesLayer(platesData) {
let plates = L.geoJSON(platesData, {
style: {
color: "#FFA500",
weight: 2
}
}).addTo(platesLayer);
}

d3.json("dataset/PB2002_boundaries.json").then(function(platesData) {
addPlatesLayer(platesData);
});

// Create a new layer control
let baseMaps = {
"Street Map": streetMapLayer,
"Topographic Map": topoMapLayer
};

let overlayMaps = {
"Earthquakes": earthquakeMarkersLayer,
"Tectonic Plates": platesLayer
};

L.control.layers(baseMaps, overlayMaps).addTo(myMap);

///////////////////////////////////////////////

// Create a legend for depth
let legend = L.control({ position: "bottomright" });

// Customise legend layout 
legend.onAdd = function () {
  let div = L.DomUtil.create("div", "info legend");
  div.style.backgroundColor = "white";
  div.style.padding = "8px";
  div.style.border = "1px solid black";
  div.style.borderRadius = "5px";
  let depthLevels = [-10, 10, 30, 50, 70, 90];
  let labels = [];

  // Add legends title
  labels.push("<h4>Earthquake Depth</h4>");
  // loop through our depth intervals and generate a label with a colored square for each interval
  for (let i = 0; i < depthLevels.length; i++) {
    labels.push(
      '<i style="background:' + circleColor(depthLevels[i] + 1) + '; width: 20px; height: 20px; display: inline-block; margin-right: 4px;"></i> ' +
      depthLevels[i] + (depthLevels[i + 1] ? '&ndash;' + depthLevels[i + 1] + '<br>' : '+'));
  }

  div.innerHTML = labels.join('');
  return div;
};

legend.addTo(myMap);