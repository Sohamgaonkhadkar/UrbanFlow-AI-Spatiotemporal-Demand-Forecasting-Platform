"""Genuine cached Open-Meteo ERA5 context at a conservative pre-origin time."""
import pandas as pd
from ml.weather_20261102 import weather_times


def context(weather, origin, model_used=False):
    stamp = weather_times(pd.DatetimeIndex([origin]))[0]
    if stamp not in weather.index:
        raise ValueError('Historical weather coverage is incomplete')
    row = weather.loc[stamp]
    code = int(row.weather_code)
    if code in [0, 1]: condition = 'Clear'
    elif code in [2, 3]: condition = 'Cloudy'
    elif code in [45, 48]: condition = 'Fog'
    elif 51 <= code <= 67 or 80 <= code <= 82: condition = 'Rain'
    elif 71 <= code <= 77 or code in [85, 86]: condition = 'Snow'
    elif code in [95, 96, 99]: condition = 'Thunderstorm'
    else: condition = 'Other conditions'
    return dict(temperature_c=float(row.temperature_2m),apparent_temperature_c=float(row.apparent_temperature),
                precipitation_mm=float(row.precipitation),snowfall_cm=float(row.snowfall),
                wind_speed_kmh=float(row.wind_speed_10m),humidity_percent=float(row.relative_humidity_2m),
                weather_code=code,condition=condition,observed_at=stamp.tz_convert('America/New_York').isoformat(),
                provider='Open-Meteo / Copernicus ERA5',source_url='https://open-meteo.com/en/docs/historical-weather-api',
                data_kind='historical_reanalysis',model_used=model_used,lag_hours=3,
                latitude=40.7128,longitude=-74.0060,spatial_scope='NYC reference point; not neighborhood-specific',
                availability_note='Retrospective reanalysis; historical publication availability is not certified.')
