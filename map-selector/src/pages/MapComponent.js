// import React, { useRef, useEffect, useState, useContext } from 'react';
// import mapboxgl from 'mapbox-gl';
// import MapboxDraw from '@mapbox/mapbox-gl-draw';
// import 'mapbox-gl/dist/mapbox-gl.css';
// import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
// import axios from 'axios';
// import { UserContext } from '../context/UserContext';


// mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

// const MapComponent = ({ setFeatures, setSelectedFeature, setBusinessInfo, setBusinesses, circle }) => {
//   const mapContainerRef = useRef(null);
//   const { user } = useContext(UserContext);

//   const mapRef = useRef(null);
//   const businessMarkersRef = useRef([]);
//   const drawRef = useRef(null);
//   const [viewOption, setViewOption] = useState('current');

//   useEffect(() => {
//     const initializeMap = async () => {
//       if (mapRef.current) return;

//       const map = new mapboxgl.Map({
//         container: mapContainerRef.current,
//         style: 'mapbox://styles/mapbox/streets-v12',
//         center: [78.4867, 17.3850],
//         zoom: 10,
//       });

//       mapRef.current = map;

//       const navControl = new mapboxgl.NavigationControl({
//         showCompass: false,
//       });
//       map.addControl(navControl, 'bottom-left');

//       const draw = new MapboxDraw({
//         displayControlsDefault: false,
//         controls: {
//           polygon: true,
//           trash: true,
//         },
//       });

//       drawRef.current = draw;
//       map.addControl(draw, 'top-left');

//       class ViewOptionsControl {
//         onAdd(map) {
//           this._map = map;
//           this._container = document.createElement('div');
//           this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

//           const options = [];
//           if (user.role === 'admin' || user.role === 'root') {
//             options.push(
//               { id: 'viewCurrent', label: 'View Current Circle', value: 'current' },
//               { id: 'viewAll', label: 'View All Circles', value: 'all' },
//               { id: 'viewRegion', label: 'View Region Circles', value: 'region' }
//             );
//           } else if (user.role === 'region') {
//             options.push(
//               { id: 'viewCurrent', label: 'View Current Circle', value: 'current' },
//               { id: 'viewRegion', label: 'View Region Circles', value: 'region' }
//             );
//           } else if (user.role === 'circle') {
//             options.push(
//               { id: 'viewCurrent', label: 'View Current Circle', value: 'current' }
//             );
//           }
//           this._container.innerHTML = `
//             <div style="background: white; padding: 10px; border-radius: 5px;">
//               ${options.map(option => `
//                 <div>
//                   <input type="radio" id="${option.id}" name="viewOption" value="${option.value}" ${viewOption === option.value ? 'checked' : ''}>
//                   <label for="${option.id}">${option.label}</label>
//                 </div>
//               `).join('')}
//             </div>
//           `;

//           this._container.querySelectorAll('input[name="viewOption"]').forEach((input) => {
//             input.addEventListener('change', (e) => {
//               setViewOption(e.target.value);
//             });
//           });

//           return this._container;
//         }

//         onRemove() {
//           this._container.parentNode.removeChild(this._container);
//           this._map = undefined;
//         }
//       }

//       const viewOptionsControl = new ViewOptionsControl();
//       map.addControl(viewOptionsControl, 'top-right');

//       map.on('draw.create', updateFeatures);
//       map.on('draw.delete', updateFeatures);
//       map.on('draw.update', updateFeatures);
//       map.on('draw.selectionchange', updateFeatures);

//       map.on('load', () => {
//         map.addSource('drawnPolygons', {
//           type: 'geojson',
//           data: draw.getAll(),
//         });

//         map.addLayer({
//           id: 'polygons-fill',
//           type: 'fill',
//           source: 'drawnPolygons',
//           paint: {
//             'fill-color': ['get', 'color'], // Use the color property for fill color
//             'fill-opacity': 0.3, // Reduce opacity to make routes visible
//           },
//         });

