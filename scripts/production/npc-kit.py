"""YAIS reference-led static NPCs. Blender background, deterministic, no add-ons.

Usage: blender -b -t 2 --python-exit-code 1 --python npc-kit.py -- build ID
       ... -- render ID VIEW  | verify ID | manifest
Append --refine for v002 (wheelchair child / educator / community guide).
One process/model or render. Refuse overwriting saved geometry.
Front = -Y, up = Z, meters. Not rigged or mobile-optimized yet.
"""
from pathlib import Path
import sys, math, json, random
import bpy
import bmesh
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from mascot import mat, oval, box, line, star, finish

ROOT = Path(__file__).resolve().parents[2]
VERSION = 'v002' if '--refine' in sys.argv else 'v001'
OUT = ROOT / 'assets/production/npc' / VERSION
CATALOG = ROOT / 'assets/production/npc/v001'
IDS = {'child_explorer':'Niño explorador', 'child_wheelchair':'Niña en silla de ruedas',
       'educator':'Educadora', 'community_guide':'Guía comunitario'}
VIEWS = ('front','three-quarter','side','back')
CURRENT = {id:('v001' if id=='child_explorer' else 'v002') for id in IDS}
P = {}

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def palette():
    colors = {
        'skin_light':(.64,.285,.115), 'skin_dark':(.37,.135,.058),
        'skin_adult':(.57,.23,.085), 'skin_guide':(.34,.135,.062),
        'ear_light':(.51,.155,.063), 'ear_dark':(.27,.074,.035),
        'hair_brown':(.105,.036,.018), 'hair_highlight':(.15,.057,.028),
        'hair_dark':(.038,.019,.015), 'hair_soft':(.06,.030,.024),
        'ink':(.015,.009,.008), 'eye_brown':(.08,.029,.012),
        'ivory':(.94,.90,.79), 'white':(.95,.97,1), 'mouth':(.22,.038,.020),
        'blue':(.013,.29,.64), 'blue_light':(.035,.45,.82), 'blue_dark':(.008,.09,.26),
        'olive':(.17,.285,.072), 'olive_dark':(.080,.15,.030),
        'yellow':(1,.61,.018), 'orange':(1,.30,.014), 'pink':(.82,.045,.081),
        'purple':(.29,.083,.61), 'purple_light':(.44,.17,.77),
        'denim':(.025,.15,.36), 'denim_cuff':(.105,.32,.57),
        'beige':(.64,.43,.235), 'beige_light':(.79,.59,.36),
        'cream':(.91,.78,.52), 'teal':(.015,.34,.31),
        'boot':(.20,.073,.027), 'rubber':(.025,.031,.035),
        'frame':(.07,.085,.09), 'metal':(.40,.46,.46), 'seat':(.043,.051,.063)}
    for name,col in colors.items(): P[name] = mat(name,col,.7 if 'hair' in name else .6)
    P['ink'].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.2
    P['metal'].node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.65

def mesh(name,verts,faces,m):
    data=bpy.data.meshes.new(name); data.from_pydata(verts,[],faces); data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    return finish(obj,name,m)

def sweep(name,points,widths,depths,m,axis=(1,0,0),steps=6,sides=12):
    """Smooth tapered elliptical tube; clothes/locks/straps, capped ends."""
    pts=[Vector(p) for p in points]; centers=[]; ws=[]; ds=[]
    for k in range(len(pts)-1):
        p0,p1,p2,p3=pts[max(k-1,0)],pts[k],pts[k+1],pts[min(k+2,len(pts)-1)]
        for j in range(steps):
            t=j/steps
            centers.append(.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t))
            ws.append(widths[k]*(1-t)+widths[k+1]*t);ds.append(depths[k]*(1-t)+depths[k+1]*t)
    centers.append(pts[-1]);ws.append(widths[-1]);ds.append(depths[-1]);verts=[]
    for i,p in enumerate(centers):
        tangent=(centers[min(i+1,len(centers)-1)]-centers[max(0,i-1)]).normalized()
        right=Vector(axis);right-=tangent*right.dot(tangent)
        if right.length < .01: right=Vector((0,1,0));right-=tangent*right.dot(tangent)
        right.normalize();normal=tangent.cross(right).normalized()
        for k in range(sides):
            a=k*math.tau/sides;verts.append(p+right*ws[i]*math.cos(a)+normal*ds[i]*math.sin(a))
    faces=[]
    for j in range(len(centers)-1):
        for i in range(sides):
            a=j*sides+i;b=j*sides+(i+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(reversed(range(sides))),tuple(range(len(verts)-sides,len(verts)))])
    return mesh(name,verts,faces,m)

def limb(name,a,b,r1,r2,m):
    return sweep(name,[a,b],[r1,r2],[r1*.92,r2*.92],m,steps=5,sides=16)

def torso(name,rings,m):
    # ring = z, width-radius, depth-radius, y-center
    verts=[]
    for z,w,d,y in rings:
        for i in range(32):
            a=math.tau*i/32;verts.append((w*math.cos(a),y+d*math.sin(a),z))
    faces=[]
    for k in range(len(rings)-1):
        for i in range(32):
            a=k*32+i;b=k*32+(i+1)%32;faces.append((a,b,b+32,a+32))
    faces.extend([tuple(reversed(range(32))),tuple(range(len(verts)-32,len(verts)))])
    obj=mesh(name,verts,faces,m)
    sub=obj.modifiers.new('soft tailored surface','SUBSURF');sub.levels=2
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=sub.name)
    return obj

