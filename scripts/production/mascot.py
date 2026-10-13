"""Mascota v001: maqueta estática, exportación y previews CPU por separado."""
from pathlib import Path
import sys
import json
import math
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/production/mascot/v001'
OUT.mkdir(parents=True, exist_ok=True)
ACTION = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'build'

def mat(name, color, roughness=.65):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = roughness
    return m

def finish(obj, name, material):
    obj.name = name
    obj.data.materials.append(material)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj

def oval(name, pos, scale, material, seg=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=pos)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, material)

def box(name, pos, size, material, bevel=.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = obj.modifiers.new('Rounded edges', 'BEVEL')
    mod.width = bevel
    mod.segments = 3
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(obj, name, material)

def line(name, points, material, radius=.012):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    sp = curve.splines.new('BEZIER')
    sp.bezier_points.add(len(points)-1)
    for p, co in zip(sp.bezier_points, points):
        p.co = co
        p.handle_left_type = p.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return obj

def star(name, pos, radius, material):
    vertices=[]
    for y in (-.025, .025):
        for i in range(10):
            a=math.pi/2+i*math.pi/5
            r=radius if i%2==0 else radius*.48
            vertices.append((math.cos(a)*r, y, math.sin(a)*r))
    faces=[tuple(reversed(range(10))), tuple(range(10,20))]
    faces += [(i,(i+1)%10,(i+1)%10+10,i+10) for i in range(10)]
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj=bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location=pos
    obj.data.materials.append(material)
    return obj

def build():
    if (OUT/'mascot.blend').exists():
        raise RuntimeError('v001 ya existe. Crear otra versión para cambios de forma.')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    fur=mat('fur_honey', (.52,.235,.065))
    muzzle=mat('muzzle_warm', (.37,.15,.05))
    dark=mat('nose_brows', (.10,.037,.018))
    inner=mat('inner_ear', (.28,.095,.035))
    eye=mat('eyes', (.008,.013,.017), .16)
    white=mat('eye_highlight', (.98,.94,.81), .25)
    blue=mat('backpack_blue', (.012,.27,.64), .43)
    trim=mat('backpack_trim', (.015,.12,.30), .5)
    yellow=mat('star_gold', (1,.57,.015), .38)
    # Frente del personaje: -Y. Unidades: metros, Z arriba.
    oval('body', (0,0,.76), (.42,.30,.52), fur)
    oval('head', (0,-.015,1.40), (.48,.34,.40), fur)
    oval('muzzle', (0,-.31,1.29), (.32,.185,.235), muzzle)
    oval('nose', (0,-.476,1.37), (.115,.046,.066), dark)
    line('mouth_center', [(0,-.495,1.34),(0,-.50,1.26),(0,-.49,1.23)], dark, .009)
    line('smile', [(-.16,-.457,1.25),(-.1,-.478,1.205),(0,-.487,1.195),(.1,-.478,1.205),(.16,-.457,1.25)], dark,.009)
    for s in (-1,1):
        oval(f'ear_{s}', (s*.335,.005,1.734), (.115,.085,.155), fur)
        oval(f'ear_inner_{s}', (s*.335,-.073,1.746), (.072,.021,.098), inner)
        oval(f'eye_white_{s}', (s*.24,-.296,1.48), (.095,.051,.118), white)
        oval(f'eye_{s}', (s*.24,-.332,1.485), (.071,.029,.091), eye)
        oval(f'eye_glint_{s}', (s*.24-.018,-.359,1.519), (.021,.009,.026), white,16,10)
        line(f'brow_{s}', [(s*.32,-.25,1.64),(s*.255,-.291,1.67),(s*.19,-.276,1.648)],dark,.018)
        oval(f'leg_{s}', (s*.225,0,.245), (.16,.17,.225), fur)
        oval(f'foot_{s}', (s*.225,-.09,.105), (.175,.235,.10), muzzle)
        for toe in (-1,0,1):
            oval(f'toe_{s}_{toe}', (s*.225+toe*.074,-.267,.103),(.042,.052,.048),muzzle,16,10)
        arm=oval(f'arm_{s}', (s*.405,-.035,.90), (.145,.155,.265),fur)
        arm.rotation_euler[1]=s*-.20
        oval(f'paw_{s}', (s*.43,-.08,.711), (.142,.16,.135),fur)
        line(f'backpack_strap_{s}', [(s*.255,.25,1.19),(s*.29,-.08,1.195),(s*.31,-.29,.99),(s*.285,-.245,.67),(s*.24,.25,.66)],blue,.043)
    # Mochila y bolsillos separados, visibles desde atrás.
    box('backpack', (0,.36,.91), (.64,.29,.66),blue,.09)
    box('backpack_front_pocket', (0,.525,.82), (.48,.09,.34),blue,.055)
    line('pocket_seam',[(-.205,.577,.955),(0,.584,.965),(.205,.577,.955)],trim,.011)
    line('backpack_handle',[(-.085,.36,1.24),(-.07,.36,1.32),(.07,.36,1.32),(.085,.36,1.24)],trim,.024)
    star('backpack_star',(0,.589,.85),.145,yellow)
    line('charm_loop',[(.305,.44,.94),(.34,.47,.88),(.34,.48,.83)],trim,.01)
    star('star_charm',(.34,.48,.76),.065,yellow)
    # Mechón simple: geometría escasa, sin pelo simulado.
    for i in range(3):
        tuft=oval(f'tuft_{i}', ((i-1)*.065,-.045,1.786),(.045,.065,.075),fur,16,10)
        tuft.rotation_euler[1]=-.3
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in meshes:
        o.data.calc_loop_triangles()
    report={'stage':'01','version':'v001','status':'static_candidate',
            'rig':False,'animations':[],'collisions':False,
            'objects':len(meshes),'triangles':sum(len(o.data.loop_triangles) for o in meshes),
            'materials':len(bpy.data.materials),'units':'meters','height_approx_m':1.89,
            'limitations':['Separate overlapping meshes; not deformation-ready','Smooth stylized surface, no individual fur','References have angle inconsistencies; model is an interpretation']}
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/'mascot.glb'),export_format='GLB',use_selection=True,export_animations=False)
    report['glb_bytes']=(OUT/'mascot.glb').stat().st_size
    (OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mascot.blend'))
    print(json.dumps(report))

def preview(view):
    bpy.ops.wm.open_mainfile(filepath=str(OUT/'mascot.blend'))
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.device='CPU'
    scene.cycles.samples=20
    scene.cycles.use_denoising=True
    scene.render.threads_mode='FIXED'
    scene.render.threads=2
    scene.render.resolution_x=640
    scene.render.resolution_y=720
    scene.render.resolution_percentage=100
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.63,.76,.78,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
    floor=mat('studio_floor',(.64,.76,.73))
    bpy.ops.mesh.primitive_plane_add(size=200)
    bpy.context.object.data.materials.append(floor)
    for name,pos,power,size in [('key',(-3,-4,5),400,4),('fill',(3,-1,3),180,3),('rim',(1,4,4),350,3)]:
        bpy.ops.object.light_add(type='AREA',location=pos)
        obj=bpy.context.object
        obj.name=name
        obj.data.energy=power
        obj.data.shape='DISK'
        obj.data.size=size
        obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()
    positions={'front':(0,-5,1.1),'three-quarter':(3,-5,2.5),'side':(5,0,1.1),'back':(2,5,2.2)}
    bpy.ops.object.camera_add(location=positions[view])
    cam=bpy.context.object
    cam.rotation_euler=(Vector((0,0,.95))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'
    cam.data.ortho_scale=2.4
    scene.camera=cam
    scene.render.image_settings.file_format='PNG'
    scene.render.filepath=str(OUT/f'{view}.png')
    bpy.ops.render.render(write_still=True)

def verify():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(OUT/'mascot.glb'))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    assert len(meshes)>0,'Empty GLB'
    assert not bpy.data.actions,'Unexpected animation'
    assert all(all(math.isfinite(v) for v in o.location) for o in meshes)
    data={'glb_reimport':'passed','mesh_objects':len(meshes),'animations':0,'rig':False}
    (OUT/'verification.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
    print(json.dumps(data))

if __name__ == '__main__':
    if ACTION=='build': build()
    elif ACTION=='verify': verify()
    else: preview(ACTION)
