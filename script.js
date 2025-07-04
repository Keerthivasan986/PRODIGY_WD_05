// script.js

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const useLocationBtn = document.getElementById('useLocationBtn');
const weatherDisplay = document.querySelector('.weather-display');
const cityNameElem = document.getElementById('cityName');
const feelsLikeElem = document.getElementById('feelsLike');
const humidityElem = document.getElementById('humidity');
const windSpeedElem = document.getElementById('windSpeed');
const pressureElem = document.getElementById('pressure');
const visibilityElem = document.getElementById('visibility');
const uvIndexElem = document.getElementById('uvIndex');
const todayForecastCard = document.getElementById('todayForecastCard');
const forecastContainer = document.getElementById('forecastContainer');
const errorMessageElem = document.getElementById('errorMessage');
const loadingSpinner = document.querySelector('.loading-spinner');

// IMPORTANT: Your OpenWeatherMap API key (for weather data)
// Make sure this key is correct and active.
const OPENWEATHER_API_KEY = '53240cdb3bb06c5a1d22e8ff0607893c';

// --- Utility Functions for UI State ---

function showMessage(element, message, isError = true) {
    element.textContent = message;
    element.classList.add('show');
    if (isError) {
        element.classList.add('error-message');
    } else {
        element.classList.remove('error-message');
    }
    element.style.display = 'block';
}

function hideMessage(element) {
    element.classList.remove('show');
    setTimeout(() => {
        element.textContent = '';
        element.classList.remove('error-message');
        element.style.display = 'none';
    }, 500);
}

