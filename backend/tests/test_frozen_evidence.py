from pathlib import Path
import json
import numpy as np
import pandas as pd
from service import Store

def metrics(a,p):
    a,p=np.asarray(a,dtype=float).ravel(),np.asarray(p,dtype=float).ravel()
    e=p-a
    return dict(WAPE=100*np.abs(e).sum()/np.abs(a).sum(),MAE=np.abs(e).mean(),RMSE=np.sqrt(np.mean(e**2)),R2=1-(e**2).sum()/((a-a.mean())**2).sum())

def test_sealed_june_metrics_and_portable_model_parity():
    root=Path(__file__).resolve().parents[1]
    store=Store(root/'bundle')
    evidence=np.load(Path(__file__).parent/'evidence/june_primary_predictions.npz')
    a,p=evidence['actual'],evidence['calendar_feedback']
    assert a.shape==p.shape==(55,48,30)
    results=store.metrics()['selected']
    for h in [1,4,12,24,48]:
        actual=metrics(a[:,:h],p[:,:h])
        for name,value in actual.items():
            np.testing.assert_allclose(value,results['cumulative'][str(h)][name],rtol=1e-10,atol=1e-10)
    origins=pd.date_range(pd.Timestamp('2016-06-01',tz='America/New_York'),pd.Timestamp('2016-07-01',tz='America/New_York')-pd.Timedelta(minutes=15*47),freq='13h')
    for i in [0,27,54]:
        _,current=store.forecast(origins[i].isoformat(),48)
        np.testing.assert_allclose(current,p[i],rtol=1e-6,atol=1e-4)
