const USE_PROXY = true; // use Node proxy for API key safety
const PROXY_BASE = "http://localhost:5000/api"; // proxy server

// DOM elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locBtn = document.getElementById('locBtn');
const downloadBtn = document.getElementById('downloadBtn');
const currentCard = document.getElementById('currentCard');
const weatherIcon = document.getElementById('weatherIcon');
const tempVal = document.getElementById('tempVal');
const cond = document.getElementById('cond');
const cityName = document.getElementById('cityName');
const feels = document.getElementById('feels');
const hum = document.getElementById('hum');
const wind = document.getElementById('wind');
const pressure = document.getElementById('pressure');
const visibilityEl = document.getElementById('visibility');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const timeInfo = document.getElementById('timeInfo');
const forecastRow = document.getElementById('forecastRow');
const alertBanner = document.getElementById('alertBanner');
const alertText = document.getElementById('alertText');
const historyList = document.getElementById('historyList');

// Features
let isCelsius = true; // toggle
let themeMode = 'dark'; // 'dark' or 'light'
let lastData = null;

// Event listeners
searchBtn.addEventListener('click', () => { const q = cityInput.value.trim(); if(q) searchCity(q); });
cityInput.addEventListener('keydown', e => { if(e.key==='Enter') searchBtn.click(); });
locBtn.addEventListener('click', useGeolocation);
downloadBtn.addEventListener('click', downloadPDF);

// Temperature toggle button
const tempToggle = document.createElement('button');
tempToggle.textContent = "°F";
tempToggle.style.marginLeft = '6px';
tempToggle.addEventListener('click', () => {
    if(!lastData) return;
    isCelsius = !isCelsius;
    tempToggle.textContent = isCelsius ? "°F" : "°C";
    updateTempDisplay();
});
document.querySelector('.controls').appendChild(tempToggle);

// Theme toggle button
const themeBtn = document.createElement('button');
themeBtn.textContent = "Theme";
themeBtn.id = "themeBtn"; // assign ID for reference
themeBtn.addEventListener('click', () => {
    themeMode = themeMode==='dark' ? 'light' : 'dark';
    applyTheme();
});
document.querySelector('.controls').appendChild(themeBtn);

// Initialization
loadHistory();
showWelcome();

// Welcome message
function showWelcome(){
  cityName.textContent = "Try 'Chennai', 'Mumbai', or use 📍";
  currentCard.classList.add('hide');
}

// Fetch helper
async function fetchJSON(url){
    const res = await fetch(url);
    if(!res.ok) throw new Error('Network response not ok');
    return res.json();
}

// Search city
async function searchCity(city){
    try{
        showLoading(true);
        const data = await fetchJSON(`${PROXY_BASE}/weather?city=${encodeURIComponent(city)}`);
        const fc = await fetchJSON(`${PROXY_BASE}/forecast?city=${encodeURIComponent(city)}`);
        renderWeather(data, fc);
        pushHistory(city);
    }catch(err){
        alert("City not found or API error.");
        console.error(err);
    }finally{ showLoading(false); }
}

// Search by coordinates
async function searchCoords(lat, lon){
    try{
        showLoading(true);
        const data = await fetchJSON(`${PROXY_BASE}/weather?lat=${lat}&lon=${lon}`);
        const fc = await fetchJSON(`${PROXY_BASE}/forecast?lat=${lat}&lon=${lon}`);
        renderWeather(data, fc);
        if(data.name) pushHistory(data.name);
    }catch(err){ 
        console.error(err); 
        alert("Unable to fetch weather for your location."); 
    } finally { showLoading(false); }
}

// Loading button
function showLoading(on){
    if(on){ searchBtn.textContent="Loading..."; searchBtn.disabled=true; }
    else{ searchBtn.textContent="Search"; searchBtn.disabled=false; }
}