def torus(name,pos,major,minor,m,normal='Z'):
    bpy.ops.mesh.primitive_torus_add(major_segments=48,minor_segments=10,location=pos,major_radius=major,minor_radius=minor)
    obj=finish(bpy.context.object,name,m)
    if normal=='X': obj.rotation_euler[1]=math.pi/2
    if normal=='Y': obj.rotation_euler[0]=math.pi/2
    return obj

def disc(name,pos,radius,depth,m,normal='X'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=radius,depth=depth,location=pos)
    obj=finish(bpy.context.object,name,m)
    if normal=='X':obj.rotation_euler[1]=math.pi/2
    elif normal=='Y':obj.rotation_euler[0]=math.pi/2
    mod=obj.modifiers.new('rim bevel','BEVEL');mod.width=.004;mod.segments=2
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def face_y(x,z,center,scale):
    cx,cy,cz=center;rx,ry,rz=scale
    return cy-ry*math.sqrt(max(.002,1-((x-cx)/rx)**2-((z-cz)/rz)**2))

def face_patch(name,c,sc,x,z,rx,rz,m,lift=.002):
    verts=[(x,face_y(x,z,c,sc)-lift-.002,z)]
    for ring in range(1,7):
        r=ring/6
        for i in range(32):
            a=math.tau*i/32;xx=x+rx*r*math.cos(a);zz=z+rz*r*math.sin(a)
            verts.append((xx,face_y(xx,zz,c,sc)-lift-.002*(1-r*r),zz))
    faces=[(0,1+i,1+(i+1)%32) for i in range(32)]
    for j in range(5):
        for i in range(32):
            a=1+j*32+i;b=1+j*32+(i+1)%32;faces.append((a,b,b+32,a+32))
    return mesh(name,verts,faces,m)

def facial_line(name,c,sc,xzs,m,r=.003,lift=.003):
    return line(name,[(x,face_y(x,z,c,sc)-lift,z) for x,z in xzs],m,r)

def head(center,scale,skin,dark=False,adult=False):
    c=center;rx,ry,rz=scale;cx,cy,cz=c
    oval('head_surface',c,scale,skin,48,32)
    for s in (-1,1):
        oval(f'ear_{s}',(cx+s*rx*.98,cy,cz-.028),(rx*.18,.043,rz*.25),skin)
        oval(f'ear_inner_{s}',(cx+s*rx*1.025,cy-.036,cz-.025),(.021,.008,.029),P['ear_dark' if dark else 'ear_light'],16,12)
        x=cx+s*rx*.40;z=cz+rz*.06
        erx=rx*(.165 if adult else .183);erz=rz*(.188 if adult else .213)
        face_patch(f'eye_rim_{s}',c,scale,x,z,erx*1.12,erz*1.1,P['mouth'],.001)
        face_patch(f'eye_white_{s}',c,scale,x,z,erx,erz,P['ivory'],.003)
        face_patch(f'eye_iris_{s}',c,scale,x+s*.001,z-.002,erx*.81,erz*.90,P['eye_brown'],.005)
        face_patch(f'eye_pupil_{s}',c,scale,x+s*.001,z-.002,erx*.64,erz*.81,P['ink'],.006)
        face_patch(f'eye_glint_{s}',c,scale,x-erx*.23,z+erz*.37,erx*.25,erz*.24,P['white'],.009)
        bx=[(x-erx*.95,z+erz*1.65),(x-erx*.22,z+erz*1.86),(x+erx*.85,z+erz*1.66)]
        facial_line(f'brow_{s}',c,scale,bx,P['hair_dark' if dark else 'hair_brown'],.009 if adult else .007)
    nose_z=cz-rz*.23;nose_y=face_y(cx,nose_z,c,scale)
    oval('nose',(cx,nose_y-.008,nose_z),(.030 if adult else .026,.026,.020),skin,24,16)
    mouth_z=cz-rz*.47
    facial_line('smile',c,scale,[(cx-.061,mouth_z+.010),(cx-.032,mouth_z-.002),(cx,mouth_z-.007),(cx+.032,mouth_z-.002),(cx+.061,mouth_z+.010)],P['mouth'],.004)
    return c,scale

def hair_shell(c,sc,m):
    # Scalp patch: high forehead, lower nape. No hair helmet covering the face.
    verts=[(c[0],c[1],c[2]+sc[2])];rows=12;cols=48
    for j in range(1,rows+1):
        for i in range(cols):
            a=i*math.tau/cols;front=max(0,-math.sin(a));theta=(1.87-.84*front)*j/rows
            verts.append((c[0]+sc[0]*math.sin(theta)*math.cos(a),c[1]+sc[1]*math.sin(theta)*math.sin(a),c[2]+sc[2]*math.cos(theta)))
    faces=[(0,1+i,1+(i+1)%cols) for i in range(cols)]
    for j in range(rows-1):
        for i in range(cols):
            a=1+j*cols+i;b=1+j*cols+(i+1)%cols;faces.append((a,b,b+cols,a+cols))
    return mesh('hair_scalp',verts,faces,m)

