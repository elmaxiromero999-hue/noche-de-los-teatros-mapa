# Agranda un sector del mapa (escalándolo desde su centro) y recorta a los vecinos, manteniendo
# la separación de 6 px entre zonas. Recalcula la posición y el tamaño de las etiquetas.
# Uso (desde web-mapa/): python3 reference/mockup-src/agrandar_zona.py siripo 1.4|1.1,1.6 [--sur] [--guardar]
# --sur: deja fijo el borde sur (crece hacia el norte y los costados).
# Requiere shapely. Sin --guardar solo muestra áreas y controla que cada sala quede en su zona.
import json, re, sys
from shapely.geometry import Polygon, Point
from shapely.affinity import scale
from shapely.ops import unary_union, polylabel

ZID = sys.argv[1]
FX, FY = (list(map(float, sys.argv[2].split(","))) * 2)[:2]  # "1.4" o "1.1,1.6" (ancho,alto)
RUTA = "data/zones.json"
X0, Y0, X1, Y1, C = 40, 30, 930, 860, 70
frame = Polygon([(X0+C, Y0), (X1-C, Y0), (X1, Y0+C), (X1, Y1-C), (X1-C, Y1), (X0+C, Y1), (X0, Y1-C), (X0, Y0+C)])
MITRE = dict(join_style="mitre")

data = json.load(open(RUTA))
zonas = {z["id"]: z for z in data["zones"]}
poly = {k: Polygon([tuple(map(float, p.split(","))) for p in re.findall(r"[\d.]+,[\d.]+", z["mockupSector"]["svgPath"])]) for k, z in zonas.items()}
salas = {k: [Point(v["mockupXY"]) for v in z["venues"]] for k, z in zonas.items()}

def mayor(g):
    return g if g.geom_type == "Polygon" else max(g.geoms, key=lambda p: p.area)

grande = poly[ZID]
origen = Point(grande.centroid.x, grande.bounds[3]) if "--sur" in sys.argv else grande.centroid
grande = unary_union([grande, scale(grande, FX, FY, origin=origen)]).intersection(frame.buffer(-3, **MITRE))
grande = mayor(grande).simplify(1.5)
nuevo = {ZID: grande}
for k, p in poly.items():
    if k != ZID:
        nuevo[k] = mayor(p.difference(grande.buffer(6, **MITRE))).simplify(1.5)

ok = True
for k, g in nuevo.items():
    for i, s in enumerate(salas[k]):
        if not g.buffer(-4).contains(s):
            ok = False; print(f"  ¡{zonas[k]['venues'][i]['name']} queda fuera de {k}!")

for k, g in nuevo.items():
    dots = unary_union([s.buffer(26) for s in salas[k]])
    free = mayor(g.buffer(-6, **MITRE).difference(dots))
    lp = polylabel(free, 0.5)
    r = free.exterior.distance(lp)
    print(f"{k:9} área {poly[k].area:7.0f} → {g.area:7.0f}   radio etiqueta {zonas[k]['mockupSector']['labelRadius']:5.1f} → {r:5.1f}")
    zonas[k]["mockupSector"].update(
        svgPath="M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in g.exterior.coords[:-1]) + "Z",
        labelX=round(lp.x, 1), labelY=round(lp.y, 1), labelRadius=round(r, 1))

if "--guardar" in sys.argv:
    if not ok: sys.exit("No guardo: hay salas fuera de su zona.")
    json.dump(data, open(RUTA, "w"), ensure_ascii=False, indent=2)
    print("Guardado en", RUTA)
