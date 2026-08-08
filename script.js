
var map = L.map('map').setView([48.3794, 31.1656], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19}).addTo(map);

var mapHistory = JSON.parse(localStorage.getItem('mapData') || '{}');
var currentDate = "2026-08-07";

var drawnItems = new L.FeatureGroup().addTo(map);

// Точная настройка стилей (буферка теперь цвета DeepState)
function getStyleConfig(zoneType) {
    if (zoneType === "1") {
        return { color: '#c0392b', weight: 2, fillColor: '#e74c3c', fillOpacity: 0.4, dashArray: null };
    } else if (zoneType === "2") {
        return { color: '#2980b9', weight: 2, fillColor: '#3498db', fillOpacity: 0.4, dashArray: null };
    } else if (zoneType === "3") {
        return { color: '#962d22', weight: 3, fillColor: '#e74c3c', fillOpacity: 0.6, dashArray: '8, 12' };
    } else if (zoneType === "4") {
        return { color: '#1b4f72', weight: 3, fillColor: '#3498db', fillOpacity: 0.6, dashArray: '8, 12' };
    } else if (zoneType === "5") {
        // Цвет буферной зоны как на DeepState (серо-коричневатый оттенок)
        return { color: '#6d655f', weight: 2, fillColor: '#8c827a', fillOpacity: 0.6, dashArray: '6, 8' };
    }
    return { color: '#3388ff', weight: 2, fillOpacity: 0.4 };
}

function renderShapes(date) {
    drawnItems.clearLayers();
    var data = mapHistory[date] || [];
    data.forEach(item => {
        var layer;
        if (item.type === 'rectangle') {
            layer = L.rectangle(item.coords, item.style);
        } else if (item.type === 'polygon') {
            layer = L.polygon(item.coords, item.style);
        } else if (item.type === 'polyline') {
            layer = L.polyline(item.coords, item.style);
        } else if (item.type === 'marker') {
            layer = L.marker(item.coords);
            if (item.text) layer.bindPopup(item.text);
        }
        
        if (layer) {
            layer.zoneTypeCode = item.zoneTypeCode || "1";
            
            if (!(layer instanceof L.Marker) && localStorage.getItem('isAdmin') === 'true') {
                layer.on('click', function(e) {
                    L.DomEvent.stopPropagation(e);
                    var newType = prompt(
                        "Изменить тип/цвет зоны:\n" +
                        "1 - ВС РФ (Сплошной красный)\n" +
                        "2 - ВСУ (Сплошной синий)\n" +
                        "3 - Продвижение ВС РФ (Красный штрих)\n" +
                        "4 - Продвижение ВСУ (Синий штрих)\n" +
                        "5 - Буферная зона (Цвет DeepState)",
                        layer.zoneTypeCode
                    );
                    if (newType) {
                        var newCfg = getStyleConfig(newType);
                        layer.zoneTypeCode = newType;
                        layer.setStyle(newCfg);
                        saveCurrentState();
                    }
                });
            }
            drawnItems.addLayer(layer);
        }
    });
}

renderShapes(currentDate);

var drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnItems, remove: true },
    draw: { 
        polygon: { allowIntersection: false, showArea: true }, 
        polyline: { shapeOptions: { weight: 4 } }, 
        rectangle: true, 
        circle: false, 
        marker: true, 
        circlemarker: false 
    }
});

if (localStorage.getItem('isAdmin') === 'true') {
    map.addControl(drawControl);
}

function saveCurrentState() {
    var list = [];
    drawnItems.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            list.push({
                type: 'marker', 
                coords: layer.getLatLng(), 
                text: layer.getPopup() ? layer.getPopup().getContent() : ''
            });
        } else if (layer instanceof L.Rectangle) {
            list.push({type: 'rectangle', coords: layer.getBounds(), style: layer.options, zoneTypeCode: layer.zoneTypeCode});
        } else if (layer instanceof L.Polygon) {
            list.push({type: 'polygon', coords: layer.getLatLngs(), style: layer.options, zoneTypeCode: layer.zoneTypeCode});
        } else if (layer instanceof L.Polyline) {
            list.push({type: 'polyline', coords: layer.getLatLngs(), style: layer.options, zoneTypeCode: layer.zoneTypeCode});
        }
    });
    mapHistory[currentDate] = list;
    localStorage.setItem('mapData', JSON.stringify(mapHistory));
}

map.on('draw:created', function(e) {
    var layer = e.layer;

    if (e.layerType === 'marker') {
        var markerText = prompt("Введите текст для маркера:", "Опорник");
        if (markerText) layer.bindPopup(markerText);
    } else {
        var zoneType = prompt(
            "Выберите тип зоны:\n" +
            "1 - ВС РФ (Красный)\n" +
            "2 - ВСУ (Синий)\n" +
            "3 - Продвижение ВС РФ (Штрих)\n" +
            "4 - Продвижение ВСУ (Штрих)\n" +
            "5 - Буферная зона (Цвет DeepState)", 
            "1"
        );
        
        var cfg = getStyleConfig(zoneType);
        layer.zoneTypeCode = zoneType;
        layer.setStyle(cfg);

        layer.on('click', function(ev) {
            L.DomEvent.stopPropagation(ev);
            if (localStorage.getItem('isAdmin') !== 'true') return;
            var nt = prompt("Изменить тип/цвет зоны (1-5):", layer.zoneTypeCode);
            if (nt) {
                var nc = getStyleConfig(nt);
                layer.zoneTypeCode = nt;
                layer.setStyle(nc);
                saveCurrentState();
            }
        });
    }

    drawnItems.addLayer(layer);
    saveCurrentState();
});

map.on('draw:edited draw:deleted', function() {
    saveCurrentState();
});

var panel = L.control({position: 'topleft'});
panel.onAdd = function() {
    var div = L.DomUtil.create('div', 'panel');
    div.style.background = 'rgba(30,30,30,0.95)'; div.style.color = 'white';
    div.style.padding = '12px'; div.style.borderRadius = '8px';
    div.style.fontFamily = 'sans-serif'; div.style.fontSize = '12px';
    div.innerHTML = `
        <b>WinterMap / Фронт</b><br><br>
        Дата: <input type="date" id="dateInput" value="${currentDate}" style="background:#222; color:white; border:1px solid #555; padding:3px;"><br><br>
        <button onclick="switchDate()" style="background:#0984e3; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;">Переключить день</button>
        <button onclick="login()" style="background:#636e72; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; float:right;">Админ</button>
    `;
    return div;
};
panel.addTo(map);

window.switchDate = function() {
    saveCurrentState();
    var newDate = document.getElementById('dateInput').value;
    
    if (!mapHistory[newDate]) {
        mapHistory[newDate] = JSON.parse(JSON.stringify(mapHistory[currentDate] || []));
    }
    
    currentDate = newDate;
    renderShapes(currentDate);
    localStorage.setItem('mapData', JSON.stringify(mapHistory));
};

window.login = function() {
    if(prompt("Пароль администратора:") === "45987") {
        localStorage.setItem('isAdmin', 'true');
        location.reload();
    } else {
        alert("Неверный пароль!");
    }
};