//         map.addLayer({
//           id: 'polygons-outline',
//           type: 'line',
//           source: 'drawnPolygons',
//           paint: {
//             'line-color': ['get', 'color'], // Use the same color for the outline
//             'line-width': 2,
//           },
//         });

//         if (circle && circle.geometry) {
//           const feature = {
//             type: 'Feature',
//             geometry: circle.geometry,
//             properties: {
//               _id: circle._id,
//               name: circle.name,
//               color: '#FF0000', // Example color
//             },
//           };
//           draw.add(feature);
//           const allFeatures = draw.getAll();
//           setFeatures(allFeatures);
//           map.getSource('drawnPolygons').setData(allFeatures); // Update source data

//           // Zoom into the polygon
//           const bounds = getPolygonBounds(feature);
//           if (bounds) {
//             map.fitBounds(bounds, { padding: 20 });
//           }
//         }
//       });

//       function updateFeatures(e) {
//         const features = draw.getAll();
//         setFeatures(features);
//         if (map.getSource('drawnPolygons')) {
//           map.getSource('drawnPolygons').setData(features); // Update source data
//         }

//         if (e.type === 'draw.update' || e.type === 'draw.selectionchange') {
//           const updatedPolygon = features.features.find((feature) => feature.id === e.features[0]?.id);
//           setSelectedFeature(updatedPolygon);
//         }
//       }

//       async function fetchBusinesses(polygon) {
//         try {
//           console.log('Fetching businesses for polygon:', polygon);

//           // Clear existing business markers
//           businessMarkersRef.current.forEach((marker) => {
//             marker.remove();
//           });
//           businessMarkersRef.current = []; // Clear the array

//           const response = await axios.post('http://localhost:4000/businesses', {
//             coordinates: polygon.geometry.coordinates[0],
//           });

//           const businesses = response.data;
//           setBusinesses(businesses); // Set businesses to the state in the parent component

//           console.log('Fetched businesses:', businesses.length);

//           // Convert businesses to GeoJSON format
//           const geojson = {
//             type: 'FeatureCollection',
//             features: businesses.map((business) => ({
//               type: 'Feature',
//               geometry: {
//                 type: 'Point',
//                 coordinates: business.location.coordinates,
//               },
//               properties: {
//                 name: business.name,
//                 id: business._id, // Assuming each business has a unique ID
//               },
//             })),
//           };

//           // Remove the previous businesses source and layers if they exist
//           if (mapRef.current.getSource('businesses')) {
//             mapRef.current.removeLayer('clusters');
//             mapRef.current.removeLayer('cluster-count');
//             mapRef.current.removeLayer('unclustered-point');
//             mapRef.current.removeSource('businesses');
//           }

//           // Add the business data as a source with clustering enabled
//           mapRef.current.addSource('businesses', {
//             type: 'geojson',
//             data: geojson,
//             cluster: true,
//             clusterMaxZoom: 14, // Max zoom to cluster points on
//             clusterRadius: 50, // Radius of each cluster when clustering points
//           });

//           // Add a layer to display the clusters
//           mapRef.current.addLayer({
//             id: 'clusters',
//             type: 'circle',
//             source: 'businesses',
//             filter: ['has', 'point_count'],
//             paint: {
//               'circle-color': '#51bbd6',
//               'circle-radius': [
//                 'step',
//                 ['get', 'point_count'],
//                 20,
//                 100,
//                 30,
//                 750,
//                 40,
//               ],
//             },
//           });

//           // Add a layer to display the cluster count
//           mapRef.current.addLayer({
//             id: 'cluster-count',
//             type: 'symbol',
//             source: 'businesses',
//             filter: ['has', 'point_count'],
//             layout: {
//               'text-field': '{point_count_abbreviated}',
//               'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
//               'text-size': 12,
//             },
//           });

