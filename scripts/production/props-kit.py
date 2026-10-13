"""Static interactive-object art kit. No gameplay or UI semantics inferred."""
import sys,math
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
import importlib.util
spec=importlib.util.spec_from_file_location('worldkit',Path(__file__).with_name('world-kit.py'))
W=importlib.util.module_from_spec(spec);spec.loader.exec_module(W)
W.OUT=W.B.ROOT/'assets/production/props/v001';W.OUT.mkdir(parents=True,exist_ok=True)
W.REFERENCES=['06-interactive-props-orthographic.png']
box,oval,line,cone,torus,leaf=W.box,W.oval,W.line,W.cone,W.torus,W.leaf

def badge(name,outline,p,material,depth=.055,bevel=.01):
    verts=[(x,-depth/2,z) for x,z in outline]+[(x,depth/2,z) for x,z in outline]
    n=len(outline);faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.location=p
    obj.data.materials.append(W.M[material])
    mod=obj.modifiers.new('Soft icon edge','BEVEL');mod.width=bevel;mod.segments=3
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def disk(name,p,r,depth,material):
    obj=cone(name,p,r,r,depth,material,40);obj.rotation_euler[0]=math.pi/2;return obj

def heart(p=(0,0,.36),scale=.025,material='pink'):
    outline=[]
    for i in range(64):
        t=-i*math.tau/64
        outline.append((16*math.sin(t)**3*scale,
          (13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t))*scale))
    return badge('heart',outline,p,material,.075 if scale>.01 else .024,.012 if scale>.01 else .004)

def compass():
    disk('gold_case',(0,0,.44),.37,.12,'yellow')
    disk('ivory_dial',(0,-.069,.44),.311,.024,'white')
    torus('case_rim',(0,-.080,.44),.333,.025,'yellow',(math.pi/2,0,0))
    for i in range(8):
        a=i*math.pi/4
        line('dial_tick',[(.255*math.cos(a),-.092,.44+.255*math.sin(a)),
              (.279*math.cos(a),-.092,.44+.279*math.sin(a))],'metal',.006)
    badge('needle_red',[(0,-.02),(.19,.25),(.045,.04)],(0,-.11,.44),'pink',.018,.002)
    badge('needle_blue',[(0,.02),(-.19,-.25),(-.045,-.04)],(0,-.11,.44),'blue',.018,.002)
    oval('needle_pin',(0,-.127,.44),(.034,.015,.034),'yellow')
    torus('hanging_ring',(0,0,.882),.071,.020,'yellow',(math.pi/2,0,0))
    W.ANCHORS['grip']=[0,0,.88]

def folded_map():
    for i in range(3):
        x=(i-1)*.29;angle=(-.16 if i!=1 else .16)
        obj=box('paper_panel',(x,0,.36),(.30,.031,.69),'white',.01);obj.rotation_euler[2]=angle
        obj=box('map_water',(x,-.028,.36),(.258,.008,.613),'water',.007);obj.rotation_euler[2]=angle
        for dx,z in [(-.02,.42),(.025,.35)]:oval('map_island',(x+dx,-.041,z),(.088,.009,.12),'grass_light',12,8)
    for x,z in [(-.32,.45),(-.23,.38),(-.10,.31),(.01,.32),(.10,.40)]:
        oval('dotted_route',(x,-.056,z),(.014,.006,.010),'wood',12,8)
    for s in (-1,1):line('destination_cross',[(.22-.045,-.061,.30-s*.045),(.22+.045,-.061,.30+s*.045)],'pink',.014)

def speech():
    outline=[]
    for i in range(48):
        a=i*math.tau/48;outline.append((.42*math.cos(a),.30*math.sin(a)))
    # A separate small overlapping tail; static art, not a dialogue component.
    badge('speech',outline,(0,0,.39),'white',.09,.015)
    badge('speech_tail',[(-.23,.01),(-.34,-.17),(-.13,-.08)],(0,0,.19),'white',.085,.016)
    for x in (-.16,0,.16):disk('dot',(x,-.059,.40),.05,.02,'blue')

def trust_circle():
    for x,y,z,color in [(0,.07,.19,'blue'),(-.24,-.035,.11,'yellow'),(.24,-.035,.11,'leaf')]:
        cone('person_body',(x,y,z),.15,.10,.23,color,24)
        oval('person_head',(x,y,z+.245),(.125,.095,.13),color,24,16)