// Render main weather
function renderWeather(data, forecast){
    lastData = {current:data, forecast};
    currentCard.classList.remove('hide');
    cityName.textContent = `${data.name}, ${data.sys.country || ''}`;
    cond.textContent = capitalize(data.weather[0].description);
    feels.textContent = `Feels like ${Math.round(data.main.feels_like)}°C`;
    hum.textContent = `Humidity ${data.main.humidity}%`;
    wind.textContent = data.wind.speed;
    pressure.textContent = data.main.pressure;
    visibilityEl.textContent = (data.visibility/1000).toFixed(1)+' km';
    sunriseEl.textContent = toLocalTimeString(data.sys.sunrise, data.timezone);
    sunsetEl.textContent = toLocalTimeString(data.sys.sunset, data.timezone);
    timeInfo.textContent = `Last updated: ${new Date().toLocaleString()}`;

    setIconAndBackground(data.weather[0]);
    updateTempDisplay();
    renderForecast(forecast.list);

    const maybeAlert = checkForAlerts(data, forecast);
    if(maybeAlert){ alertBanner.classList.remove('hidden'); alertText.textContent=maybeAlert; }
    else alertBanner.classList.add('hidden');
}

// Update temperature display
function renderForecast(list) {
  // Group by day
  const byDay = {};
  list.forEach(item => {
    const day = new Date(item.dt * 1000).toLocaleDateString();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(item);
  });

  // DAILY FORECAST (next 5 days)
  forecastRow.innerHTML = '';
  Object.keys(byDay).slice(0, 5).forEach(day => {
    const items = byDay[day];
    const pick = items[Math.floor(items.length / 2)];
    const d = new Date(pick.dt * 1000);
    const dayName = d.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
    const icon = pick.weather[0].main;
    const temp = isCelsius
      ? Math.round(pick.main.temp)
      : Math.round(pick.main.temp * 9 / 5 + 32);
    const desc = pick.weather[0].description;
    const elem = document.createElement('div');
    elem.className = 'card';
    elem.innerHTML = `
      <div class="day">${dayName}</div>
      <div class="iconSmall" aria-hidden="true">${emojiForWeather(icon, pick.weather[0].id)}</div>
      <div class="tempSmall">${temp}${isCelsius ? '°C' : '°F'}</div>
      <div class="smallDesc">${desc}</div>
    `;
    forecastRow.appendChild(elem);
  });

  // HOURLY FORECAST (next 12 hours)
  const hourlyForecastRow = document.getElementById('hourlyForecastRow');
  hourlyForecastRow.innerHTML = '';
  list.slice(0, 12).forEach(item => {
    const d = new Date(item.dt * 1000);
    const hour = d.getHours().toString().padStart(2, '0');
    const icon = item.weather[0].main;
    const temp = isCelsius
      ? Math.round(item.main.temp)
      : Math.round(item.main.temp * 9 / 5 + 32);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="day">${hour}:00</div>
      <div class="iconSmall">${emojiForWeather(icon, item.weather[0].id)}</div>
      <div class="tempSmall">${temp}${isCelsius ? '°C' : '°F'}</div>
    `;
    hourlyForecastRow.appendChild(card);
  });
}
// Update temperature values for the main card after unit toggle
function updateTempDisplay() {
  if (!lastData) return;
  const data = lastData.current;

  // Convert temperature if needed
  const temp = isCelsius
    ? Math.round(data.main.temp)
    : Math.round(data.main.temp * 9 / 5 + 32);

  const feelsTemp = isCelsius
    ? Math.round(data.main.feels_like)
    : Math.round(data.main.feels_like * 9 / 5 + 32);

  // Update the DOM
  tempVal.textContent = `${temp}${isCelsius ? '°C' : '°F'}`;
  feels.textContent = `Feels like ${feelsTemp}${isCelsius ? '°C' : '°F'}`;

  // Rerender forecast cards with new units
  if (lastData.forecast && lastData.forecast.list) {
    renderForecast(lastData.forecast.list);
  }
}



// Emoji helper
function emojiForWeather(main,id){
    if(id>=200 && id<300) return "⛈️";
    if(id>=300 && id<600) return "🌧️";
    if(id>=600 && id<700) return "❄️";
    if(id>=700 && id<800) return "🌫️";
    if(id===800) return "☀️";
    if(id===801) return "🌤️";
    return "☁️";
}

// Set icon and background
function setIconAndBackground(weather){
    const id = weather.id || 800;
    weatherIcon.textContent = emojiForWeather(weather.main,id);
    setBackground(id);
    applyTheme();  // re-apply to ensure text colors update
}

function setBackground(weatherId){
    let bg;
    if(weatherId>=200 && weatherId<600) bg='linear-gradient(180deg,#0b3a59,#06324a)';
    else if(weatherId>=600 && weatherId<700) bg='linear-gradient(180deg,#2b5b7a,#1c3f59)';
    else if(weatherId===800) bg='linear-gradient(180deg,#ffd86b,#66ccff)';
    else bg='linear-gradient(180deg,#334e68,#0f2b45)';

    // theme priority
    if(themeMode==='dark') bg='linear-gradient(180deg,#071029,#0f2b45)';
    else if(themeMode==='light') bg='linear-gradient(180deg,#e0f7fa,#b2ebf2)';

    document.body.style.background = bg;
    document.body.style.color = themeMode==='light' ? '#000' : '#e6eef8';
}

function applyTheme(){
    if(themeMode==='light'){
        document.body.classList.add('light');
        document.body.classList.remove('dark');
        document.querySelectorAll('.card, .controls input, .history, .alert-banner')
            .forEach(el => el.style.color = '#000');
    } else {
        document.body.classList.remove('light');
        document.body.classList.add('dark');
        document.querySelectorAll('.card, .controls input, .history, .alert-banner')
            .forEach(el => el.style.color = '#e6eef8');
    }
}


// Alerts
function checkForAlerts(current,forecast){
    const desc = current.weather[0].description || '';
    if(/storm|thunder|tornado|hurricane|cyclone|extreme/i.test(desc)) return `Severe condition: ${desc}`;
    const id = current.weather[0].id;
    if(id>=200 && id<300) return 'Thunderstorm detected — stay safe.';
    if(id>=900 && id<=962) return 'Extreme weather detected — follow advisories.';
    const heavy = forecast.list.slice(0,8).some(x=>x.weather[0].id>=500 && x.weather[0].id<532 && x.pop>0.5);
    if(heavy) return 'Heavy rain expected in next 24h — possible flooding.';
    return null;
}

// Geolocation
function useGeolocation(){
    if(!navigator.geolocation) return alert('Geolocation not supported.');
    navigator.geolocation.getCurrentPosition(
        pos => searchCoords(pos.coords.latitude,pos.coords.longitude),
        err => alert('Unable to get location: '+err.message),
        {timeout:10000}
    );
}

// History
function loadHistory(){ renderHistory(JSON.parse(localStorage.getItem('weather_history')||'[]')); }
function pushHistory(q){
    let arr=JSON.parse(localStorage.getItem('weather_history')||'[]');
    arr=[q,...arr.filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,6);
    localStorage.setItem('weather_history',JSON.stringify(arr));
    renderHistory(arr);
}
function renderHistory(arr){
    historyList.innerHTML='';
    arr.forEach(item=>{
        const li=document.createElement('li');
        li.innerHTML=`<span>${item}</span><button class="re">🔁</button>`;
        li.querySelector('span').addEventListener('click',()=>{ cityInput.value=item; searchCity(item); });
        li.querySelector('.re').addEventListener('click',()=>{ cityInput.value=item; searchCity(item); });
        historyList.appendChild(li);
    });
    if(arr.length===0) historyList.innerHTML=`<li style="opacity:.7">No recent searches</li>`;
}

// PDF export
async function downloadPDF(){
    if(!lastData) return alert('No data to export.');
    const s = document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(s);
    s.onload=()=>{
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({unit:'pt',format:'a4'});
        doc.setFontSize(18); doc.text(`Weather Report — ${lastData.current.name}`,40,60);
        doc.setFontSize(12);
        doc.text(`Temperature: ${Math.round(lastData.current.main.temp)} °C`,40,90);
        doc.text(`Condition: ${lastData.current.weather[0].description}`,40,110);
        doc.text(`Humidity: ${lastData.current.main.humidity}%`,40,130);
        doc.text(`Wind: ${lastData.current.wind.speed} m/s`,40,150);
        doc.save(`WeatherReport-${lastData.current.name}.pdf`);
    };
}

// Helpers
function toLocalTimeString(unix,tzSec=0){ return new Date((unix+(tzSec||0))*1000).toUTCString().replace('GMT',''); }
function capitalize(s){ return s[0].toUpperCase()+s.slice(1); }
