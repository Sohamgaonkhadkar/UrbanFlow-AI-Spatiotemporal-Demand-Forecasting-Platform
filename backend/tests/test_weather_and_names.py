from pathlib import Path
import copy
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from main import app
from ml.weather_20261102 import weather_times

@pytest.fixture(scope='module')
def client():
    with TestClient(app) as c:yield c


def test_all_region_names_match_verified_coordinate_mapping(client):
    regions=client.get('/regions').json()
    assert len(regions)==30 and not any('Sector' in r['name'] for r in regions)
    assert regions[3]['name']=='JFK Airport'
    assert regions[27]['name']=='Chelsea-Hudson Yards'
    assert {r['borough'] for r in regions}=={'Manhattan','Brooklyn','Queens'}
    assert all(r['nta_code'] and 'centroid' in r['label_kind'] for r in regions)


def test_weather_endpoint_uses_pre_origin_utc_time_and_real_units(client):
    origin='2016-06-15T12:00:00-04:00'
    r=client.get('/weather',params={'datetime':origin});assert r.status_code==200
    w=r.json();assert w['data_kind']=='historical_reanalysis'
    assert pd.Timestamp(w['observed_at'])<=pd.Timestamp(origin)-pd.Timedelta(hours=3)
    assert -50<w['temperature_c']<60 and 0<=w['humidity_percent']<=100
    assert w['precipitation_mm']>=0 and w['wind_speed_kmh']>=0
    assert not w['model_used']
    assert weather_times(pd.DatetimeIndex([pd.Timestamp('2016-03-13T03:00:00-04:00')]))[0]==pd.Timestamp('2016-03-13T04:00:00Z')


def test_weather_forecast_contract_and_distinct_model_cache(client):
    payload={'region':3,'datetime':'2016-06-15T12:00:00-04:00','horizon':48}
    a=client.post('/predict',json=payload).json()
    b=client.post('/predict',json={**payload,'model_variant':'weather'}).json()
    assert b['metadata']['weather_used'] and b['weather']['model_used']
    assert b['metadata']['candidate_id']=='weather_calendar_feedback_v1'
    assert not a['metadata']['weather_used'] and len(b['forecast'])==48
    assert a['forecast']!=b['forecast']
    prefix=client.post('/predict',json={**payload,'horizon':4,'model_variant':'weather'}).json()
    assert prefix['forecast']==b['forecast'][:4]
    info=client.get('/model/info').json();assert info['feature_count']==46
    assert info['variants']['weather']['feature_count']==52
    m=client.get('/model/metrics').json()
    assert m['variants']['weather']['primary']['WAPE']==pytest.approx(11.4394705321)
    assert m['selected']['primary']['WAPE']==pytest.approx(11.6085637734)
    assert client.post('/predict',json={**payload,'model_variant':'invalid'}).status_code==422


def test_weather_model_uses_lagged_weather_and_ignores_future_weather(client):
    store=app.state.store;model=store.weather_model
    origin=pd.Timestamp('2016-06-15T12:00:00-04:00');history=store.wide.loc[store.wide.index<origin].tail(1536)
    times=pd.date_range(origin-pd.Timedelta(minutes=15*1536),periods=1536+48,freq='15min')
    y=history.to_numpy(dtype=np.float32);pos=np.array([1536]);original=model.weather
    before=model.forecast(y,times,pos,48)
    try:
        model.weather=original.copy()
        model.weather.loc[model.weather.index>=origin.tz_convert('UTC'),:]+=100
        np.testing.assert_array_equal(before,model.forecast(y,times,pos,48))
        stamp=weather_times(pd.DatetimeIndex([origin]))[0]
        model.weather=original.copy()
        model.weather.loc[stamp,'temperature_2m']-=20
        model.weather.loc[stamp,'precipitation']+=30
        assert not np.allclose(before,model.forecast(y,times,pos,48))
    finally:model.weather=original