def gift():
    box('gift_box',(0,0,.285),(.59,.52,.57),'blue',.045)
    box('gift_lid',(0,0,.60),(.65,.58,.12),'water',.03)
    box('ribbon_vertical',(0,-.274,.30),(.105,.027,.59),'pink',.007)
    box('ribbon_back',(0,.274,.30),(.105,.027,.59),'pink',.007)
    box('ribbon_top_x',(0,0,.667),(.65,.10,.024),'pink',.006)
    box('ribbon_top_y',(0,0,.667),(.10,.58,.025),'pink',.006)
    for s in (-1,1):
        line('bow_loop',[(0,0,.70),(s*.17,0,.89),(s*.27,0,.79),(0,0,.70)],'pink',.035)
    oval('bow_knot',(0,-.01,.70),(.065,.055,.06),'pink')
    W.ANCHORS['lid']=[0,0,.6]

def envelope():
    box('envelope',(0,0,.26),(.72,.08,.50),'white',.022)
    line('envelope_flap',[(-.32,-.047,.47),(0,-.051,.24),(.32,-.047,.47)],'sand',.007)
    line('lower_fold',[(-.32,-.047,.045),(0,-.05,.27),(.32,-.047,.045)],'sand',.005)
    disk('wax_seal',(0,-.067,.245),.105,.029,'pink')
    heart((0,-.093,.257),.0045,'pink')

def card(color,symbol):
    box('choice_card',(0,0,.36),(.47,.06,.71),color,.036)
    if symbol=='leaf':
        leaf((-.085,-.053,.20),(.10,-.053,.48),.097,'white')
        line('leaf_stem',[(-.10,-.083,.17),(0,-.083,.33),(.09,-.083,.47)],color,.007)
    elif symbol=='sun':
        disk('sun',(0,-.045,.36),.092,.025,'white')
        for i in range(8):
            a=i*math.pi/4
            line('sun_ray',[(.124*math.cos(a),-.05,.36+.124*math.sin(a)),
                           (.164*math.cos(a),-.05,.36+.164*math.sin(a))],'white',.011)
    else:
        for x,z,r in [(-.09,.34,.063),(0,.40,.09),(.09,.35,.064)]:oval('cloud',(x,-.05,z),(r,.023,r),'white')
        box('cloud_base',(0,-.05,.307),(.24,.04,.064),'white',.025)

def droplet(p=(0,0,0),scale=1,material='water'):
    levels=[(0,.015),(.065,.16),(.18,.23),(.32,.245),(.46,.21),(.63,.14),(.81,.061),(.96,0)]
    verts=[];faces=[]
    for z,r in levels:
        for i in range(32):
            a=i*math.tau/32;verts.append((p[0]+r*scale*math.cos(a),p[1]+r*scale*math.sin(a),p[2]+z*scale))
    for j in range(len(levels)-1):
        for i in range(32):faces.append((j*32+i,j*32+(i+1)%32,(j+1)*32+(i+1)%32,(j+1)*32+i))
    mesh=bpy.data.meshes.new('drop');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new('water_drop',mesh);bpy.context.collection.objects.link(obj);W.B.finish(obj,'water_drop',W.M[material])
    mod=obj.modifiers.new('Round drop','SUBSURF');mod.levels=1
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)

def bottle():
    cone('bottle_body',(0,0,.39),.235,.235,.67,'water',32)
    oval('bottle_shoulder',(0,0,.704),(.234,.234,.08),'water',24,16)
    cone('bottle_neck',(0,0,.79),.125,.125,.16,'blue',24)
    cone('bottle_cap',(0,0,.89),.147,.147,.10,'blue',24)
    line('bottle_handle',[(.09,0,.9),(.25,0,.94),(.25,0,1.02),(.06,0,1.02),(.03,0,.91)],'blue',.03)
    # Small drop emblem follows the front of the bottle, presented as raised decal.
    badge('drop_icon',[(0,.16),(-.09,-.015),(-.07,-.08),(0,-.11),(.07,-.08),(.09,-.015)],
          (0,-.24,.43),'white',.01,.006)