//           // Add a layer to display individual points
//           mapRef.current.addLayer({
//             id: 'unclustered-point',
//             type: 'circle',
//             source: 'businesses',
//             filter: ['!', ['has', 'point_count']],
//             paint: {
//               'circle-color': '#11b4da',
//               'circle-radius': 10,
//               'circle-stroke-width': 1,
//               'circle-stroke-color': '#fff',
//             },
//           });

//           // Inspect a cluster on click
//           mapRef.current.on('click', 'clusters', (e) => {
//             const features = mapRef.current.queryRenderedFeatures(e.point, {
//               layers: ['clusters'],
//             });
//             const clusterId = features[0].properties.cluster_id;
//             mapRef.current.getSource('businesses').getClusterExpansionZoom(clusterId, (err, zoom) => {
//               if (err) return;

//               mapRef.current.easeTo({
//                 center: features[0].geometry.coordinates,
//                 zoom: zoom,
//               });
//             });
//           });

//           // When a click event occurs on a feature in the unclustered-point layer, fetch detailed business information.
//           mapRef.current.on('click', 'unclustered-point', async (e) => {
//             try {
//               if (!e.features || e.features.length === 0) {
//                 console.error('No features found in the event.');
//                 return;
//               }

//               const feature = e.features[0];
//               const businessId = feature.properties.id;
//               console.log('Clicked business ID:', businessId);
//               // Fetch business details
//               const response = await axios.get(`http://localhost:4000/business/${businessId}`);
//               const businessDetails = response.data;
//               setBusinessInfo(businessDetails);

//               const coordinates = feature.geometry?.coordinates;
//               if (!coordinates || coordinates.length === 0) {
//                 console.error('Coordinates are undefined or empty');
//                 return;
//               }

//               const { name } = feature.properties;
//               console.log('Business coordinates:', coordinates);
//               console.log('Business name:', name);

//               while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
//                 coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
//               }

//               new mapboxgl.Popup()
//                 .setLngLat(coordinates)
//                 .setHTML(`<strong>${name}</strong>`)
//                 .addTo(mapRef.current);

//             } catch (error) {
//               console.error('Error handling click event:', error);
//             }
//           });


//           mapRef.current.on('mouseenter', 'clusters', () => {
//             mapRef.current.getCanvas().style.cursor = 'pointer';
//           });
//           mapRef.current.on('mouseleave', 'clusters', () => {
//             mapRef.current.getCanvas().style.cursor = '';
//           });

//         } catch (error) {
//           console.error('Error fetching businesses:', error);
//         }
//       }

//       let clickedOnMarker = false;

//       map.on('click', 'unclustered-point', (e) => {
//         clickedOnMarker = true;
//       });

//       map.on('click', (e) => {
//         if (clickedOnMarker) {
//           clickedOnMarker = false;
//           return;
//         }
//         console.log('Map clicked at:', e.point);

//         const features = map.queryRenderedFeatures(e.point, {
//           layers: ['gl-draw-polygon-fill-inactive.cold', 'gl-draw-polygon-fill-active.cold', 'gl-draw-polygon-fill-inactive.hot', 'gl-draw-polygon-fill-active.hot'],
//         });

//         console.log('Queried features:', features);

//         if (features.length) {
//           const feature = features[0];
//           const featureId = feature.properties && (feature.properties._id || feature.properties.id || feature.id);

//           if (featureId) {
//             const selectedPolygon = draw.get(featureId);
//             if (selectedPolygon) {
//               console.log('clicked on polygon');
//               // Zoom into the polygon
//               const bounds = getPolygonBounds(selectedPolygon);
//               if (bounds) {
//                 mapRef.current.fitBounds(bounds, { padding: 20 });
//               }

//               fetchBusinesses(selectedPolygon);
//               console.log('Fetching businesses for polygon:', selectedPolygon);

