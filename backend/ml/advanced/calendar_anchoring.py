from dataclasses import dataclass
import numpy as np, pandas as pd
from .core import HISTORY, histories, make_features

@dataclass
class CalendarAnchoredRecursive:
    base:object
    calendar:object
    weight:float=.6
    decay:float=12.
    def forecast(self,y,times,positions,horizon=48):
        positions=np.asarray(positions,dtype=int);h=histories(y,positions)
        b,_,r=h.shape;h=np.concatenate([h,np.zeros((b,horizon,r),dtype=np.float32)],axis=1)
        calendar=self.calendar.forecast(y,times,positions,horizon)
        result=[]
        for k in range(horizon):
            targets=pd.DatetimeIndex(times[positions])+pd.Timedelta(minutes=15*k)
            x=make_features(h[:,:HISTORY+k],targets,list(range(r)),self.base.config,self.base.scales,self.base.neighbors,
                forecast_age=k if self.base.exposure_aware else None)
            p=self.base.predict(x).reshape(b,r)
            if self.base.anchor_weight:
                w=self.base.anchor_weight*k/47;p=(1-w)*p+w*x.seasonal_anchor.to_numpy().reshape(b,r)
            if self.base.bias is not None:p+=self.base.bias[min(k//12,3)]
            w=self.weight*(1-np.exp(-k/self.decay))
            p=np.maximum(0,(1-w)*p+w*calendar[:,k])
            if not np.isfinite(p).all():raise RuntimeError('Invalid calendar-anchored recursion')
            result.append(p);h[:,HISTORY+k]=p
        return np.stack(result,axis=1)