def recycling_bin():
    # Hollow bin assembled from four walls: actual open top, not a dark sticker.
    box('base',(0,0,.045),(.55,.48,.09),'leaf',.025)
    for x in (-.255,.255):box('bin_side',(x,0,.37),(.07,.48,.68),'leaf',.025)
    for y in (-.22,.22):box('bin_wall',(0,y,.37),(.53,.065,.68),'leaf',.025)
    for x in (-.28,.28):box('rim_side',(x,0,.74),(.10,.56,.10),'leaf_dark',.025)
    for y in (-.245,.245):box('rim_front',(0,y,.74),(.61,.08,.10),'leaf_dark',.025)
    # Three clockwise arrows in a recycling loop, geometry rather than font glyph.
    for i in range(3):
        a=i*math.tau/3
        outline=[(-.04,.14),(.035,.14),(.035,.18),(.115,.11),(.035,.044),(.035,.083),(-.04,.083)]
        points=[(x*math.cos(a)-z*math.sin(a),x*math.sin(a)+z*math.cos(a)) for x,z in outline]
        badge('recycle_arrow',points,(0,-.26,.41),'white',.015,.003)
    W.ANCHORS['opening']=[0,0,.78]

def seedling():
    oval('soil_mound',(0,0,.075),(.31,.25,.10),'soil')
    line('stem',[(0,0,.10),(0,0,.30),(.035,0,.58)],'leaf',.022)
    leaf((0,0,.27),(-.32,0,.57),.115,'leaf_light')
    leaf((.015,0,.36),(.34,0,.66),.13,'leaf_light')
    for x,y in [(-.2,-.1),(.15,-.16),(.20,.11)]:W.rock((x,y,.07),(.062,.05,.045),int((x+1)*100))

def puzzle(color):
    box('puzzle_square',(0,0,.30),(.46,.085,.46),color,.031)
    disk('puzzle_tab_top',(0,0,.58),.096,.085,color)
    disk('puzzle_tab_side',(.28,0,.30),.096,.085,color)
    # Decorative puzzle token, sockets not manufactured interlocks.

def control(sound=False):
    disk('control_button',(0,0,.39),.35,.09,'blue')
    torus('control_rim',(0,-.052,.39),.30,.014,'water',(math.pi/2,0,0))
    if not sound:
        for x in (-.085,.085):box('pause_bar',(x,-.066,.39),(.079,.032,.32),'white',.03)
    else:
        badge('speaker',[(-.14,-.07),(-.075,-.07),(.018,-.15),(.018,.15),(-.075,.07),(-.14,.07)],
              (0,-.065,.39),'white',.025,.012)
        for r in (.10,.17):
            line('sound_wave',[(.05+r*math.cos(a),-.08,.39+r*math.sin(a))
                  for a in [-.8+i*.1 for i in range(17)]],'white',.010)

def backpack():
    source=W.B.ROOT/'assets/production/mascot/v005/mascot.blend'
    bpy.ops.wm.open_mainfile(filepath=str(source))
    for obj in list(bpy.context.scene.objects):
        if not obj.name.startswith(('backpack','zipper')):bpy.data.objects.remove(obj,do_unlink=True)
    bpy.context.view_layer.update()
    lo=min((o.matrix_world@v.co).z for o in bpy.context.scene.objects if o.type=='MESH' for v in o.data.vertices)
    for obj in bpy.context.scene.objects:obj.location.z-=lo

W.REGISTRY={
 'backpack':(backpack,'props'),'compass':(compass,'props'),'folded_map':(folded_map,'props'),
 'speech_bubble':(speech,'props'),'circle_of_three':(trust_circle,'props'),'gift_box':(gift,'props'),
 'sealed_envelope':(envelope,'props'),'heart_token':(heart,'props'),
 'card_leaf':(lambda:card('leaf','leaf'),'props'),'card_sun':(lambda:card('yellow','sun'),'props'),
 'card_cloud':(lambda:card('pink','cloud'),'props'),'water_drop':(droplet,'props'),
 'water_bottle':(bottle,'props'),'recycling_bin':(recycling_bin,'props'),'seedling':(seedling,'props'),
 'puzzle_blue':(lambda:puzzle('blue'),'props'),'puzzle_red':(lambda:puzzle('pink'),'props'),
 'puzzle_yellow':(lambda:puzzle('yellow'),'props'),'pause_button':(lambda:control(False),'props'),
 'sound_button':(lambda:control(True),'props')}
# Los residuos `banana_peel`, `disposable_cup` y `crumpled_wrapper` no se
# reconstruyen aquí: se autoran en glTF con
# `scripts/production/build-litter-props.mjs` y siguen el mismo pipeline
# v001 → v002 que el resto del kit. No añadirlos a REGISTRY sin Blender.

if W.ACTION=='build':W.build()
elif W.ACTION=='props':W.render('props')
else:raise ValueError(W.ACTION)
