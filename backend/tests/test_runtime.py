"""Acceptance tests use the actual frozen artifact and genuine observations."""
from pathlib import Path
import sys,json,hashlib
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from main import app
from service import InputError,timestamp

@pytest.fixture(scope='module')
def client():
    with TestClient(app,raise_server_exceptions=False) as client:yield client

def test_bundle_and_public_contract(client):
    assert client.get('/health').json()['model_loaded']
    c=client.get('/coverage').json()
    assert c['timezone']=='America/New_York' and c['history_steps']==1536
    assert c['origin_min']=='2016-05-31T22:00:00-04:00'
    assert c['origin_max']=='2016-07-01T00:00:00-04:00'
    assert c['observed_end']=='2016-06-30T23:45:00-04:00'
    info=client.get('/model/info').json()
    assert info['feature_count']==46 and not info['weather_used']
    m=client.get('/model/metrics').json()['selected']
    assert m['primary']['WAPE']==pytest.approx(11.6085637734)
    assert m['cumulative']['1']['WAPE']==pytest.approx(9.7506982795)

def test_geography_inverse_transform(client):
    store=app.state.store
    regions=client.get('/regions').json()
    xy=np.array(store.geo['centers'])*store.geo['scale']+store.geo['mean']
    assert [r['id'] for r in regions]==list(range(30))
    np.testing.assert_allclose([[r['lon'],r['lat']] for r in regions],xy,rtol=0,atol=1e-12)

@pytest.mark.parametrize('origin',['2016-06-01T00:00:00-04:00','2016-06-15T12:00:00-04:00','2016-06-30T23:45:00-04:00'])
def test_all_regions_and_prefix_consistency(client,origin):
    store=app.state.store;before=store.executions
    batch=client.post('/predict/batch',json={'datetime':origin,'horizon':48})
    assert batch.status_code==200
    all_regions=batch.json()['forecasts']
    for r in range(30):
        for h in [1,4,12,24,48]:
            result=client.post('/predict',json={'region':r,'datetime':origin,'horizon':h})
            assert result.status_code==200
            d=result.json()
            assert d['forecast']==all_regions[r]['forecast'][:h]
            assert all(pd.Timestamp(x['datetime'])<pd.Timestamp(origin) for x in d['history'])
            assert all(np.isfinite(x['prediction']) and x['prediction']>=0 for x in d['forecast'])
            assert d['weather']['data_kind']=='historical_reanalysis' and not d['weather']['model_used']
            assert d['feature_importance'] is None and d['alerts']==[]
            assert not d['demo']
    assert store.executions-before<=1

@pytest.mark.parametrize('patch',[{'region':-1},{'region':30},{'region':True},{'horizon':0},{'horizon':49},{'horizon':1.5},{'datetime':'2026-11-02T12:00:00'},{'datetime':'2016-05-01T12:00:00'},{'datetime':'2016-06-15T12:01:00'},{'datetime':'bad'},{'mode':'realtime'},{'unknown':1}])
def test_invalid_requests(client,patch):
    body={'region':0,'datetime':'2016-06-15T12:00:00','horizon':4};body.update(patch)
    assert client.post('/predict',json=body).status_code==422

def test_dst_rejected_and_offsets_normalized():
    for s in ['2016-03-13T02:15:00','2016-11-06T01:15:00']:
        with pytest.raises(InputError):timestamp(s)
    assert timestamp('2016-06-15T16:00:00Z')==timestamp('2016-06-15T12:00:00-04:00')

def test_future_truth_never_reaches_inference(client):
    s=app.state.store;t=timestamp('2016-06-10T12:00:00')
    s.cache.clear();_,before=s.forecast(t)
    future=s.wide.loc[s.wide.index>=t].copy()
    try:
        s.wide.loc[s.wide.index>=t,:]=999999
        s.cache.clear();_,after=s.forecast(t)
        np.testing.assert_array_equal(before,after)
    finally:
        s.wide.loc[future.index,:]=future
        s.cache.clear()

def test_observations_insights_and_map_time(client):
    origin='2016-06-15T12:00:00-04:00'
    a=client.get('/activity',params={'datetime':origin}).json()
    assert a['kind']=='observed' and a['datetime']=='2016-06-15T11:45:00-04:00'
    assert len(a['activity'])==30
    d=client.post('/predict',json={'region':5,'datetime':origin,'horizon':4}).json()
    assert d['heatmap']==a['activity']
    h=client.get('/historical',params={'region':5,'start':'2016-06-15T11:00:00','end':'2016-06-15T12:00:00'}).json()['history']
    assert len(h)==4 and h==d['history'][-4:]
    insights=client.get('/insights',params={'datetime':origin}).json()
    assert pd.Timestamp(insights['window_end'])<pd.Timestamp(origin)
    assert len(insights['hourly'])==24 and len(insights['regional'])==30

def test_failure_is_explicit_and_no_fallback(client,monkeypatch):
    def broken(*args,**kwargs):raise RuntimeError('private filesystem path should never escape')
    monkeypatch.setattr(app.state.store,'predict',broken)
    r=client.post('/predict',json={'region':0,'datetime':'2016-06-15T12:00:00'})
    assert r.status_code==500 and 'fallback' in r.json()['detail']
    assert 'private filesystem' not in r.text and 'forecast' not in r.json()
