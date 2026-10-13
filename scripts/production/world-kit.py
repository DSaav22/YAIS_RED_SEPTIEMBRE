"""Deterministic reference-guided environment/architecture kit, headless CPU.
Outputs independent GLBs/BLENDs, collider proposals, contact sheets, and manifest.
Dimensions are project conventions, not measurements extracted from the images.
"""
import sys, math, random, json
from pathlib import Path
import bpy
from mathutils import Vector, Quaternion
sys.path.insert(0,str(Path(__file__).resolve().parent))
import mascot as B

OUT=B.ROOT/'assets/production/world/v001'
OUT.mkdir(parents=True,exist_ok=True)
ACTION=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'build'
M={};COL=[];ANCHORS={};R=random.Random(1709)
REFERENCES=['04-modular-island-kit-orthographic.png','05-landmarks-architecture-exploded.png']

def materials():
    for name,col in {
      'grass':(.32,.53,.035),'grass_light':(.52,.72,.075),'leaf':(.10,.34,.025),
      'leaf_light':(.31,.57,.027),'leaf_dark':(.044,.21,.017),'stone':(.39,.36,.32),
      'stone_light':(.57,.52,.45),'stone_dark':(.27,.29,.28),'sand':(.84,.61,.29),
      'wood':(.42,.18,.05),'wood_light':(.62,.30,.085),'rope':(.90,.65,.28),
      'white':(.90,.88,.76),'pink':(.90,.11,.15),'yellow':(1,.55,.017),
      'water':(.012,.50,.72),'foam':(.49,.91,.93),'blue':(.01,.27,.61),
      'orange':(.87,.14,.024),'orange_light':(1,.25,.041),'metal':(.055,.087,.095),
      'glass':(.16,.66,.77),'soil':(.31,.15,.058)}.items():
        M[name]=B.mat(name,col,.72 if name!='water' else .22)

def box(name,p,d,mat,bevel=.04):return B.box(name,p,d,M[mat],bevel)
def oval(name,p,d,mat,seg=16,rings=10):return B.oval(name,p,d,M[mat],seg,rings)
def line(name,pts,mat,r=.02):return B.line(name,pts,M[mat],r)
def cone(name,p,r1,r2,h,mat,vertices=16):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r1,radius2=r2,depth=h,location=p)
    return B.finish(bpy.context.object,name,M[mat])
def torus(name,p,major,minor,mat,rotation=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=8,
       location=p,major_radius=major,minor_radius=minor,rotation=rotation)
    return B.finish(bpy.context.object,name,M[mat])
def collider(p,size):COL.append({'shape':'box','center':list(p),'size':list(size)})

def leaf(p,tip,width,mat='leaf_light'):
    a=Vector(p);b=Vector(tip)
    obj=oval('leaf',(a+b)/2,(width,width*.30,(b-a).length*.54),mat,12,8)
    obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return obj

def rock(p=(0,0,.35),scale=(.5,.42,.45),seed=0):
    rng=random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=p)
    obj=bpy.context.object;obj.name='faceted_rock';obj.scale=scale
    for v in obj.data.vertices:v.co*=rng.uniform(.89,1.10)
    for name in ('stone','stone_light','stone_dark'):obj.data.materials.append(M[name])
    for poly in obj.data.polygons:poly.material_index=rng.choices([0,1,2],[6,2,1])[0]
    return obj

def bush(p=(0,0,0),scale=1,flowers=True):
    x,y,z=p
    for j in range(12):
        a=j*math.tau/12
        start=(x,y,z+.06*scale)
        end=(x+math.cos(a)*.31*scale,y+math.sin(a)*.31*scale,z+(.16+.05*(j%3))*scale)
        leaf(start,end,.087*scale,'leaf_light' if j%3 else 'leaf')
    if flowers:
        for k in range(3):
            a=k*math.tau/3
            cx=x+math.cos(a)*.13*scale;cy=y+math.sin(a)*.13*scale;cz=z+.25*scale
            for j in range(5):
                t=j*math.tau/5
                petal=oval('daisy_petal',(cx+math.cos(t)*.062*scale,cy+math.sin(t)*.062*scale,cz),
                          (.056*scale,.029*scale,.017*scale),'white',12,8)
                petal.rotation_euler[2]=t
            oval('daisy_center',(cx,cy,cz+.013*scale),(.031*scale,.031*scale,.025*scale),'yellow',12,8)

