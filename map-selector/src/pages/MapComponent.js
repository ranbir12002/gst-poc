import React, { useRef, useEffect, useState, useContext } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import axios from 'axios';
import { UserContext } from '../context/UserContext';
import { GEOJSON_BACKEND_URL } from '../config';
import { decryptData } from '../utils/encryption';

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const MapComponent = ({ setFeatures, setSelectedFeature, setBusinessInfo, setBusinesses, circle, wards, businesses: propsBusinesses }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const { user } = useContext(UserContext);
  const [viewOption, setViewOption] = useState('wards');
  const [allWards, setAllWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localBusinesses, setLocalBusinesses] = useState([]);


  // Fetch all wards on mount (or use passed-in wards for circle detail view)
  useEffect(() => {
    if (wards && wards.length > 0) {
      console.log(`Setting map to ${wards.length} specific wards`);
      setAllWards(wards);
      setLoading(false);
    } else if (!circle && !wards?.length) {
      // Only fetch all wards if we are NOT in a specific circle view
      fetchAllWards();
    } else if (circle && wards?.length === 0) {
      // If we are in a circle view but wards haven't loaded yet, just wait
      setLoading(true);
    }
  }, [wards, circle]);


  const fetchAllWards = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${GEOJSON_BACKEND_URL}/api/v2/wards`);
      setAllWards(response.data.wards || []);
    } catch (error) {
      console.error('Error fetching wards:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize map once wards are loaded
  useEffect(() => {
    if (loading || allWards.length === 0 || !mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_STYLE,
      center: [78.4867, 17.3850],
      zoom: 11,
      antialias: true
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');

    map.on('load', () => {
      // Add wards GeoJSON source
      map.addSource('wards', {
        type: 'geojson',
        data: wardsToGeoJSON(allWards)
      });

      // Fill layer
      map.addLayer({
        id: 'wards-fill',
        type: 'fill',
        source: 'wards',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['get', 'hasCircle'], false],
            '#4caf50',   // Green if assigned to a circle
            '#2196f3'    // Blue if unassigned
          ],
          'fill-opacity': 0.25
        }
      });

      // Outline layer
      map.addLayer({
        id: 'wards-outline',
        type: 'line',
        source: 'wards',
        paint: {
          'line-color': '#0d47a1',
          'line-width': 1.5
        }
      });

      // Ward labels
      map.addLayer({
        id: 'wards-label',
        type: 'symbol',
        source: 'wards',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-anchor': 'center',
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#1a237e',
          'text-halo-color': '#fff',
          'text-halo-width': 1.5
        }
      });

      // Business source (empty initially)
      map.addSource('businesses', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // Business layer (visible when data is loaded)
      map.addLayer({
        id: 'businesses-circles',
        type: 'circle',
        source: 'businesses',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            10, ['case', ['boolean', ['feature-state', 'hover'], false], 6, 3],
            14, ['case', ['boolean', ['feature-state', 'hover'], false], 12, 6],
            18, ['case', ['boolean', ['feature-state', 'hover'], false], 24, 12]
          ],
          'circle-color': '#f44336',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': [
            'interpolate', ['linear'], ['zoom'],
            12, 1,
            15, 2
          ],
          'circle-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            1,
            0.8
          ]
        }
      });

      // Hover cursor and scaling effect
      let hoveredBusinessId = null;
      map.on('mousemove', 'businesses-circles', (e) => {
        if (e.features.length > 0) {
          if (hoveredBusinessId !== null) {
            map.setFeatureState(
              { source: 'businesses', id: hoveredBusinessId },
              { hover: false }
            );
          }
          hoveredBusinessId = e.features[0].id;
          map.setFeatureState(
            { source: 'businesses', id: hoveredBusinessId },
            { hover: true }
          );
          map.getCanvas().style.cursor = 'pointer';
        }
      });

      map.on('mouseleave', 'businesses-circles', () => {
        if (hoveredBusinessId !== null) {
          map.setFeatureState(
            { source: 'businesses', id: hoveredBusinessId },
            { hover: false }
          );
        }
        hoveredBusinessId = null;
        map.getCanvas().style.cursor = '';
      });

      // Unified click handler
      map.on('click', async (e) => {
        // 1. Check for businesses first
        const bizFeatures = map.queryRenderedFeatures(e.point, { layers: ['businesses-circles'] });
        if (bizFeatures.length > 0) {
          const props = bizFeatures[0].properties;
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: sans-serif; padding: 5px;">
                <strong style="color: #f44336;">${props.name}</strong><br/>
                <span style="font-size: 0.8rem; color: #666;">GSTIN: ${props.gstin}</span><br/>
                <span style="font-size: 0.75rem;">${props.address || ''}</span>
              </div>
            `)
            .addTo(map);
          return; // STOP HERE if business was clicked
        }

        // 2. Check for wards if no business was clicked
        const wardFeatures = map.queryRenderedFeatures(e.point, { layers: ['wards-fill'] });
        if (wardFeatures.length > 0) {
          const feature = wardFeatures[0];
          const props = feature.properties;

          if (setSelectedFeature) setSelectedFeature(feature);
          if (setFeatures) setFeatures([feature]);

          // Load businesses for this ward
          try {
            const targetId = props.wardId?.toString();
            const response = await axios.get(
              `${GEOJSON_BACKEND_URL}/api/v2/wards/${targetId}/businesses?limit=500`
            );
            
            const loadedBusinesses = decryptData(response.data.businesses) || [];
            if (setBusinesses) setBusinesses(loadedBusinesses);
            setLocalBusinesses(loadedBusinesses);

            if (setBusinessInfo) setBusinessInfo({
              wardName: props.name,
              wardNo: props.ward_no,
              total: response.data.total
            });
          } catch (err) {
            console.error('Error loading ward businesses:', err);
          }

          // Popup
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: sans-serif; min-width: 150px;">
                <strong>${props.name}</strong><br/>
                Ward No: ${props.ward_no}<br/>
                Circle: ${props.circle_name || 'Unassigned'}<br/>
                Businesses: ${props.business_count || 0}
              </div>
            `)
            .addTo(map);
        }
      });

      // Hover cursor
      map.on('mouseenter', 'wards-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'wards-fill', () => { map.getCanvas().style.cursor = ''; });

      // Fit bounds
      const bounds = new maplibregl.LngLatBounds();
      allWards.forEach(ward => {
        if (ward.geometry && ward.geometry.coordinates) {
          const coords = ward.geometry.type === 'MultiPolygon'
            ? ward.geometry.coordinates.flat(2)
            : ward.geometry.coordinates.flat(1);
          coords.forEach(coord => bounds.extend(coord));
        }
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 50 });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading]); // Only run on first load or when loading state resets

  // Update GeoJSON source when allWards changes
  useEffect(() => {
    if (mapRef.current && mapRef.current.getSource('wards')) {
      mapRef.current.getSource('wards').setData(wardsToGeoJSON(allWards));
      
      // Re-fit bounds if we have wards
      if (allWards.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        allWards.forEach(ward => {
          if (ward.geometry && ward.geometry.coordinates) {
            const coords = ward.geometry.type === 'MultiPolygon'
              ? ward.geometry.coordinates.flat(2)
              : ward.geometry.coordinates.flat(1);
            coords.forEach(coord => bounds.extend(coord));
          }
        });
        if (!bounds.isEmpty()) {
          mapRef.current.fitBounds(bounds, { padding: 50 });
        }
      }
    }
  }, [allWards]);

  // Sync businesses to map source
  useEffect(() => {
    if (mapRef.current && mapRef.current.getSource('businesses')) {
      const bizList = propsBusinesses || localBusinesses;
      const geojson = {
        type: 'FeatureCollection',
        features: bizList
          .filter(b => b.latitude && b.longitude)
          .map(b => ({
            type: 'Feature',
            id: b._id,
            geometry: {
              type: 'Point',
              coordinates: [b.longitude, b.latitude]
            },
            properties: {
              name: b.name,
              gstin: b.gstin,
              address: `${b.buildingName || ''} ${b.street || ''}`.trim()
            }
          }))
      };
      mapRef.current.getSource('businesses').setData(geojson);
    }
  }, [propsBusinesses, localBusinesses]);



  const wardsToGeoJSON = (wardsList) => ({
    type: 'FeatureCollection',
    features: wardsList
      .filter(w => w.geometry && w.geometry.coordinates)
      .map(ward => ({
        type: 'Feature',
        geometry: ward.geometry,
        properties: {
          wardId: ward._id,
          name: ward.NAME,
          ward_no: ward.WARD_NO,
          label: `${ward.WARD_NO}`,
          circle_name: ward.CIR_NAM_NU || (ward.circle?.CIR_NAM_NU) || null,
          hasCircle: !!(ward.circle || ward.CIR_NAM_NU),
          business_count: ward.business_count || 0
        }
      }))
  });

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      {loading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 2
        }}>
          <div style={{ textAlign: 'center' }}>
            <div>Loading map data...</div>
          </div>
        </div>
      )}
      {/* Legend overlay */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 1,
        backgroundColor: 'rgba(255,255,255,0.92)', padding: '10px 14px',
        borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 12
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Legend</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 14, height: 14, backgroundColor: '#2196f3', opacity: 0.5, display: 'inline-block', borderRadius: 2 }} />
          Unassigned Ward
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, backgroundColor: '#4caf50', opacity: 0.5, display: 'inline-block', borderRadius: 2 }} />
          Assigned to Circle
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
