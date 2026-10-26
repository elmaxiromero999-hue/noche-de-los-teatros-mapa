import json,sys
sys.path.insert(0,'.');from venues import *
d=json.load(open('/mnt/user-data/uploads/NOCHE DE LOS TEATROS INFO/datos-mapa/calles-cordoba.json'))
car=json.load(open('ai/caretas.json'));sec=json.load(open('sectors.json'))
pd=lambda ls:''.join('M'+p.replace(' ',' L') for p in ls)
prim=pd([p for h in ('motorway','primary') for n,p in d['roads'].get(h,[])])
secr=pd([p for n,p in d['roads'].get('secondary',[])])
riv=pd([p for n,t,p in d['water'] if t=='river' or 'Suqu' in n or 'Primero' in n])
ZD=[('siripo','Siripo','Abasto · Cofico','#0063FF','2',False),('juglar','El Juglar','Barrio Pueyrredón','#CFF933','3',True),
('chispa','La Chispa','Alta Córdoba · Providencia','#FE9FF3','4',True),('teuc','TEUC','Centro','#64AC9E','5',True),
('ltl','LTL','Güemes · Observatorio','#FF6699','6',True),('arlequin','El Arlequín','Alberdi · Alto Alberdi · Argüello','#AF78D3','7',True)]
flags={}
out=[]
for zid,name,bar,c,p,dark in ZD:
    o=car[p];s=sec[zid]
    out.append(dict(id=zid,name=name,barrio=bar,c=c,dark=dark,d=s['d'],lx=s['lx'],ly=s['ly'],r=s['r'],pb=o['bbox'],face=o['paths'][0][1],eye=' '.join(x for _,x in o['paths'][1:]),
      v=[dict(n=v[0],a=v[1],x=round(P(v[2],v[3])[0],1),y=round(P(v[2],v[3])[1],1),pid=v[4],**({'f':flags[v[0]]} if v[0] in flags else {})) for v in Z[zid]]))
t=open('template4.html').read().replace('%%PRIM%%',prim).replace('%%SEC%%',secr).replace('%%RIV%%',riv).replace('%%DATA%%',json.dumps(out,ensure_ascii=False,separators=(',',':')))
open('mapa-noche-teatros.html','w').write(t);print(len(t))
