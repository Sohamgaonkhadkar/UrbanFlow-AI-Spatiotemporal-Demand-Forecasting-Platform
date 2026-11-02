import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Annotated, Literal
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field
from service import Store, InputError

log = logging.getLogger('urbanflow')
@asynccontextmanager
async def lifespan(app):
    app.state.store = Store(Path(os.getenv('URBANFLOW_BUNDLE', Path(__file__).resolve().parent/'bundle')))
    yield

app = FastAPI(title='UrbanFlow AI historical forecasting', version='4.0.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('CORS_ORIGINS','http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:4175').split(','), allow_methods=['GET','POST'], allow_headers=['Content-Type'])

@app.exception_handler(InputError)
async def invalid(request, exc):
    return JSONResponse(status_code=422, content={'detail':str(exc)})

@app.exception_handler(Exception)
async def failure(request, exc):
    log.exception('Request failed')
    return JSONResponse(status_code=500, content={'detail':'Forecast service failed. No fallback values were generated.'})

Region = Annotated[int, Query(ge=0,le=29)]
class ForecastRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    region: int = Field(ge=0,le=29,strict=True)
    datetime: str
    horizon: int = Field(default=48,ge=1,le=48,strict=True)
    mode: Literal['historical'] = 'historical'

class BatchRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    datetime: str
    horizon: int = Field(default=48,ge=1,le=48,strict=True)

@app.get('/health')
def health(request: Request):
    return {'status':'ok','model_loaded':True,'mode':'historical','candidate_id':request.app.state.store.bundle['candidate_id']}

@app.get('/coverage')
def coverage(request: Request): return request.app.state.store.coverage()

@app.get('/regions')
def regions(request: Request): return request.app.state.store.regions()

@app.get('/model/info')
def info(request: Request): return request.app.state.store.info()

@app.get('/model/metrics')
def metrics(request: Request): return request.app.state.store.metrics()

@app.post('/predict')
def predict(body: ForecastRequest, request: Request):
    return request.app.state.store.predict(body.region,body.datetime,body.horizon)

@app.post('/predict/batch')
def batch(body: BatchRequest, request: Request):
    store=request.app.state.store
    t,p=store.forecast(body.datetime,body.horizon)
    return {'origin':t.isoformat(),'timezone':'America/New_York','forecasts':[
        {'region':r,'forecast':[{'datetime':(t+k*__import__('pandas').Timedelta(minutes=15)).isoformat(),'prediction':round(float(v),2)} for k,v in enumerate(p[:,r])]}
        for r in range(30)]}

@app.get('/historical')
def historical(request: Request,region: Region,start: str,end: str):
    return request.app.state.store.historical(region,start,end)

@app.get('/insights')
def insights(request: Request,datetime: str): return request.app.state.store.insights(datetime)

@app.get('/activity')
def activity(request: Request,datetime: str,mode: Literal['observed','forecast']='observed'):
    s=request.app.state.store;t=s.origin(datetime)
    if mode=='forecast':
        t,p=s.forecast(datetime,1);values=p[0];stamp=t
    else:
        values=s.wide.loc[s.wide.index<t].iloc[-1].to_numpy();stamp=t-__import__('pandas').Timedelta(minutes=15)
    return {'datetime':stamp.isoformat(),'kind':mode,'units':'retained trips per 15 minutes','activity':[{'region':r,'activity':round(float(v),2)} for r,v in enumerate(values)]}