def hair_boy(c,sc):
    hair_shell(c,(sc[0]*1.04,sc[1]*1.04,sc[2]*1.04),P['hair_brown'])
    random.seed(1709)
    for row,(theta,count) in enumerate([(0.35,6),(.75,10),(1.15,13),(1.62,12)]):
        for i in range(count):
            a=math.tau*i/count+.18*row
            if row==3 and math.sin(a)<-.25:continue
            pts=[]
            for k in range(4):
                aa=a+.17*k;tt=theta+.10*k-.20
                pts.append((c[0]+sc[0]*1.06*math.sin(tt)*math.cos(aa),c[1]+sc[1]*1.07*math.sin(tt)*math.sin(aa),c[2]+sc[2]*1.07*math.cos(tt)+.017*math.sin(k*math.pi/3)))
            sweep(f'hair_lock_{row}_{i}',pts,[.008,.045,.034,.002],[.008,.025,.022,.002],P['hair_highlight' if i%4==0 else 'hair_brown'],steps=5)
    # Readable asymmetrical fringe, exposed brows.
    for i in range(5):
        x=-.16+i*.07
        sweep(f'fringe_{i}',[(x+.08,-.07,c[2]+.205),(x+.06,-.145,c[2]+.19),(x+.015,-.18,c[2]+.13),(x-.015,-.17,c[2]+.09)], [.012,.045,.035,.001],[.01,.029,.023,.001],P['hair_brown'])

def curls(c,r,name,count=34):
    oval(name+'_core',c,(r,r*.86,r),P['hair_dark'])
    golden=math.pi*(3-math.sqrt(5))
    for i in range(count):
        z=1-2*(i+.5)/count;a=golden*i;rr=math.sqrt(1-z*z)
        pos=(c[0]+r*.87*rr*math.cos(a),c[1]+r*.75*rr*math.sin(a),c[2]+r*.88*z)
        size=r*(.23+.035*(i%3))
        ob=oval(f'{name}_curl_{i}',pos,(size,size*.88,size),P['hair_soft' if i%4==0 else 'hair_dark'],16,10)
        ob.rotation_euler[1]=a

def hair_girl(c,sc):
    hair_shell(c,(sc[0]*1.04,sc[1]*1.08,sc[2]*1.05),P['hair_dark'])
    curls((-.18,.015,c[2]+.175),.124,'puff_L')
    curls((.18,.015,c[2]+.175),.124,'puff_R')
    for i in range(24):
        a=math.tau*i/24
        if math.sin(a)<-.35:continue
        curls((sc[0]*.85*math.cos(a),sc[1]*.88*math.sin(a),c[2]+.025),.047,f'nape_{i}',8)
    # Wide yellow hairband arch, following the skull.
    pts=[]
    for i in range(13):
        a=math.pi*i/12;pts.append((sc[0]*1.025*math.cos(a),-.108,c[2]+.037+sc[2]*.93*math.sin(a)))
    sweep('yellow_headband',pts,[.018]*13,[.012]*13,P['yellow'],axis=(0,1,0),steps=3)
    for i in range(8):
        x=-.154+i*.044;z=c[2]+.105+.05*(1-(x/.17)**2)
        curls((x,-.145,z),.032,f'fringe_curl_{i}',7)

def hair_woman(c,sc):
    hair_shell(c,(sc[0]*1.08,sc[1]*1.08,sc[2]*1.07),P['hair_dark'])
    for i in range(17):
        a=math.tau*i/17
        if math.sin(a)<-.55:continue
        x=math.cos(a)*sc[0];y=math.sin(a)*sc[1]
        pts=[(x*.82,y*.8,c[2]+.17),(x*1.13,y*1.08,c[2]+.065),(x*1.17+.022*math.sin(i),y*1.15,c[2]-.055),(x*1.13,y*1.1,c[2]-.17),(x*.97,y,c[2]-.21)]
        sweep(f'wavy_hair_{i}',pts,[.018,.059,.050,.046,.005],[.018,.046,.044,.034,.004],P['hair_soft' if i%3==0 else 'hair_dark'])
    for s in (-1,1):
        for i in range(3):
            pts=[(s*.012,-.055,c[2]+.212),(s*.06,-.14,c[2]+.225-i*.019),(s*.13,-.172,c[2]+.13-i*.017),(s*.215,-.10,c[2]+.09-i*.029)]
            if VERSION=='v002':
                pts=[(s*.012,-.035,c[2]+.201),(s*.067,-.094,c[2]+.176-i*.012),(s*.125,-.126,c[2]+.104-i*.013),(s*.183,-.045,c[2]+.035-i*.018)]
            sweep(f'swept_fringe_{s}_{i}',pts,[.009,.040,.035,.001],[.008,.023,.021,.001],P['hair_soft'])
        torus(f'gold_earring_{s}',(s*.214,-.031,c[2]-.089),.026,.0055,P['yellow'],'Y')

def hand(name,pos,skin,grip=True,size=1):
    x,y,z=pos
    oval(name+'_palm',pos,(.043*size,.028*size,.048*size),skin)
    for i in range(4):
        oval(name+f'_finger_{i}',(x+(i-1.5)*.017*size,y-.014*size,z-(.006 if grip else .031)*size),(.010*size,.022*size,.027*size),skin,16,12)
    oval(name+'_thumb',(x+.037*size,y-.018*size,z+.013*size),(.015*size,.023*size,.027*size),skin,16,12)

