/* eslint-disable */
export const displayMap = (locations) => {
  if (!locations || locations.length === 0) {
    console.error('No locations data provided');
    return;
  }

  const [longStart, latStart] = locations[0].coordinates;

  const map = L.map('map', {
    scrollWheelZoom: false, // Disable scroll zoom
  }).setView([latStart, longStart], 6);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const bounds = L.latLngBounds();

  for (let i = locations.length - 1; i >= 0; i--) {
    const currLocation = locations[i];
    const [long, lat] = currLocation.coordinates;

    // Create custom icon
    const el = L.divIcon({
      className: 'marker',
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -40],
    });

    const marker = L.marker([lat, long], { icon: el }).addTo(map);

    marker
      .bindPopup(
        `<h1>Arrive on Day ${currLocation.day}</h1><br><h1>Location: ${currLocation.description}.</h1>`,
      )
      .openPopup();

    bounds.extend([lat, long]);
  }

  // Fit the map to the bounds
  map.fitBounds(bounds, {
    padding: [200, 100], // [top&bottom, left&right]
  });
};