def island(radius):
    cone('cliff_core',(0,0,-.74),radius*.87,radius*.97,1.5,'stone',24)
    count=round(radius*11)
    for i in range(count):
        a=i*math.tau/count
        obj=rock((radius*.91*math.cos(a),radius*.91*math.sin(a),-.65),
                 (.30+radius*.035,.34, .67+R.random()*.16),i)
        obj.rotation_euler[2]=a
    cone('grass_cap',(0,0,-.045),radius*.985,radius*.97,.13,'grass',48)
    cone('sand_clearing',(0,0,.026),radius*.66,radius*.65,.035,'sand',48)
    for i in range(round(radius*9)):
        a=i*math.tau/round(radius*9)
        rad=radius*R.uniform(.77,.94)
        oval('grass_edge',(math.cos(a)*rad,math.sin(a)*rad,.037),(.24,.18,.07),'grass_light',12,8)
    for i in range(7):
        a=i*math.tau/7
        bush((math.cos(a)*radius*.79,math.sin(a)*radius*.79,.015),.8)
    for i in range(5):
        a=i*math.tau/5
        rock((math.cos(a)*radius*.53,math.sin(a)*radius*.53,.052),(.13,.10,.055),i+70)
    # Eight boxes form a conservative octagonal walk surface (no mesh physics yet).
    collider((0,0,-.2),(radius*1.42,radius*1.42,.40))
    for a in (0,math.pi/2,math.pi,math.pi*1.5):
        collider((math.cos(a)*radius*.79,math.sin(a)*radius*.79,-.2),
                 ((radius*.38 if abs(math.cos(a))>.5 else radius*1.16),
                  (radius*.38 if abs(math.sin(a))>.5 else radius*1.16),.4))
    ANCHORS.update({f'edge_{i}':[radius*math.cos(i*math.pi/2),radius*math.sin(i*math.pi/2),0] for i in range(4)})

