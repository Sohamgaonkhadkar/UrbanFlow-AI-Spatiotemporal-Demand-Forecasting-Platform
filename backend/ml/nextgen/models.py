from dataclasses import dataclass
import numpy as np, pandas as pd

@dataclass
class Profile:
    profile:object
    decay:float=12.
    adaptive:bool=True
    def origin_context(self,y,times,positions):
        expected=[]
        for offset in range(-8,0):
            t=pd.DatetimeIndex(times[positions+offset]);expected.append(self.profile[np.asarray(t.day_of_week),np.asarray(t.hour*4+t.minute//15)])
        expected=np.stack(expected,axis=1).sum(axis=1)
        recent=y[positions[:,None]-8+np.arange(8)[None,:]]
        gain=np.clip((recent.sum(axis=1)+100)/(expected+100),.6,1.6)
        vol=recent.std(axis=1)/(recent.mean(axis=1)+5)
        return gain,vol
    def forecast(self,y,times,positions,horizon=48):
        gain,_=self.origin_context(y,times,positions);out=[]
        for k in range(horizon):
            t=pd.DatetimeIndex(times[positions])+pd.Timedelta(minutes=15*k)
            p=self.profile[np.asarray(t.day_of_week),np.asarray(t.hour*4+t.minute//15)]
            if self.adaptive:p=p*(1+(gain-1)*np.exp(-k/self.decay))
            out.append(np.maximum(0,p))
        return np.stack(out,axis=1)