def shoe(name,x,y,z,color,scale=1):
    box(name+'_sole',(x,y-.025*scale,z+.021*scale),(.132*scale,.239*scale,.042*scale),P['ivory'],.025*scale)
    oval(name+'_upper',(x,y-.005*scale,z+.068*scale),(.062*scale,.106*scale,.057*scale),color)
    oval(name+'_toe',(x,y-.10*scale,z+.050*scale),(.061*scale,.032*scale,.029*scale),P['ivory'])
    box(name+'_tongue',(x,y-.021*scale,z+.114*scale),(.065*scale,.065*scale,.012*scale),color,.010)
    for i in range(3):
        line(name+f'_lace_{i}',[(x-.032*scale,y-(.004+.026*i)*scale,z+(.118-.008*i)*scale),(x,y-(.008+.026*i)*scale,z+(.121-.008*i)*scale),(x+.032*scale,y-(.004+.026*i)*scale,z+(.118-.008*i)*scale)],P['ivory'],.004*scale)

def backpack(z,w=.27,h=.30,color='blue',cy=.13):
    box('backpack_body',(0,cy,z),(w,.135,h),P[color],.050)
    box('backpack_pocket',(0,cy+.071,z-.038),(w*.79,.046,h*.53),P[color],.026)
    line('backpack_zip',[(-w*.35,cy+.098,z+.032),(0,cy+.105,z+.039),(w*.35,cy+.098,z+.032)],P['blue_dark' if color=='blue' else 'purple_light'],.004)
    line('backpack_handle',[(-.035,cy,z+h*.47),(-.025,cy,z+h*.65),(.025,cy,z+h*.65),(.035,cy,z+h*.47)],P[color],.012)
    if color=='blue':star('backpack_gold_star',(0,cy+.104,z-.030),.074,P['yellow'])
    for s in (-1,1):
        pts=[(s*w*.33,cy,z+h*.38),(s*w*.39,0,z+h*.52),(s*w*.40,-.115,z+h*.25),(s*w*.38,-.130,z-h*.28),(s*w*.34,cy,z-h*.39)]
        if VERSION=='v002' and color=='purple':
            pts=[(s*w*.33,cy,z+h*.34),(s*w*.39,.035,.707),(s*w*.40,-.065,.680),(s*w*.40,-.101,.610),(s*w*.38,-.10,.513),(s*w*.34,cy,.505)]
        sweep(f'backpack_strap_{s}',pts,[.020]*len(pts),[.008]*len(pts),P[color],steps=6)

def daisy(name,pos,r,petal,center,normal='Y'):
    x,y,z=pos
    for i in range(6):
        a=i*math.tau/6
        if normal=='Y':
            ob=oval(name+f'_petal_{i}',(x+math.sin(a)*r*.50,y,z+math.cos(a)*r*.50),(r*.28,.006,r*.48),petal,16,12);ob.rotation_euler[1]=a
        else:
            ob=oval(name+f'_petal_{i}',(x,y+math.sin(a)*r*.50,z+math.cos(a)*r*.50),(.006,r*.28,r*.48),petal,16,12);ob.rotation_euler[0]=-a
    oval(name+'_center',pos,(r*.25,.011,r*.25) if normal=='Y' else (.011,r*.25,r*.25),center,20,12)

def build_boy():
    skin=P['skin_light']; c=(0,0,.944);sc=(.206,.172,.217)
    head(c,sc,skin);hair_boy(c,sc)
    oval('neck',(0,0,.736),(.068,.068,.080),skin)
    torso('white_tshirt',[(.435,.154,.097,0),(.45,.158,.106,0),(.59,.149,.105,0),(.675,.166,.085,0),(.706,.106,.069,0)],P['ivory'])
    torus('blue_collar',(0,0,.708),.068,.010,P['blue'])
    # Ocean band and wave crest, modeled across the curved shirt surface.
    torso('ocean_blue_band',[(.475,.156,.108,0),(.482,.158,.110,0),(.535,.156,.110,0),(.539,.153,.107,0)],P['blue'])
    sweep('ocean_wave',[(-.130,-.080,.535),(-.069,-.099,.539),(-.013,-.111,.579),(.039,-.109,.577),(.058,-.103,.552)], [.006,.018,.025,.025,.009],[.006,.008,.008,.008,.006],P['blue_light'],axis=(0,0,1))
    oval('wave_foam',(.041,-.119,.56),(.022,.008,.016),P['ivory'])
    box('shorts_waist',(0,0,.437),(.290,.193,.070),P['olive'],.025)
    for s in (-1,1):
        x=s*.085
        limb(f'shorts_leg_{s}',(x,0,.44),(s*.092,0,.288),.080,.079,P['olive'])
        box(f'cargo_pocket_{s}',(s*.149,-.033,.343),(.052,.103,.075),P['olive'],.012)
        box(f'pocket_flap_{s}',(s*.151,-.035,.374),(.054,.107,.021),P['olive_dark'],.007)
        limb(f'calf_{s}',(s*.095,0,.305),(s*.106,-.006,.135),.051,.040,skin)
        limb(f'sock_{s}',(s*.106,-.006,.160),(s*.106,-.007,.100),.043,.042,P['ivory'])
        shoe(f'sneaker_{s}',s*.111,-.021,0,P['blue'])
        shoulder=(s*.147,0,.663);elbow=(s*.201,-.051,.555);grip=(s*.120,-.158,.607)
        limb(f'sleeve_{s}',shoulder,(s*.178,-.022,.609),.061,.056,P['ivory'])
        limb(f'sleeve_blue_cuff_{s}',(s*.173,-.017,.62),(s*.181,-.026,.600),.057,.056,P['blue'])
        limb(f'upper_arm_{s}',(s*.18,-.025,.608),elbow,.044,.045,skin)
        oval(f'elbow_{s}',elbow,(.045,.045,.045),skin)
        limb(f'forearm_{s}',elbow,grip,.045,.034,skin);hand(f'hand_{s}',grip,skin,size=.85)
    backpack(.58)