def tile(kind):
    box('soil',(0,0,-.13),(2,2,.22),'soil',.035)
    box('grass',(0,0,-.017),(2,2,.07),'grass',.035)
    if kind=='straight':box('sand_path',(0,0,.024),(1.10,2,.034),'sand',.012)
    elif kind=='corner':
        verts=[];faces=[]
        for j in range(25):
            a=j*math.pi/48
            for r in (.42,1.55):verts.append((-1+math.cos(a)*r,-1+math.sin(a)*r,.041))
        for j in range(24):faces.append((2*j,2*j+1,2*j+3,2*j+2))
        mesh=bpy.data.meshes.new('curve_path');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new('curve_path',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(M['sand'])
    for x,y in [(-.80,-.7),(.8,.7)]:bush((x,y,.02),.60,True)
    collider((0,0,-.1),(2,2,.2));ANCHORS.update({'north':[0,1,0],'south':[0,-1,0]})

def water():
    box('water_volume',(0,0,-.085),(2,2,.17),'water',.025)
    for row in range(4):
        pts=[]
        for j in range(17):
            x=-.96+j*.12;y=-.72+row*.48+.065*math.sin(j*.7+row)
            pts.append((x,y,.012))
        line('water_ripple',pts,'foam',.007)

def post(x,y,h=.85):
    cone('wood_post',(x,y,h/2),.072,.065,h,'wood',10)
    cone('post_cap',(x,y,h+.015),.078,.078,.035,'wood_light',10)
    for z in (h*.79,h*.86):torus('rope_wrap',(x,y,z),.075,.012,'rope')

def bridge(curved=False):
    if not curved:
        for i in range(9):
            y=-.94+i*.235
            box('plank',(0,y,.04),(1.52,.221,.13),'wood_light',.018)
        for x in (-.73,.73):
            for y in (-.98,.98):post(x,y)
            line('rope_rail',[(x,-.98,.72),(x,0,.60),(x,.98,.72)],'rope',.027)
        collider((0,0,-.01),(1.52,2.08,.16))
        for x in (-.73,.73):collider((x,0,.45),(.10,2,.75))
        ANCHORS.update({'start':[0,-1.06,.1],'end':[0,1.06,.1]})
    else:
        for i in range(11):
            a=-math.pi/4+i*math.pi/20
            c=Vector((2*math.cos(a)-1.65,2*math.sin(a),.04))
            plank=box('curved_plank',c,(1.35,.29,.13),'wood_light',.018)
            plank.rotation_euler[2]=a
            COL.append({'shape':'box','center':list(c),'size':[1.35,.29,.13],'rotation_z':a})
        for r in (1.35,2.65):
            for a in (-math.pi/4,math.pi/4):post(r*math.cos(a)-1.65,r*math.sin(a))
            line('curved_rope',[(r*math.cos(a)-1.65,r*math.sin(a),.65+.07*abs(a)/(math.pi/4))
                 for a in [-math.pi/4+i*math.pi/32 for i in range(17)]],'rope',.027)
        ANCHORS.update({'start':[-.236,-1.414,.1],'end':[-.236,1.414,.1]})

def fence(rope=True):
    for x in (-.90,.90):post(x,0,.83)
    if rope:line('rope',[(-.9,0,.72),(0,0,.55),(.9,0,.72)],'rope',.028)
    else:
        for z in (.32,.65):box('rail',(0,0,z),(1.8,.12,.13),'wood_light',.018)
    collider((0,0,.40),(1.96,.14,.80))

def stairs():
    for i in range(3):
        h=(i+1)*.20;y=-.42+i*.42
        box('step',(0,y,h/2),(1.24,.43,h),'stone_light',.025)
        collider((0,y,h/2),(1.24,.43,h))

def tree():
    cone('trunk',(0,0,.72),.19,.11,1.45,'wood',12)
    for i in range(3):
        a=i*math.tau/3
        line('branch',[(0,0,.7),(.25*math.cos(a),.25*math.sin(a),1.35),
                     (.48*math.cos(a),.48*math.sin(a),1.72)],'wood',.075)
    for p,d in [((0,0,2.2),(.75,.65,.67)),((-.5,0,1.9),(.57,.55,.57)),
                ((.48,.03,1.95),(.6,.55,.56)),((0,-.4,2.05),(.65,.5,.58))]:
        oval('canopy',p,d,'leaf',20,14)
    rng=random.Random(712)
    for i in range(110):
        a=rng.random()*math.tau;z=rng.uniform(1.65,2.8)
        r=.85*math.sqrt(max(.03,1-((z-2.17)/.72)**2))
        p=Vector((r*math.cos(a),r*.82*math.sin(a),z))
        direction=Vector((math.cos(a)*.15,math.sin(a)*.15,.12))
        leaf(p-direction,p+direction,.12,'leaf_light' if i%3 else 'leaf_dark')
    bush((0,0,.01),.7,False)
    COL.append({'shape':'capsule','center':[0,0,.73],'radius':.20,'height':1.46,'axis':'z'})

def palm():
    for i in range(11):
        z=.12+i*.205;x=.10*math.sin(i*.16)
        cone('palm_trunk',(x,0,z),.105-i*.003,.115-i*.003,.235,'wood_light',12)
        torus('trunk_ring',(x,0,z+.07),.109-i*.003,.009,'wood')
    crown=Vector((.10,0,2.33))
    for i in range(8):
        a=i*math.tau/8;d=Vector((math.cos(a),math.sin(a),0))
        pts=[crown+d*t+Vector((0,0,.55*math.sin(t*2.1)-.32*t)) for t in (0,.35,.7,1.05)]
        line('frond_spine',pts,'leaf',.017)
        for j in range(1,8):
            t=j*.13;p=crown+d*t+Vector((0,0,.55*math.sin(t*2.1)-.32*t))
            side=Vector((-math.sin(a),math.cos(a),0))
            for s in (-1,1):leaf(p,p+d*.20+side*s*(.29*(1-t*.5))+Vector((0,0,-.20)),.080,'leaf_light')
    bush((0,0,0),.65,False)
    COL.append({'shape':'capsule','center':[.05,0,1.1],'radius':.13,'height':2.2,'axis':'z'})

def bench():
    for x in (-.68,.68):
        for y in (-.20,.20):box('leg',(x,y,.27),(.12,.12,.54),'metal',.02)
        obj=box('back_support',(x,.25,.75),(.11,.11,.75),'metal',.02);obj.rotation_euler[0]=-.13
    for y in (-.20,0,.20):box('seat_board',(0,y,.54),(1.62,.18,.095),'wood_light',.018)
    for z in (.80,1.04):box('back_board',(0,.30,z),(1.62,.08,.19),'wood_light',.018)
    collider((0,0,.52),(1.7,.66,1.06))

def cloud():
    for p,d in [((0,0,.23),(.76,.40,.24)),((-.40,0,.3),(.40,.34,.33)),
                ((.07,0,.48),(.39,.34,.41)),((.49,.02,.27),(.33,.31,.27))]:oval('cloud',p,d,'white',20,14)

def arch_panel(name,x,y,z,width,height,mat):
    # Arched plaque against a wall; no boolean openings, suitable closed MVP facade.
    r=width/2;spring=height-r
    verts=[(-r,-.03,0),(r,-.03,0)]
    for i in range(17):
        a=i*math.pi/16
        verts.append((r*math.cos(a),-.03,spring+r*math.sin(a)))
    count=len(verts);verts+=[(a,.03,c) for a,b,c in verts]
    faces=[tuple(reversed(range(count))),tuple(range(count,2*count))]
    faces +=[(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.location=(x,y,z)
    obj.data.materials.append(M[mat]);return obj

def door(y,z=0,width=.62,height=1.04):
    arch_panel('door_frame',0,y+.015,z,width+.12,height+.08,'white')
    arch_panel('blue_door',0,y-.04,z,width,height,'blue')
    for x in (-width*.22,0,width*.22):line('door_board',[(x,y-.079,z+.06),(x,y-.079,z+height-.18)],'metal',.004)
    oval('door_knob',(width*.25,y-.095,z+.46),(.036,.025,.036),'yellow',12,8)

def lighthouse():
    cone('tower',(0,0,1.55),.69,.49,3.1,'white',40)
    cone('tower_foot',(0,0,.10),.75,.75,.20,'stone_light',32)
    door(-.692,.12)
    for z in (1.70,2.4):
        arch_panel('window_frame',0,-(.69-.2*z/3.1)-.015,z,.28,.48,'stone_light')
        arch_panel('window_blue',0,-(.69-.2*z/3.1)-.050,z+.035,.205,.39,'blue')
    cone('gallery_floor',(0,0,3.09),.77,.77,.14,'white',32)
    for i in range(16):
        a=i*math.tau/16
        cone('rail_post',(.70*math.cos(a),.70*math.sin(a),3.36),.021,.021,.48,'metal',8)
    torus('gallery_rail',(0,0,3.59),.70,.027,'metal')
    cone('lantern_base',(0,0,3.24),.47,.47,.16,'orange',24)
    cone('lantern_glow',(0,0,3.65),.29,.29,.69,'yellow',16)
    for i in range(8):
        a=i*math.tau/8
        cone('lantern_bar',(.43*math.cos(a),.43*math.sin(a),3.66),.025,.025,.70,'orange',8)
    cone('lantern_top',(0,0,4.00),.49,.49,.08,'orange_light',24)
    # Upper hemisphere created directly, not a full sphere through the lantern.
    verts=[];faces=[]
    for j in range(9):
        a=j*math.pi/16
        for i in range(32):
            t=i*math.tau/32
            verts.append((.52*math.cos(a)*math.cos(t),.52*math.cos(a)*math.sin(t),4.04+.42*math.sin(a)))
    for j in range(8):
        for i in range(32):faces.append((j*32+i,j*32+(i+1)%32,(j+1)*32+(i+1)%32,(j+1)*32+i))
    mesh=bpy.data.meshes.new('dome');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new('orange_dome',mesh);bpy.context.collection.objects.link(obj);B.finish(obj,'orange_dome',M['orange'])
    oval('finial',(0,0,4.54),(.083,.083,.11),'orange',16,12)
    for i in range(5):
        a=i*math.tau/5+.3;bush((.81*math.cos(a),.81*math.sin(a),.01),.85)
    collider((0,0,1.55),(1.20,1.20,3.1));ANCHORS['door']=[0,-.82,.12]

def house():
    box('foundation',(0,0,.11),(2.1,1.85,.22),'stone_light',.04)
    box('house_walls',(0,0,.98),(1.85,1.60,1.74),'white',.06)
    # Gable as a triangular prism.
    verts=[(-.925,y,1.82) for y in (-.80,.80)]+[(.925,y,1.82) for y in (-.80,.80)]+[(0,y,2.57) for y in (-.80,.80)]
    faces=[(0,2,4),(1,5,3),(0,1,3,2),(0,4,5,1),(2,3,5,4)]
    mesh=bpy.data.meshes.new('gable');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new('gable',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(M['white'])
    for s in (-1,1):
        roof=box('roof_slope',(s*.52,0,2.17),(1.39,1.99,.10),'wood',.015)
        roof.rotation_euler[1]=s*.676
        for row in range(5):
            x=s*(.10+row*.213);z=2.61-abs(x)*.80
            for col in range(7):
                tile=box('terracotta_tile',(x,-.87+col*.29,z),(.27,.31,.07),
                         'orange_light' if (row+col)%4==0 else 'orange',.027)
                tile.rotation_euler[1]=s*.676
    for y in [-.89+i*.29 for i in range(7)]:
        cap=cone('ridge_tile',(0,y,2.61),.09,.09,.285,'orange_light',12)
        cap.rotation_euler[0]=math.pi/2
    box('chimney',(-.47,.35,2.62),(.28,.30,.76),'white',.025)
    box('chimney_top',(-.47,.35,3.02),(.37,.38,.09),'stone_light',.02)
    box('chimney_dark',(-.47,.35,3.071),(.23,.24,.016),'metal',.005)
    door(-.84,.16,.64,1.13)
    torus('round_window_frame',(0,-.855,1.68),.15,.036,'wood_light',(math.pi/2,0,0))
    win=cone('round_window',(0,-.854,1.68),.13,.13,.027,'blue',24);win.rotation_euler[0]=math.pi/2
    for s in (-1,1):
        box('side_window_frame',(s*.956,.12,1.11),(.035,.49,.63),'wood_light',.02)
        box('side_window',(s*.978,.12,1.11),(.020,.40,.54),'yellow',.01)
        box('side_window_bar',(s*.990,.12,1.11),(.018,.04,.54),'wood',.006)
        bush((s*.91,-.81,.14),1)
    for i in range(2):box('entry_step',(0,-1.10-i*.29,.14-i*.055),(.88,.31,.17-i*.04),'stone_light',.02)
    collider((0,0,1.3),(2.02,1.8,2.6));ANCHORS['door']=[0,-1.35,.20]

REGISTRY={
 'island_large':(lambda:island(3),'environment'), 'island_small':(lambda:island(1.6),'environment'),
 'grass_tile':(lambda:tile('grass'),'environment'),'path_straight':(lambda:tile('straight'),'environment'),
 'path_corner':(lambda:tile('corner'),'environment'),'water_tile':(water,'environment'),
 'bridge_straight':(lambda:bridge(False),'environment'),'bridge_curved':(lambda:bridge(True),'environment'),
 'fence_rope':(lambda:fence(True),'environment'),'fence_wood':(lambda:fence(False),'environment'),
 'stairs_three':(stairs,'environment'),'tree_round':(tree,'environment'),'palm':(palm,'environment'),
 'rock_large':(lambda:rock(seed=83),'environment'),'rock_small':(lambda:rock((0,0,.16),(.25,.22,.19),84),'environment'),
 'flower_bush':(bush,'environment'),'bench':(bench,'environment'),'cloud':(cloud,'environment'),
 'lighthouse':(lighthouse,'architecture'),'house':(house,'architecture')}

def build():
    global COL,ANCHORS,R
    if (OUT/'manifest.json').exists():raise RuntimeError('Version exists; do not overwrite')
    entries=[]
    for index,(name,(fn,family)) in enumerate(REGISTRY.items()):
        dest=OUT/name;dest.mkdir(exist_ok=True)
        if (dest/f'{name}.blend').exists():
            entries.append(json.loads((dest/'asset.json').read_text(encoding='utf8')));continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        COL=[];ANCHORS={};R=random.Random(1709+index);materials();fn()
        objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
        bpy.ops.object.select_all(action='SELECT')
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join();obj=bpy.context.object;obj.name=name
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        obj.data.calc_loop_triangles()
        coordinates=[obj.matrix_world@v.co for v in obj.data.vertices]
        minimum=[min(p[i] for p in coordinates) for i in range(3)]
        maximum=[max(p[i] for p in coordinates) for i in range(3)]
        # Rocks receive conservative box proposals; plants/water/cloud are nonblocking.
        if name.startswith('rock_'):collider([(minimum[i]+maximum[i])/2 for i in range(3)],
                                            [maximum[i]-minimum[i] for i in range(3)])
        data={'id':name,'family':family,'units':'meters','up':'Z','front':'-Y',
          'pivot':'local origin; terrain pivot at walk-surface height',
          'triangles':len(obj.data.loop_triangles),'bounds':{'min':minimum,'max':maximum},
          'anchors':ANCHORS,'collider_proposals':COL,'colliders_integrated':False,
          'status':'visual_candidate','animations':[],
          'limitations':['Static closed model; no interiors or gameplay',
                         'Collision descriptors need implementation and testing in engine']}
        bpy.ops.export_scene.gltf(filepath=str(dest/f'{name}.glb'),export_format='GLB',
                                 use_selection=True,export_animations=False)
        data['glb_bytes']=(dest/f'{name}.glb').stat().st_size
        (dest/'asset.json').write_text(json.dumps(data,indent=2),encoding='utf8')
        bpy.ops.wm.save_as_mainfile(filepath=str(dest/f'{name}.blend'))
        entries.append(data);print('ASSET_SAVED',name,flush=True)
    (OUT/'manifest.json').write_text(json.dumps({'version':'v001','assets':entries,
      'reference_sheets':REFERENCES,
      'status':'generated_pending_visual_review'},indent=2),encoding='utf8')

def render(family):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    materials();manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf8'))
    entries=[a for a in manifest['assets'] if a['family']==family]
    columns=6 if family in ('environment','props') else 2
    row_spacing=4.5 if family=='props' else 3.25
    for i,data in enumerate(entries):
        name=data['id'];before=set(bpy.context.scene.objects)
        bpy.ops.import_scene.gltf(filepath=str(OUT/name/f'{name}.glb'))
        obj=next(o for o in set(bpy.context.scene.objects)-before if o.type=='MESH')
        # Imported glTF is converted back to Blender Z-up by the importer.
        lo=data['bounds']['min'];hi=data['bounds']['max']
        extent=max(hi[j]-lo[j] for j in range(3));scale=2.20/extent
        x=(i%columns-(columns-1)/2)*3.25;y=-(i//columns)*row_spacing
        obj.scale*=scale
        obj.location=(x-(lo[0]+hi[0])*.5*scale,y-(lo[1]+hi[1])*.5*scale,-lo[2]*scale+.15)
        if family=='props' and name=='backpack':
            obj.rotation_mode='QUATERNION'
            obj.rotation_quaternion=Quaternion((0,0,1),math.pi) @ obj.rotation_quaternion
            obj.location.x=x+(lo[0]+hi[0])*.5*scale
            obj.location.y=y+(lo[1]+hi[1])*.5*scale
        box('display_plinth',(x,y,0),(2.85,2.75,.18),'white',.08)
        bpy.ops.object.text_add(location=(x-1.20,y-1.41,.105))
        label=bpy.context.object;label.data.body=f'{i+1:02d}  {name.replace("_"," ")}'
        label.data.size=.135;label.data.extrude=0;label.data.materials.append(M['metal'])
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU'
    scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.render.threads_mode='FIXED';scene.render.threads=2
    scene.render.resolution_x=1536 if family in ('environment','props') else 1120
    scene.render.resolution_y=1200 if family=='props' else (1050 if family=='environment' else 840)
    scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.62,.79,.73,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
    center=Vector((0,-row_spacing*((len(entries)-1)//columns)/2,.2))
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.12));bpy.context.object.data.materials.append(M['grass_dark'] if 'grass_dark' in M else M['glass'])
    for loc,power,size in [((-6,-8,12),2400,9),((7,4,10),1700,7)]:
        bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size
        o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
    offset=(7,-13,16) if family=='architecture' else ((0,-14,18) if family=='props' else (0,-13,16))
    bpy.ops.object.camera_add(location=center+Vector(offset))
    cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=22 if family in ('props','environment') else 8.4;scene.camera=cam
    scene.render.filepath=str(OUT/f'{family}.png');scene.render.image_settings.file_format='PNG'
    bpy.ops.render.render(write_still=True)

if __name__=='__main__':
    if ACTION=='build':build()
    elif ACTION in ('environment','architecture'):render(ACTION)
    else:raise ValueError(ACTION)