//               setSelectedFeature(selectedPolygon);
//             } else {
//               console.error('No polygon found with the given featureId:', featureId);
//             }
//           } else {
//             console.error('Feature does not have a valid id:', feature);
//           }
//         } else {
//           console.error('No features found at clicked point');
//         }
//       });
//     };

//     initializeMap();
//   }, [setFeatures, setSelectedFeature, setBusinessInfo, circle]);

//   useEffect(() => {
//     filterCircles();
//     // setBusinesses([])
//   }, [viewOption]);

//   const filterCircles = async () => {
//     const draw = drawRef.current;
//     if (!mapRef.current.getSource('drawnPolygons')) {
//       return;
//     }

//     let features = [];

//     if (viewOption === 'current' && circle) {
//       const feature = {
//         type: 'Feature',
//         geometry: circle.geometry,
//         properties: {
//           _id: circle._id,
//           name: circle.name,
//           color: '#FF0000', // Example color
//         },
//       };
//       features = [feature];
//     } else if (viewOption === 'all') {
//       try {
//         const response = await axios.get('http://localhost:4000/polygons');
//         features = response.data.map(polygon => ({
//           ...polygon,
//           properties: {
//             ...polygon.properties,
//             color: getRandomColor(), // Add random color property
//           },
//         }));
//       } catch (error) {
//         console.error('Error fetching all circles:', error);
//       }
//     } else if (viewOption === 'region' && circle.region) {
//       try {
//         const response = await axios.get(`/api/circles/${circle._id}/related-circles`, {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem('token')}`,
//           },
//         });
//         features = response.data.map(polygon => ({
//           ...polygon,
//           properties: {
//             ...polygon.properties,
//             color: getRandomColor(), // Add random color property
//           },
//         }));
//       } catch (error) {
//         console.error('Error fetching region circles:', error);
//       }
//     }

//     draw.deleteAll();
//     features.forEach(feature => draw.add(feature));
//     setFeatures(draw.getAll());
//     mapRef.current.getSource('drawnPolygons').setData(draw.getAll());
//   };

//   function getPolygonBounds(polygon) {
//     const coordinates = polygon.geometry.coordinates[0];
//     if (!coordinates || coordinates.length === 0) {
//       console.error('Coordinates are undefined or empty');
//       return null;
//     }
//     const bounds = coordinates.reduce((bounds, coord) => {
//       return bounds.extend(coord);
//     }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
//     return bounds;
//   }

//   function getRandomColor() {
//     const letters = '0123456789ABCDEF';
//     let color = '#';
//     for (let i = 0; i < 6; i++) {
//       color += letters[Math.floor(Math.random() * 16)];
//     }
//     return color;
//   }

//   return (
//     <div style={{ height: '100%', width: '100%' }}>
//       <div ref={mapContainerRef} className="map-container" style={{ height: '100%', width: '100%' }} />
//     </div>
//   );
// };

// export default MapComponent;

