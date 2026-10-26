import sys,json
sys.path.insert(0,'.');from venues import *
from shapely.geometry import Point,MultiPoint,Polygon
from shapely.ops import voronoi_diagram,unary_union
from shapely.ops import polylabel
X0,Y0,X1,Y1=40,30,930,860;C=70
frame=Polygon([(X0+C,Y0),(X1-C,Y0),(X1,Y0+C),(X1,Y1-C),(X1-C,Y1),(X0+C,Y1),(X0,Y1-C),(X0,Y0+C)])
pts={};
for z,vs in Z.items():
    for v in vs:
        x,y=P(v[2],v[3]);k=(round(x),round(y))
        pts.setdefault(k,z)
real=set(pts)
extra=json.loads(sys.argv[1]) if len(sys.argv)>1 else {}
for z,lst in extra.items():
    for x,y in lst: pts[(x,y)]=z
vd=voronoi_diagram(MultiPoint([Point(k) for k in pts]),envelope=frame.buffer(400))
cells={z:[] for z in Z}
for cell in vd.geoms:
    for k,z in pts.items():
        if cell.contains(Point(k)):cells[z].append(cell);break
out={}
for z,cs in cells.items():
    g=unary_union(cs).intersection(frame).buffer(-3,join_style='mitre')
    if g.geom_type!='Polygon':g=max(g.geoms,key=lambda p:p.area)
    g=g.simplify(2.5)
    dots=unary_union([Point(k).buffer(26) for k,zz in pts.items() if zz==z and k in real])
    free=g.buffer(-6,join_style='mitre').difference(dots)
    if free.geom_type!='Polygon':free=max(free.geoms,key=lambda p:polylabel(p,0.5).distance(p.exterior))
    lp=polylabel(free,0.5)
    r=free.exterior.distance(lp)
    out[z]=dict(d='M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in g.exterior.coords[:-1])+'Z',lx=round(lp.x,1),ly=round(lp.y,1),r=round(r,1),area=round(g.area))
    print(z,len(cs),out[z]['area'],out[z]['r'],out[z]['lx'],out[z]['ly'])
json.dump(out,open('sectors.json','w'))