def wheelchair():
    for s in (-1,1):
        x=s*.274;cy=.03;cz=.272
        torus(f'wheel_{s}_tire',(x,cy,cz),.244,.027,P['rubber'],'X')
        torus(f'wheel_{s}_silver_rim',(x+s*.019,cy,cz),.218,.009,P['metal'],'X')
        disc(f'wheel_{s}_orange_guard',(x+s*.009,cy,cz),.205,.015,P['yellow'])
        daisy(f'wheel_{s}_flower',(x+s*.024,cy,cz),.144,P['pink'],P['ivory'],'X')
        disc(f'wheel_{s}_hub',(x+s*.032,cy,cz),.041,.025,P['ivory'])
        torus(f'wheel_{s}_handrim',(x+s*.053,cy,cz),.230,.009,P['metal'],'X')
        line(f'frame_{s}',[(s*.21,.19,.72),(s*.21,.19,.28),(s*.21,-.24,.19),(s*.21,-.30,.12)],P['frame'],.019)
        line(f'push_handle_{s}',[(s*.21,.18,.72),(s*.21,.27,.72)],P['rubber'],.022)
        box(f'armrest_{s}',(s*.208,-.043,.523),(.064,.282,.038),P['seat'],.014)
        line(f'armrest_support_{s}',[(s*.205,-.135,.505),(s*.205,-.13,.365)],P['frame'],.012)
        torus(f'caster_{s}_tire',(s*.214,-.299,.071),.050,.016,P['rubber'],'X')
        disc(f'caster_{s}_hub',(s*.216,-.299,.071),.038,.028,P['orange'])
        line(f'caster_{s}_fork',[(s*.24,-.273,.166),(s*.24,-.298,.071)],P['metal'],.012)
    box('chair_seat',(0,0,.439),(.41,.39,.050),P['seat'],.025)
    box('chair_backrest',(0,.183,.590),(.395,.035,.29),P['seat'],.027)
    box('chair_footrest',(0,-.342,.089),(.37,.170,.026),P['frame'],.012)
    line('seat_crossbrace_1',[(-.20,-.05,.31),(.20,.14,.40)],P['metal'],.012)
    line('seat_crossbrace_2',[(.20,-.05,.31),(-.20,.14,.40)],P['metal'],.012)

def build_girl():
    skin=P['skin_dark'];c=(0,.004,.944);sc=(.199,.163,.208)
    wheelchair();head(c,sc,skin,True);hair_girl(c,sc)
    oval('neck',(0,.01,.737),(.066,.063,.060),skin)
    torso('yellow_tshirt',[(.47,.14,.102,.012),(.485,.146,.11,.012),(.62,.145,.103,.012),(.685,.156,.077,.012),(.721,.085,.061,.012)],P['yellow'])
    torus('tshirt_collar',(0,.012,.718),.063,.009,P['orange'])
    daisy('shirt_daisy',(0,-.102,.603),.059,P['ivory'],P['orange'])
    box('jeans_waist',(0,-.016,.482),(.292,.226,.077),P['denim'],.029)
    for s in (-1,1):
        x=s*.084
        hip=(x,.012,.459);knee=(x,-.220,.435);ankle=(x,-.26,.195)
        limb(f'jeans_thigh_{s}',hip,knee,.077,.067,P['denim'])
        oval(f'jeans_knee_{s}',knee,(.067,.067,.067),P['denim'])
        limb(f'jeans_shin_{s}',knee,ankle,.065,.048,P['denim'])
        limb(f'jeans_rolled_cuff_{s}',(x,-.258,.233),(x,-.261,.190),.054,.054,P['denim_cuff'])
        limb(f'ankle_{s}',(x,-.26,.195),(x,-.272,.145),.035,.033,skin)
        shoe(f'purple_sneaker_{s}',x,-.31,.105,P['purple'],.85)
        shoulder=(s*.146,.01,.669);elbow=(s*.210,-.054,.567);wrist=(s*.213,-.184,.526)
        limb(f'tshirt_sleeve_{s}',shoulder,(s*.177,-.009,.619),.060,.055,P['yellow'])
        limb(f'upper_arm_{s}',(s*.177,-.009,.625),elbow,.044,.044,skin)
        oval(f'elbow_{s}',elbow,(.044,.044,.044),skin)
        limb(f'forearm_{s}',elbow,wrist,.042,.032,skin);hand(f'hand_{s}',wrist,skin,False,.80)
    backpack(.607,.268,.284,'purple',.205)

def adult_legs(guide=False):
    skin=P['skin_guide' if guide else 'skin_adult']
    for s in (-1,1):
        x=s*.12
        # Tailored wide trousers, flat hems rather than sausage legs.
        ob=torso(f'trouser_{s}',[(.159,.097,.095,0),(.175,.098,.097,0),(.34,.094,.098,0),(.65,.102,.107,0),(.80,.103,.116,0)],P['beige'])
        ob.location.x=x
        hem=torso(f'rolled_hem_{s}',[(.16,.099,.098,0),(.17,.103,.103,0),(.198,.103,.103,0),(.203,.10,.10,0)],P['beige_light']);hem.location.x=x
        limb(f'ankle_{s}',(x,0,.18),(x,0,.088),.047,.044,skin)
        shoe(f'boot_{s}' if guide else f'sneaker_{s}',x,-.022,0,P['boot' if guide else 'blue'],1.02)
    box('trouser_waist',(0,0,.785),(.428,.235,.105),P['beige'],.030)

