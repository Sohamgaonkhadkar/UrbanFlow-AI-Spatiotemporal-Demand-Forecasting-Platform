"""Frozen v4 historical serving. No training or future truth enters inference."""
from pathlib import Path
from collections import OrderedDict
from threading import RLock
import hashlib
import json
import joblib
import numpy as np
import pandas as pd
from ml.advanced.core import HISTORY

TZ = 'America/New_York'
STEP = pd.Timedelta(minutes=15)

class InputError(ValueError):
    pass

def timestamp(value):
    try:
        t = pd.Timestamp(value)
        if pd.isna(t):
            raise ValueError('Missing timestamp')
        t = t.tz_localize(TZ, ambiguous='raise', nonexistent='raise') if t.tzinfo is None else t.tz_convert(TZ)
        if t.minute % 15 or t.second or t.microsecond or t.nanosecond:
            raise ValueError('Not a quarter-hour')
        return t
    except Exception as e:
        raise InputError('Use an unambiguous New York timestamp aligned to 15 minutes.') from e

class Store:
    def __init__(self, folder):
        self.folder = Path(folder)
        manifest = json.loads((self.folder/'manifest.json').read_text())
        for name, digest in manifest['sha256'].items():
            if hashlib.sha256((self.folder/name).read_bytes()).hexdigest() != digest:
                raise RuntimeError('Runtime bundle checksum mismatch')
        self.bundle = joblib.load(self.folder/'candidate_v4.joblib')
        self.model = self.bundle['model']
        self.schema = json.loads((self.folder/'feature_schema.json').read_text())
        if list(self.model.base.feature_name_) != self.schema['feature_columns']:
            raise RuntimeError('Fitted feature schema mismatch')
        frame = pd.read_parquet(self.folder/'inference_observations.parquet')
        frame['datetime'] = pd.to_datetime(frame.datetime).dt.tz_convert(TZ)
        if frame.duplicated(['datetime','region']).any():
            raise RuntimeError('Duplicate observation keys')
        self.wide = frame.pivot(index='datetime', columns='region', values='total_pickups').sort_index()
        self.wide = self.wide.reindex(columns=range(30))
        if self.wide.isna().any().any() or not np.isfinite(self.wide.to_numpy()).all() or (self.wide < 0).any().any():
            raise RuntimeError('Invalid observations')
        expected = pd.date_range(self.wide.index[0], self.wide.index[-1], freq=STEP)
        if not self.wide.index.equals(expected):
            raise RuntimeError('Observation time grid is incomplete')
        self.cutoff = timestamp(self.bundle['training_end'])
        self.minimum = max(self.cutoff, self.wide.index[0] + HISTORY*STEP)
        self.maximum = self.wide.index[-1] + STEP
        self.default = min(self.maximum-48*STEP, self.minimum+(self.maximum-self.minimum)/2).floor('15min')
        self.geo = json.loads((self.folder/'geography.json').read_text())
        self.evaluation = json.loads((self.folder/'final_test_results.json').read_text())
        self.cache = OrderedDict()
        self.lock = RLock()
        self.executions = 0

    def coverage(self):
        return dict(mode='historical', timezone=TZ, step_minutes=15, region_count=30,
                    observed_start=self.wide.index[0].isoformat(), observed_end=self.wide.index[-1].isoformat(),
                    origin_min=self.minimum.isoformat(), origin_max=self.maximum.isoformat(),
                    full_12h_actuals_origin_max=(self.maximum-48*STEP).isoformat(),
                    default_origin=self.default.isoformat(), training_cutoff=self.cutoff.isoformat(),
                    history_steps=HISTORY, max_horizon=48, retained_trip_count=int(self.wide.to_numpy().sum()), observed_rows=int(self.wide.size), weather_used=False, prediction_intervals_available=False)

    def origin(self, value):
        t = timestamp(value)
        if not self.minimum <= t <= self.maximum:
            raise InputError(f'Historical origin must be between {self.minimum.isoformat()} and {self.maximum.isoformat()}.')
        return t

    def forecast(self, value, horizon=48):
        t = self.origin(value)
        if not isinstance(horizon,int) or isinstance(horizon,bool) or not 1 <= horizon <= 48:
            raise InputError('Horizon must be 1–48 quarter-hour steps.')
        with self.lock:
            key = t.isoformat()
            if key not in self.cache:
                # Only rows strictly before t are ever passed to the frozen model.
                history = self.wide.loc[(self.wide.index >= t-HISTORY*STEP) & (self.wide.index < t)]
                if len(history) != HISTORY:
                    raise InputError('Complete 16-day context is unavailable.')
                times = pd.date_range(t-HISTORY*STEP, periods=HISTORY+48, freq=STEP)
                result = np.asarray(self.model.forecast(history.to_numpy(dtype=np.float32), times, np.array([HISTORY]), 48))[0]
                if result.shape != (48,30) or not np.isfinite(result).all() or (result < 0).any():
                    raise RuntimeError('Invalid model output')
                self.executions += 1
                self.cache[key] = result
                if len(self.cache) > 32:
                    self.cache.popitem(last=False)
            self.cache.move_to_end(key)
            return t, self.cache[key][:horizon].copy()

    def regions(self):
        points = np.asarray(self.geo['centers'])*np.asarray(self.geo['scale'])+np.asarray(self.geo['mean'])
        return [dict(id=i, name=f'NYC Sector {i:02d}', borough='Verified cluster centroid', lon=float(p[0]), lat=float(p[1]),
                     coordinate_source='inverse StandardScaler transform of fitted K-means centers', boundaries_available=False)
                for i,p in enumerate(points)]

    def predict(self, region, value, horizon):
        t, predictions = self.forecast(value,horizon)
        rows = [dict(datetime=(t+k*STEP).isoformat(), prediction=round(float(v),2)) for k,v in enumerate(predictions[:,region])]
        past = self.wide.loc[self.wide.index<t,region].tail(192)
        last = self.wide.loc[self.wide.index<t].iloc[-1]
        return dict(region=region, origin=t.isoformat(), forecast=rows,
                    history=[dict(datetime=d.isoformat(),actual=float(v)) for d,v in past.items()],
                    heatmap=[dict(region=int(r),activity=float(v)) for r,v in last.items()],
                    heatmap_datetime=(t-STEP).isoformat(), heatmap_kind='observed',
                    weather=None, feature_importance=None, alerts=[], demo=False,
                    metadata=dict(candidate_id=self.bundle['candidate_id'], timezone=TZ, mode='historical',
                                  weather_used=False, prediction_intervals_available=False, operational_alerts_available=False))

    def info(self):
        return dict(candidate_id=self.bundle['candidate_id'], architecture='XGBoost + recursive calendar feedback',
                    feature_count=len(self.schema['feature_columns']), feature_columns=self.schema['feature_columns'],
                    training_cutoff=self.cutoff.isoformat(), timezone=TZ, max_horizon=48, step_minutes=15,
                    target='Retained completed NYC Yellow Taxi trips per region per 15-minute bin',
                    limitations=['Historical 2016 benchmark; not a current live service.',
                                 'Post-trip fare, distance and geographic filters; zero-latency observation availability is an idealization.',
                                 'No weather, calibrated prediction bands, operational alerts or validated whole-model attribution.'],
                    weather_used=False, prediction_intervals_available=False, feature_importance=None)

    def metrics(self):
        return dict(period='June 2016', origins=55, points=79200, horizon_steps=48,
                    selected=self.evaluation['windows']['june_primary']['records']['calendar_feedback'],
                    interpretation='WAPE is error, not accuracy. Cumulative 48-step WAPE differs from the individual lead-48 error. Bootstrap metric CI is not a prediction band.')

    def historical(self, region, start=None, end=None):
        data = self.wide[region]
        if start is not None: data = data.loc[data.index >= timestamp(start)]
        if end is not None: data = data.loc[data.index < timestamp(end)]
        if len(data)>4096: raise InputError('Request at most 4096 observation bins.')
        return dict(region=region, timezone=TZ, source='observed retained Yellow Taxi trips',
                    history=[dict(datetime=d.isoformat(),actual=float(v)) for d,v in data.items()])

    def insights(self, value):
        t = self.origin(value)
        history = self.wide.loc[self.wide.index<t].tail(HISTORY)
        totals = history.sum(axis=1)
        return dict(origin=t.isoformat(), window_start=history.index[0].isoformat(), window_end=history.index[-1].isoformat(),
                    source='observations strictly before origin',
                    hourly=[dict(hour=int(k),mean=float(v)) for k,v in totals.groupby(totals.index.hour).mean().items()],
                    regional=[dict(region=int(k),total=float(v)) for k,v in history.sum().items()])