import React, { useRef, useEffect, useState, useContext } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import axios from 'axios';
import { UserContext } from '../context/UserContext';
import { BACKEND_URL, GEOJSON_BACKEND_URL } from '../config';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const MapComponent = ({ setFeatures, setSelectedFeature, setBusinessInfo, setBusinesses, circle }) => {
  const mapContainerRef = useRef(null);
  const { user } = useContext(UserContext);

  const mapRef = useRef(null);
  const businessMarkersRef = useRef([]);
  const drawRef = useRef(null);
  const [viewOption, setViewOption] = useState('current');
  console.log(
    setFeatures, setSelectedFeature, setBusinessInfo, setBusinesses, circle
  )
  useEffect(() => {
    const initializeMap = async () => {
      if (mapRef.current) return;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [78.4867, 17.3850],
        zoom: 10,
      });

      mapRef.current = map;

      const navControl = new mapboxgl.NavigationControl({
        showCompass: false,
      });
      map.addControl(navControl, 'bottom-left');

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
      });

      drawRef.current = draw;
      map.addControl(draw, 'top-left');

      class ViewOptionsControl {
        onAdd(map) {
          this._map = map;
          this._container = document.createElement('div');
          this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

          const options = [];
          if (user.role === 'admin' || user.role === 'root') {
            options.push(
              { id: 'viewCurrent', label: 'View Current Circle', value: 'current' },
              { id: 'viewAll', label: 'View All Circles', value: 'all' },
              { id: 'viewRegion', label: 'View Region Circles', value: 'region' }
            );
          } else if (user.role === 'region') {
            options.push(
              { id: 'viewCurrent', label: 'View Current Circle', value: 'current' },
              { id: 'viewRegion', label: 'View Region Circles', value: 'region' }
            );
          } else if (user.role === 'circle') {
            options.push(
              { id: 'viewCurrent', label: 'View Current Circle', value: 'current' }
            );
          }
          this._container.innerHTML = `
            <div style="background: white; padding: 10px; border-radius: 5px;">
              ${options.map(option => `
                <div>
                  <input type="radio" id="${option.id}" name="viewOption" value="${option.value}" ${viewOption === option.value ? 'checked' : ''}>
                  <label for="${option.id}">${option.label}</label>
                </div>
              `).join('')}
            </div>
          `;

          this._container.querySelectorAll('input[name="viewOption"]').forEach((input) => {
            input.addEventListener('change', (e) => {
              setViewOption(e.target.value);
            });
          });

          return this._container;
        }

        onRemove() {
          this._container.parentNode.removeChild(this._container);
          this._map = undefined;
        }
      }

      const viewOptionsControl = new ViewOptionsControl();
      map.addControl(viewOptionsControl, 'top-right');

      map.on('draw.create', updateFeatures);
      map.on('draw.delete', updateFeatures);
      map.on('draw.update', updateFeatures);
      map.on('draw.selectionchange', updateFeatures);

      map.on('load', () => {
        map.addSource('drawnPolygons', {
          type: 'geojson',
          data: draw.getAll(),
        });

        map.addLayer({
          id: 'polygons-fill',
          type: 'fill',
          source: 'drawnPolygons',
          paint: {
            'fill-color': ['get', 'color'], // Use the color property for fill color
            'fill-opacity': 0.3, // Reduce opacity to make routes visible
          },
        });

        map.addLayer({
          id: 'polygons-outline',
          type: 'line',
          source: 'drawnPolygons',
          paint: {
            'line-color': ['get', 'color'], // Use the same color for the outline
            'line-width': 2,
          },
        });

        if (circle && circle.geometry) {
          const feature = {
            type: 'Feature',
            geometry: circle.geometry,
            properties: {
              _id: circle._id,
              name: circle.name,
              color: '#FF0000', // Example color
            },
          };
          draw.add(feature);
          const allFeatures = draw.getAll();
          setFeatures(allFeatures);
          map.getSource('drawnPolygons').setData(allFeatures); // Update source data

          // Zoom into the polygon
          const bounds = getPolygonBounds(feature);
          if (bounds) {
            map.fitBounds(bounds, { padding: 20 });
          }
        }
      });

      function updateFeatures(e) {
        const features = draw.getAll();
        setFeatures(features);
        if (map.getSource('drawnPolygons')) {
          map.getSource('drawnPolygons').setData(features); // Update source data
        }

        if (e.type === 'draw.update' || e.type === 'draw.selectionchange') {
          const updatedPolygon = features.features.find((feature) => feature.id === e.features[0]?.id);
          setSelectedFeature(updatedPolygon);
        }
      }

      async function fetchBusinesses(polygon) {
        try {
          console.log('Fetching businesses for polygon:', polygon);

          // Clear existing business markers
          businessMarkersRef.current.forEach((marker) => {
            marker.remove();
          });
          businessMarkersRef.current = []; // Clear the array

          const response = await axios.post(`${GEOJSON_BACKEND_URL}/businesses`, {
            coordinates: polygon.geometry.coordinates[0],
          });

          const businesses = response.data;
          setBusinesses(businesses); // Set businesses to the state in the parent component

          console.log('Fetched businesses:', businesses.length);

          // Convert businesses to GeoJSON format
          const geojson = {
            type: 'FeatureCollection',
            features: businesses.map((business) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: business.location.coordinates,
              },
              properties: {
                name: business.name,
                id: business._id, // Assuming each business has a unique ID
              },
            })),
          };

          // Remove the previous businesses source and layers if they exist
          if (mapRef.current.getSource('businesses')) {
            mapRef.current.removeLayer('clusters');
            mapRef.current.removeLayer('cluster-count');
            mapRef.current.removeLayer('unclustered-point');
            mapRef.current.removeSource('businesses');
          }

          // Add the business data as a source with clustering enabled
          mapRef.current.addSource('businesses', {
            type: 'geojson',
            data: geojson,
            cluster: true,
            clusterMaxZoom: 14, // Max zoom to cluster points on
            clusterRadius: 50, // Radius of each cluster when clustering points
          });

          // Add a layer to display the clusters
          mapRef.current.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'businesses',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#51bbd6',
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                20,
                100,
                30,
                750,
                40,
              ],
            },
          });

          // Add a layer to display the cluster count
          mapRef.current.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'businesses',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12,
            },
          });

          // Add a layer to display individual points
          mapRef.current.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'businesses',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': '#11b4da',
              'circle-radius': 10,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff',
            },
          });

          // Inspect a cluster on click
          mapRef.current.on('click', 'clusters', (e) => {
            const features = mapRef.current.queryRenderedFeatures(e.point, {
              layers: ['clusters'],
            });
            const clusterId = features[0].properties.cluster_id;
            mapRef.current.getSource('businesses').getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return;

              mapRef.current.easeTo({
                center: features[0].geometry.coordinates,
                zoom: zoom,
              });
            });
          });

          // When a click event occurs on a feature in the unclustered-point layer, fetch detailed business information.
          mapRef.current.on('click', 'unclustered-point', async (e) => {
            try {
              if (!e.features || e.features.length === 0) {
                console.error('No features found in the event.');
                return;
              }

              const feature = e.features[0];
              const businessId = feature.properties.id;
              console.log('Clicked business ID:', businessId);
              // Fetch business details
              const response = await axios.get(`${GEOJSON_BACKEND_URL}/business/${businessId}`);
              const businessDetails = response.data;
              setBusinessInfo(businessDetails);

              const coordinates = feature.geometry?.coordinates;
              if (!coordinates || coordinates.length === 0) {
                console.error('Coordinates are undefined or empty');
                return;
              }

              const { name } = feature.properties;
              console.log('Business coordinates:', coordinates);
              console.log('Business name:', name);

              while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
              }

              new mapboxgl.Popup()
                .setLngLat(coordinates)
                .setHTML(`<strong>${name}</strong>`)
                .addTo(mapRef.current);

            } catch (error) {
              console.error('Error handling click event:', error);
            }
          });

          mapRef.current.on('mouseenter', 'clusters', () => {
            mapRef.current.getCanvas().style.cursor = 'pointer';
          });
          mapRef.current.on('mouseleave', 'clusters', () => {
            mapRef.current.getCanvas().style.cursor = '';
          });

          // Add draggable markers
          businesses.forEach((business) => {
            const marker = new mapboxgl.Marker({ draggable: true })
              .setLngLat(business.location.coordinates)
              .addTo(map);

            businessMarkersRef.current.push(marker);

            let initialCoordinates = business.location.coordinates;

            marker.on('dragstart', () => {
              initialCoordinates = marker.getLngLat().toArray();
            });

            marker.on('dragend', () => {
              const newCoordinates = marker.getLngLat().toArray();
              if (!booleanPointInPolygon(newCoordinates, polygon)) {
                // Revert marker position if it's outside the polygon
                marker.setLngLat(initialCoordinates);
                alert('Marker must stay within the polygon.');
              } else {
                // Update the marker's position in the state or backend
                axios.put(`${GEOJSON_BACKEND_URL}/business/${business._id}`, {
                  coordinates: newCoordinates,
                }).then(response => {
                  console.log('Marker position updated:', response.data);
                }).catch(error => {
                  console.error('Error updating marker position:', error);
                });
              }
            });
          });

        } catch (error) {
          console.error('Error fetching businesses:', error);
        }
      }

      let clickedOnMarker = false;

      map.on('click', 'unclustered-point', (e) => {
        clickedOnMarker = true;
      });

      map.on('click', (e) => {
        if (clickedOnMarker) {
          clickedOnMarker = false;
          return;
        }
        console.log('Map clicked at:', e.point);

        const features = map.queryRenderedFeatures(e.point, {
          layers: ['gl-draw-polygon-fill-inactive.cold', 'gl-draw-polygon-fill-active.cold', 'gl-draw-polygon-fill-inactive.hot', 'gl-draw-polygon-fill-active.hot'],
        });

        console.log('Queried features:', features);

        if (features.length) {
          const feature = features[0];
          const featureId = feature.properties && (feature.properties._id || feature.properties.id || feature.id);

          if (featureId) {
            const selectedPolygon = draw.get(featureId);
            if (selectedPolygon) {
              console.log('clicked on polygon');
              // Zoom into the polygon
              const bounds = getPolygonBounds(selectedPolygon);
              if (bounds) {
                mapRef.current.fitBounds(bounds, { padding: 20 });
              }

              fetchBusinesses(selectedPolygon);
              console.log('Fetching businesses for polygon:', selectedPolygon);

              setSelectedFeature(selectedPolygon);
            } else {
              console.error('No polygon found with the given featureId:', featureId);
            }
          } else {
            console.error('Feature does not have a valid id:', feature);
          }
        } else {
          console.error('No features found at clicked point');
        }
      });
    };

    initializeMap();
  }, [setFeatures, setSelectedFeature, setBusinessInfo, circle]);

  useEffect(() => {
    filterCircles();
    // setBusinesses([])
  }, [viewOption]);

  const filterCircles = async () => {
    const draw = drawRef.current;
    if (!mapRef.current.getSource('drawnPolygons')) {
      return;
    }

    let features = [];

    if (viewOption === 'current' && circle) {
      const feature = {
        type: 'Feature',
        geometry: circle.geometry,
        properties: {
          _id: circle._id,
          name: circle.name,
          color: '#FF0000', // Example color
        },
      };
      features = [feature];
    } else if (viewOption === 'all') {
      try {
        const response = await axios.get(`${GEOJSON_BACKEND_URL}/polygons`);
        features = response.data.map(polygon => ({
          ...polygon,
          properties: {
            ...polygon.properties,
            color: getRandomColor(), // Add random color property
          },
        }));
      } catch (error) {
        console.error('Error fetching all circles:', error);
      }
    } else if (viewOption === 'region' && circle.region) {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/circles/${circle._id}/related-circles`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        features = response.data.map(polygon => ({
          ...polygon,
          properties: {
            ...polygon.properties,
            color: getRandomColor(), // Add random color property
          },
        }));
      } catch (error) {
        console.error('Error fetching region circles:', error);
      }
    }

    draw.deleteAll();
    features.forEach(feature => draw.add(feature));
    setFeatures(draw.getAll());
    mapRef.current.getSource('drawnPolygons').setData(draw.getAll());
  };

  function getPolygonBounds(polygon) {
    const coordinates = polygon.geometry.coordinates[0];
    if (!coordinates || coordinates.length === 0) {
      console.error('Coordinates are undefined or empty');
      return null;
    }
    const bounds = coordinates.reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
    return bounds;
  }

  function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <div ref={mapContainerRef} className="map-container" style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export default MapComponent;