function showLoading() {
    loadingSpinner.style.display = 'flex';
    weatherDisplay.classList.remove('show');
    hideMessage(errorMessageElem);
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function showWeatherDisplay() {
    weatherDisplay.classList.add('show');
}

function hideWeatherDisplay() {
    weatherDisplay.classList.remove('show');
    cityNameElem.textContent = '';
    feelsLikeElem.textContent = '';
    humidityElem.textContent = '';
    windSpeedElem.textContent = '';
    pressureElem.textContent = '';
    visibilityElem.textContent = '';
    uvIndexElem.textContent = '';
    todayForecastCard.innerHTML = '';
    todayForecastCard.classList.remove('fade-in');
    forecastContainer.innerHTML = '';
}


// --- Fetching Weather Data ---

async function getWeatherDataByCity(city) {
    showLoading();
    hideWeatherDisplay();
    try {
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${OPENWEATHER_API_KEY}`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (geoData.length === 0) {
            showMessage(errorMessageElem, 'City not found. Please check the spelling and try again.');
            return;
        }

        const { lat, lon, name } = geoData[0];
        cityNameElem.textContent = name; // For city search, we just use the city name from OpenWeatherMap
        await fetchAndDisplayWeather(lat, lon);

    } catch (error) {
        console.error('Error fetching weather by city:', error);
        showMessage(errorMessageElem, 'Failed to fetch city information. Please check your API key or try again later.');
    } finally {
        hideLoading();
    }
}

async function fetchAndDisplayWeather(lat, lon) {
    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;

        const [weatherResponse, forecastResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);

        if (!weatherResponse.ok || !forecastResponse.ok) {
            const errorDetails = await (weatherResponse.ok ? forecastResponse : weatherResponse).json();
            throw new Error(`API error! Status: ${weatherResponse.status || forecastResponse.status}, Message: ${errorDetails.message || 'Unknown error'}`);
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();

        displayTodayForecastCard(weatherData);
        displayCurrentWeather(weatherData);
        displayForecast(forecastData);

        showWeatherDisplay();
        hideMessage(errorMessageElem);

    } catch (error) {
        console.error('Error fetching and displaying weather data:', error);
        let msg = 'Failed to fetch weather data. Please check your internet connection or try again later.';
        if (error.message.includes('401')) {
            msg = 'Authentication error. Please check your OpenWeatherMap API key.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            msg = 'Weather data not found for this location. Try another city.';
        }
        showMessage(errorMessageElem, msg);
        hideWeatherDisplay();
    } finally {
        hideLoading();
    }
}

// --- Display Functions ---

function displayCurrentWeather(data) {
    // Current temperature (from main.temp) and Feels Like (from main.feels_like)
    feelsLikeElem.textContent = `${Math.round(data.main.feels_like)}°C`;
    humidityElem.textContent = `${data.main.humidity}%`;
    windSpeedElem.textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
    pressureElem.textContent = `${data.main.pressure} hPa`;
    visibilityElem.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    uvIndexElem.textContent = 'N/A'; // OpenWeatherMap current weather does not directly provide UV Index
}

function displayTodayForecastCard(data) {
    todayForecastCard.innerHTML = '';
    const todayDate = new Date();
    const dayName = todayDate.toLocaleDateString('en-US', { weekday: 'short' });
    const temp = Math.round(data.main.temp); // Current temperature
    const description = data.weather[0].description;
    const iconCode = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

    todayForecastCard.innerHTML = `
        <p class="day">${dayName}</p>
        <img src="${iconUrl}" alt="${description}" class="icon">
        <p class="temp">${temp}°C / ${temp}°C</p> <p>${description}</p>
    `;
    todayForecastCard.classList.add('fade-in');
}

function displayForecast(data) {
    forecastContainer.innerHTML = '';

    const dailyForecasts = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        date.setHours(0, 0, 0, 0);

        // Skip today's data as it's handled by displayTodayForecastCard
        if (date.getTime() === today.getTime()) {
            return;
        }

        const dayKey = date.toISOString().slice(0, 10);
        const hour = new Date(item.dt * 1000).getHours();

        // Select the forecast for midday (around 12-3 PM) for each day for consistency
        if (!dailyForecasts[dayKey] || (hour >= 12 && hour <= 15 && (new Date(dailyForecasts[dayKey].dt * 1000).getHours() < 12 || new Date(dailyForecasts[dayKey].dt * 1000).getHours() > 15))) {
            dailyForecasts[dayKey] = item;
        }
    });

    const forecastDays = Object.values(dailyForecasts).slice(0, 5); // Get up to 5 days of forecast

    if (forecastDays.length === 0) {
        forecastContainer.innerHTML = '<p>No future forecast data available.</p>';
        return;
    }

    forecastDays.forEach((item, index) => {
        const date = new Date(item.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const tempMin = Math.round(item.main.temp_min);
        const tempMax = Math.round(item.main.temp_max);
        const description = item.weather[0].description;
        const iconCode = item.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

        const forecastItem = document.createElement('div');
        forecastItem.classList.add('forecast-item');
        forecastItem.innerHTML = `
            <p class="day">${dayName}</p>
            <img src="${iconUrl}" alt="${description}" class="icon">
            <p class="temp">${tempMin}°C / ${tempMax}°C</p>
            <p>${description}</p>
        `;
        forecastContainer.appendChild(forecastItem);

        setTimeout(() => {
            forecastItem.classList.add('fade-in');
        }, index * 100);
    });
}

// --- Event Listeners ---

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherDataByCity(city);
    } else {
        showMessage(errorMessageElem, 'Please enter a city name.');
        hideWeatherDisplay();
    }
});

cityInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        searchBtn.click();
    }
});

useLocationBtn.addEventListener('click', () => {
    showLoading();
    hideWeatherDisplay();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                // --- Use OpenStreetMap Nominatim for location name ---
                try {
                    // It's good practice to include a User-Agent header or 'email' parameter
                    // with Nominatim requests to identify your application.
                    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&email=kr1456773@gmail.com`;
                    
                    const nominatimResponse = await fetch(nominatimUrl);
                    const nominatimData = await nominatimResponse.json();

                    let detectedLocationName = 'Your Location'; // Default fallback

                    if (nominatimData.address) { // Check if 'address' object exists in response
                        const address = nominatimData.address;
                        
                        // Define a list of preferred address components in order of specificity and readability
                        const preferredComponents = [
                            address.neighbourhood,
                            address.suburb,
                            address.village, // For smaller settlements
                            address.hamlet,
                            address.road,
                            address.town, // More specific than city, if available
                            address.city
                        ];

                        for (const component of preferredComponents) {
                            if (component) {
                                // Exclude names that look like "Ward XXX" or "Zone XXX" if a better alternative is found
                                if ((component.toLowerCase().includes('ward') && component.match(/\b\d+\b/)) || 
                                    (component.toLowerCase().includes('zone') && component.match(/\b\d+\b/))) {
                                    continue; // Skip this component and try the next one
                                }
                                detectedLocationName = component;
                                break; // Found a good component, stop searching
                            }
                        }

                        // If after checking preferred components, it's still a broad "Your Location" or
                        // if we want to ensure we get a city if nothing else works.
                        if (detectedLocationName === 'Your Location' && address.city) {
                            detectedLocationName = address.city;
                        }
                        
                        // Fallback to the full display_name if nothing specific was found AND it's not just "Your Location"
                        // but only take the first, most relevant part if display_name is very long.
                        if (detectedLocationName === 'Your Location' && nominatimData.display_name) {
                            // Split by comma and take the first part, often the most common name
                            detectedLocationName = nominatimData.display_name.split(',')[0].trim();
                            // If the first part is still something generic, too long, or includes "ward"/"zone", fall back to "Your Location"
                            if (detectedLocationName.length > 30 || 
                                detectedLocationName.toLowerCase().includes('ward') ||
                                detectedLocationName.toLowerCase().includes('zone')) {
                                detectedLocationName = 'Your Location';
                            }
                        }
                    }
                    cityNameElem.textContent = detectedLocationName;
                    
                } catch (error) {
                    console.error('Error with OpenStreetMap Nominatim API:', error);
                    showMessage(errorMessageElem, 'Failed to get detailed location name. Check network or Nominatim usage policy.');
                    cityNameElem.textContent = 'Your Location'; // Fallback on error
                }
                // --- End OpenStreetMap Nominatim usage ---

                // Always fetch weather data using OpenWeatherMap once coordinates are known.
                await fetchAndDisplayWeather(latitude, longitude);
            },
            (error) => {
                console.error('Geolocation error:', error);
                let msg = 'Unable to retrieve your location.';
                if (error.code === error.PERMISSION_DENIED) {
                    msg += ' Please allow location access in your browser settings.';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    msg += ' Location information is unavailable.';
                } else if (error.code === error.TIMEOUT) {
                    msg += ' The request to get user location timed out.';
                }
                showMessage(errorMessageElem, msg);
                hideWeatherDisplay();
                hideLoading();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        showMessage(errorMessageElem, 'Geolocation is not supported by your browser.');
        hideWeatherDisplay();
        hideLoading();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    weatherDisplay.classList.remove('show');
    errorMessageElem.classList.remove('show');
    loadingSpinner.style.display = 'none';
    todayForecastCard.classList.remove('fade-in');
});