def collar(name,z,m):
    for s in (-1,1):
        ob=box(name+str(s),(s*.059,-.101,z),(.087,.018,.095),m,.008)
        ob.rotation_euler[1]=s*-.35

def rear_garment(name,m):
    """Tailored continuous back/shoulders instead of a rectangular back panel."""
    rings=[(.807,.205,.129),(.827,.211,.140),(1.02,.20,.14),(1.10,.199,.121),(1.15,.161,.102),(1.178,.10,.077)]
    verts=[]
    for z,w,d in rings:
        for j in range(25):
            a=math.pi*j/24;verts.append((w*math.cos(a),d*math.sin(a),z))
    faces=[]
    for k in range(len(rings)-1):
        for j in range(24):
            a=k*25+j;faces.append((a,a+1,a+26,a+25))
    obj=mesh(name,verts,faces,m)
    bpy.context.view_layer.objects.active=obj
    sub=obj.modifiers.new('tailored_rounding','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
    solid=obj.modifiers.new('cloth_thickness','SOLIDIFY');solid.thickness=.016;bpy.ops.object.modifier_apply(modifier=solid.name)
    return obj

def build_woman():
    skin=P['skin_adult'];c=(0,0,1.43);sc=(.182,.15,.202)
    adult_legs();head(c,sc,skin,adult=True);hair_woman(c,sc)
    oval('neck',(0,0,1.228),(.065,.067,.086),skin)
    torso('inner_white_shirt',[(.799,.17,.108,0),(.88,.18,.12,0),(1.07,.171,.112,0),(1.165,.172,.080,0),(1.192,.078,.063,0)],P['ivory'])
    # Open blue overshirt: rear and side panels, central white shirt exposed.
    if VERSION=='v002':rear_garment('jacket_back',P['blue'])
    else:box('jacket_back',(0,.090,1.008),(.375,.079,.425),P['blue'],.037)
    for s in (-1,1):
        sweep(f'jacket_front_{s}',[(s*.12,-.072,.809),(s*.134,-.082,.87),(s*.130,-.085,1.08),(s*.123,-.031,1.163)], [.065,.069,.060,.055],[.030,.034,.031,.039],P['blue'],steps=7,sides=16)
        line(f'jacket_stitch_{s}',[(s*.070,-.109,.825),(s*.072,-.121,.92),(s*.077,-.117,1.09)],P['blue_light'],.002)
        box(f'jacket_pocket_{s}',(s*.127,-.117,1.056),(.069,.015,.075),P['blue_light'],.008)
        shoulder=(s*.182,0,1.136)
        elbow=(s*.238,-.04,.931)
        wrist=(s*.118,-.190,.97) if s==-1 else (s*.253,-.047,.718)
        limb(f'jacket_sleeve_{s}',shoulder,elbow,.072,.060,P['blue'])
        limb(f'jacket_cuff_{s}',(s*.231,-.037,.959),(s*.243,-.043,.918),.065,.063,P['blue_light'])
        oval(f'elbow_{s}',elbow,(.054,.052,.054),skin)
        limb(f'forearm_{s}',elbow,wrist,.051,.032,skin)
        hand(f'hand_{s}',wrist,skin,s==-1,.95)
    collar('blue_collar_',1.167,P['blue_light'])
    box('book_pages',(-.126,-.153,1.035),(.134,.052,.218),P['ivory'],.007)
    box('book_teal_cover',(-.126,-.185,1.035),(.148,.012,.233),P['teal'],.005)
    box('book_back_cover',(-.126,-.122,1.035),(.148,.012,.233),P['teal'],.005)
    box('book_orange_spine',(-.203,-.153,1.035),(.018,.071,.233),P['orange'],.005)
    line('lanyard',[(-.052,-.068,1.207),(-.048,-.120,1.115),(0,-.138,1.011),(.048,-.120,1.115),(.052,-.068,1.207)],P['blue_dark'],.005)
    box('badge',(0,-.147,.974),(.080,.013,.077),P['ivory'],.008)
    box('badge_clip',(0,-.15,1.015),(.019,.014,.021),P['metal'],.004)
    # Waist tie and loose fabric ends.
    line('waist_tie',[(-.154,-.096,.814),(0,-.128,.806),(.154,-.096,.814)],P['beige_light'],.009)
    for s in (-1,1):
        line(f'tie_loop_{s}',[(0,-.135,.803),(s*.047,-.145,.818),(s*.040,-.145,.781),(0,-.135,.803)],P['beige_light'],.007)
        sweep(f'tie_end_{s}',[(s*.011,-.14,.800),(s*.025,-.141,.753),(s*.029,-.145,.719)],[.011]*3,[.005]*3,P['beige_light'])

def build_man():
    skin=P['skin_guide'];c=(0,0,1.425);sc=(.186,.16,.209)
    adult_legs(True);head(c,sc,skin,True,True)
    oval('neck',(0,0,1.218),(.074,.072,.078),skin)
    hair_shell(c,(.194,.17,.222),P['hair_dark'])
    for i in range(18):
        a=i*math.tau/18
        if math.sin(a)<-.35:continue
        curls((.174*math.cos(a),.149*math.sin(a),1.378),.060,f'guide_hair_{i}',9)
    # Beard contour stays below mouth, with separate moustache lobes.
    for i in range(13):
        a=math.pi*i/12;x=.153*math.cos(a);z=1.363-.105*math.sin(a)
        oval(f'beard_curl_{i}',(x,face_y(x,z,c,sc)-.010,z),(.035,.029,.037),P['hair_dark'],20,12)
    for s in (-1,1):
        ob=oval(f'moustache_{s}',(s*.033,-.162,1.355),(.040,.021,.016),P['hair_dark']);ob.rotation_euler[1]=s*.18
    # Six-panel olive cap dome + curved bill.
    hair_shell((0,.009,1.477),(.202,.173,.212),P['olive'])
    brim=oval('cap_brim',(0,-.159,1.57),(.204,.121,.023),P['olive']);brim.rotation_euler[0]=-.11
    oval('cap_button',(0,.009,1.691),(.016,.016,.009),P['olive_dark'])
    for a in (0,math.pi/3,2*math.pi/3,math.pi,4*math.pi/3,5*math.pi/3):
        line('cap_panel_seam',[(.201*math.sin(t)*math.cos(a),.009+.174*math.sin(t)*math.sin(a),1.477+.213*math.cos(t)) for t in (.05,.3,.6,.9,1.08)],P['olive_dark'],.0018)
    torso('cream_shirt',[(.799,.19,.126,0),(.85,.197,.132,0),(1.04,.195,.127,0),(1.15,.196,.094,0),(1.193,.083,.069,0)],P['cream'])
    if VERSION=='v002':rear_garment('vest_back',P['olive'])
    else:box('vest_back',(0,.101,1.001),(.399,.08,.394),P['olive'],.026)
    for s in (-1,1):
        sweep(f'vest_front_{s}',[(s*.138,-.102,.809),(s*.138,-.115,.88),(s*.133,-.105,1.082),(s*.143,-.023,1.156)],[.067,.067,.064,.055],[.030,.032,.035,.038],P['olive'])
        for j,z in enumerate((.867,1.035)):
            box(f'vest_pocket_{s}_{j}',(s*.137,-.15,z),(.094,.030,.084),P['olive_dark'],.012)
            box(f'vest_flap_{s}_{j}',(s*.137,-.168,z+.032),(.098,.015,.029),P['olive'],.008)
            oval(f'vest_button_{s}_{j}',(s*.137,-.180,z+.024),(.009,.004,.009),P['yellow'],16,10)
        shoulder=(s*.195,0,1.128);elbow=(s*.262,-.055,.940)
        wrist=(s*.133,-.194,1.013) if s==-1 else (s*.263,-.064,.717)
        limb(f'shirt_sleeve_{s}',shoulder,elbow,.080,.063,P['cream'])
        limb(f'rolled_sleeve_{s}',(s*.254,-.049,.967),(s*.269,-.061,.923),.069,.066,P['ivory'])
        oval(f'elbow_{s}',elbow,(.055,.054,.055),skin)
        limb(f'forearm_{s}',elbow,wrist,.052,.036,skin);hand(f'hand_{s}',wrist,skin,s==-1,1)
    collar('cream_collar_',1.173,P['cream'])
    for z in (.913,1.015,1.10):oval('shirt_button',(0,-.134,z),(.008,.004,.008),P['beige'],16,10)
    box('belt',(0,-.005,.816),(.390,.271,.033),P['boot'],.012)
    box('buckle',(0,-.146,.817),(.059,.013,.047),P['yellow'],.004)
    box('buckle_center',(0,-.155,.817),(.036,.004,.025),P['boot'],.002)
    box('satchel',(-.236,.009,.696),(.213,.140,.26),P['olive_dark'],.034)
    box('satchel_flap',(-.236,-.068,.759),(.218,.027,.142),P['olive'],.020)
    oval('satchel_clasp',(-.236,-.088,.728),(.014,.006,.019),P['yellow'])
    pts=[(-.249,.013,.838),(-.215,-.11,.94),(-.12,-.15,1.11),(.143,-.031,1.175),(.156,.123,1.115),(-.247,.115,.83)]
    if VERSION=='v002':
        pts=[(-.249,.015,.829),(-.192,-.105,.861),(-.120,-.149,.947),(-.025,-.147,1.04),(.084,-.105,1.133),(.143,-.025,1.163),(.143,.048,1.154),(.080,.111,1.101),(-.025,.151,1.005),(-.140,.130,.90),(-.245,.065,.827)]
    sweep('satchel_strap',pts,[.018]*len(pts),[.007]*len(pts),P['olive_dark'])

BUILDERS={'child_explorer':build_boy,'child_wheelchair':build_girl,'educator':build_woman,'community_guide':build_man}

def geometry_report():
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    pts=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
    lo=[min(p[i] for p in pts) for i in range(3)];hi=[max(p[i] for p in pts) for i in range(3)]
    tris=0
    for o in meshes:o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
    return {'meshes':len(meshes),'triangles':tris,'bounds_z_up':{'min':lo,'max':hi},'height_m':round(hi[2]-lo[2],4)}

def build(id):
    dest=OUT/id;dest.mkdir(parents=True,exist_ok=True)
    if (dest/f'{id}.blend').exists() or (dest/f'{id}.glb').exists():raise RuntimeError('Saved version exists: create a new version rather than overwrite.')
    reset();palette();BUILDERS[id]();bpy.context.view_layer.update()
    # Canonical origin on floor, object parts preserve semantic names for next rig stage.
    report=geometry_report()
    for o in bpy.context.scene.objects:
        if o.type=='MESH':o.location.z-=report['bounds_z_up']['min'][2]
    bpy.context.view_layer.update();report=geometry_report()
    report.update({'id':id,'label':IDS[id],'version':VERSION,'status':'static_review_candidate','rig':False,'animations':[],
        'units':'meters','front':'-Y','up':'Z','reference':'02-primary-child-npcs-turnaround.png' if id.startswith('child') else '03-trusted-adults-turnaround.png',
        'collision':{'implemented':False,'proposal':'capsule' if id!='child_wheelchair' else 'rounded_box', 'bounds_z_up':report['bounds_z_up']},
        'limitations':['Static posed assembly, not a deformation-ready mesh','Artistic interpretation of approved sheet, new NPC fidelity pending review','No UV bake, LODs, rig, facial expressions, animations or runtime colliders','Multiple objects and materials: not yet mobile optimized']})
    bpy.context.scene.unit_settings.system='METRIC'
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.wm.save_as_mainfile(filepath=str(dest/f'{id}.blend'))
    bpy.ops.export_scene.gltf(filepath=str(dest/f'{id}.glb'),export_format='GLB',use_selection=True,export_animations=False)
    report['glb_bytes']=(dest/f'{id}.glb').stat().st_size
    (dest/'asset.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
    print('NPC_SAVED',json.dumps(report,ensure_ascii=False))

def load_glb(id):
    reset();bpy.ops.import_scene.gltf(filepath=str(OUT/id/f'{id}.glb'));bpy.context.view_layer.update()

def verify(id):
    load_glb(id);r=geometry_report()
    assert r['meshes']>30 and r['triangles']>1000
    for o in bpy.context.scene.objects:
        if o.type=='MESH':
            assert len(o.data.materials)>0
            assert all(math.isfinite(v) for p in o.data.vertices for v in p.co)
    assert len(bpy.data.actions)==0
    old=json.loads((OUT/id/'asset.json').read_text(encoding='utf-8'))
    assert r['triangles']==old['triangles'],(r,old)
    assert abs(r['height_m']-old['height_m'])<.001
    if id=='child_wheelchair':
        names=[o.name for o in bpy.context.scene.objects]
        for part in ('wheel_-1_tire','wheel_1_tire','chair_footrest','chair_backrest'):
            assert part in names,part
    r.update({'glb_reimport':'passed','rig':False,'animations':0})
    (OUT/id/'verification.json').write_text(json.dumps(r,indent=2),encoding='utf-8');print('NPC_VERIFIED',id,json.dumps(r))

def studio(height,view,path,width=640,height_px=768,lineup=False):
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24
    scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=2
    scene.render.resolution_x=width;scene.render.resolution_y=height_px;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.73,.79,.78,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
    ground=mat('studio_sage',(.64,.73,.68),.9)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.008));finish(bpy.context.object,'STUDIO_floor',ground)
    for pos,power,size in [((-3,-4,6),420,4),((3,-2,3),230,3),((1,3,4),320,3)]:
        bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size
        light.rotation_euler=(Vector((0,0,height*.6))-light.location).to_track_quat('-Z','Y').to_euler()
    directions={'front':(0,-6,height*.53),'three-quarter':(3,-6,height*1.55),'side':(6,0,height*.53),'back':(0,6,height*.53)}
    bpy.ops.object.camera_add(location=directions[view]);cam=bpy.context.object
    cam.rotation_euler=(Vector((0,0,height*.51))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=height*1.25;scene.camera=cam
    if lineup:
        cam.location=(0,-8,2.55)
        cam.rotation_euler=(Vector((0,0,.83))-cam.location).to_track_quat('-Z','Y').to_euler()
        cam.data.ortho_scale=4.1
    scene.view_settings.view_transform='AgX'
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(path)
    bpy.ops.render.render(write_still=True)

def render(id,view):
    load_glb(id);r=geometry_report();studio(r['height_m'],view,OUT/id/f'{view}.png')

def lineup():
    reset()
    for id,x in zip(IDS,(-1.38,-.46,.46,1.38)):
        before=set(bpy.context.scene.objects)
        bpy.ops.import_scene.gltf(filepath=str(CATALOG.parent/CURRENT[id]/id/f'{id}.glb'))
        imported=set(bpy.context.scene.objects)-before
        for obj in imported:
            if obj.parent not in imported:obj.location.x+=x
    bpy.context.view_layer.update()
    studio(1.7,'front',CATALOG/'lineup.png',1280,720,True)

def manifest():
    data=[]
    for id in IDS:
        dest=CATALOG.parent/CURRENT[id]/id
        row=json.loads((dest/'asset.json').read_text(encoding='utf-8'))
        assert (dest/'verification.json').exists()
        for v in VIEWS:assert (dest/f'{v}.png').exists()
        row['views']=[f'../{CURRENT[id]}/{id}/{v}.png' for v in VIEWS];data.append(row)
    (CATALOG/'manifest.json').write_text(json.dumps({'version':'mixed-current-candidates','characters':data,'count':len(data)},indent=2,ensure_ascii=False),encoding='utf-8')
    print('NPC_MANIFEST_SAVED',len(data))

if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:];action=args[0]
    if action=='manifest':manifest()
    elif action=='lineup':lineup()
    elif action=='build':build(args[1])
    elif action=='verify':verify(args[1])
    elif action=='render':render(args[1],args[2])
    else:raise ValueError(action)
