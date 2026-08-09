// Инициализация карты (центр на Украину)
const map = L.map('map', { zoomControl: false }).setView([48.3794, 31.1656], 6);

// Кнопки зума в правом нижнем углу
L.control.zoom({ position: 'bottomright' }).addTo(map);

// 1. Стандартная топографическая карта OpenStreetMap
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
});

// 2. Спутниковый слой (возвращаем обратно!)
const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
});

// Устанавливаем OSM карту по умолчанию
osmLayer.addTo(map);

// Переключатель слоев в правом верхнем углу (Спутник / Стандартная)
const baseLayers = {
    "🗺️ Стандартная": osmLayer,
    "🛰️ Спутник": satelliteLayer
};
L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

// Слой для хранения нарисованных элементов
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Инструменты рисования
const drawControl = new L.Control.Draw({
    position: 'topright',
    draw: {
        polygon: {
            allowIntersection: false,
            shapeOptions: { color: '#ff4444', fillColor: '#ff4444', fillOpacity: 0.3 }
        },
        polyline: {
            shapeOptions: { color: '#d4af37', weight: 4 }
        },
        rectangle: true,
        circle: false,
        marker: true,
        circlemarker: false
    },
    edit: {
        featureGroup: drawnItems,
        remove: true
    }
});
map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function (e) {
    drawnItems.addLayer(e.layer);
});

// Поиск городов
let currentCityLayer = null;
const geocoder = L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: '🔍 Поиск города...',
}).on('markgeocode', function(e) {
    const bbox = e.geocode.bbox;
    const name = e.geocode.name;
    
    map.fitBounds(bbox);

    if (currentCityLayer) {
        map.removeLayer(currentCityLayer);
    }

    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&polygon_geojson=1`)
        .then(response => response.json())
        .then(data => {
            const resultWithPolygon = data.find(item => item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon'));
            
            if (resultWithPolygon) {
                currentCityLayer = L.geoJSON(resultWithPolygon.geojson, {
                    style: { color: '#d4af37', weight: 3, opacity: 0.9, fillColor: '#d4af37', fillOpacity: 0.2 }
                }).addTo(map);

                currentCityLayer.bindPopup(`<b style="color:#d4af37;">${name}</b>`).openPopup();
            }
        })
        .catch(err => console.error('Ошибка загрузки границ:', err));
}).addTo(map);

// Установка текущей даты
const dateInput = document.getElementById('date-input');
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// Сворачивание панели
const collapseBtn = document.getElementById('collapse-btn');
const panelBody = document.getElementById('panel-body');
let isCollapsed = false;

if (collapseBtn && panelBody) {
    collapseBtn.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        panelBody.classList.toggle('collapsed', isCollapsed);
        collapseBtn.textContent = isCollapsed ? '▼' : '▲';
        collapseBtn.title = isCollapsed ? 'Развернуть' : 'Свернуть';
    });
}

// Кнопка «На весь экран»
const fullscreenBtn = document.getElementById('fullscreen-btn');
if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    });
}

// Принудительное обновление размеров карты
setTimeout(() => { map.invalidateSize(); }, 200);