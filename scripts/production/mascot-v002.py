"""Reference-driven static revision. CPU only; real geometry in both BLEND and GLB.

No automatic image-to-mesh claim: shape, pose and surface are hand-specified.
The dense sculpted coat is a visual candidate, not the final mobile LOD.
"""
import sys
import json
import math
import random
import bisect
from pathlib import Path
import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mascot as base

SURFACE_FINAL = '--surface-final' in sys.argv
REFINE = '--refine' in sys.argv or SURFACE_FINAL
VERSION = 'v004' if SURFACE_FINAL else ('v003' if REFINE else 'v002')
OUT = base.ROOT / 'assets/production/mascot' / VERSION
OUT.mkdir(parents=True, exist_ok=True)
base.OUT = OUT
mat, oval, box, line, star = base.mat, base.oval, base.box, base.line, base.star
ACTION = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'build'


def union(name, objects, material, voxel=.023):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    mod = obj.modifiers.new('Continuous sculpted volume', 'REMESH')
    mod.mode = 'VOXEL'
    mod.voxel_size = voxel
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod = obj.modifiers.new('Relax surface', 'SMOOTH')
    mod.factor = 1.3
    mod.iterations = 5
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod = obj.modifiers.new('Reduce static sculpt', 'DECIMATE')
    mod.ratio = .48
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.materials.clear()
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def coat(obj, count, palette, seed, length=.026, exclude=None):
    """Short tapered solid locks; deterministic and portable without hair shaders."""
    rng = random.Random(seed)
    bpy.context.view_layer.update()
    obj.data.calc_loop_triangles()
    triangles = obj.data.loop_triangles
    cdf, total = [], 0.
    for tri in triangles:
        total += tri.area
        cdf.append(total)
    verts, faces, indices = [], [], []
    matrix = obj.matrix_world
    normal_matrix = matrix.to_3x3().inverted().transposed()
    for _ in range(count):
        tri = triangles[bisect.bisect_left(cdf, rng.random() * total)]
        a, b, c = [obj.data.vertices[i] for i in tri.vertices]
        u, v = rng.random(), rng.random()
        if u + v > 1:
            u, v = 1-u, 1-v
        p = matrix @ (a.co + u*(b.co-a.co) + v*(c.co-a.co))
        n = (normal_matrix @ (a.normal*(1-u-v) + b.normal*u + c.normal*v)).normalized()
        if exclude is not None and exclude(p):
            continue
        if exclude is None and obj.name == 'head_sculpt' and p.y < -.24:
            # Keep eyelids and central snout readable; cheeks retain fur.
            if abs(p.x) < .19 and 1.23 < p.z < 1.58:
                continue
            if abs(abs(p.x)-.235) < .083 and abs(p.z-1.515) < .105:
                continue
        direction = Vector((p.x*.5 if obj.name == 'head_sculpt' else .08, -.10, -1))
        tangent = direction - n*direction.dot(n)
        if tangent.length < .01:
            tangent = n.cross(Vector((1, 0, .1)))
        tangent.normalize()
        side = tangent.cross(n).normalized()
        span = length*rng.uniform(.60, 1.45)
        width = span*rng.uniform(.045, .075) if REFINE else span*rng.uniform(.13, .23)
        root = p + n*.0005 if SURFACE_FINAL else p - n*.002
        mid = root + tangent*span*.40
        tip = root + tangent*span + n*.001
        start = len(verts)
        height_ratio = .08 if SURFACE_FINAL else (.045 if REFINE else .19)
        verts.extend([root, mid-side*width, mid+n*span*height_ratio,
                      mid+side*width, tip])
        faces.extend([tuple(start+i for i in f) for f in
                      [(0,1,2),(0,2,3),(1,4,2),(2,4,3)]])
        shade = rng.choices(range(len(palette)), [7, 3, 2, 1])[0]
        indices.extend([shade]*4)
    mesh = bpy.data.meshes.new(obj.name+'_coat')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    if SURFACE_FINAL:
        # Consistent outward normals, also for engines with backface culling.
        for polygon in mesh.polygons:
            polygon.flip()
        mesh.update()
    fur = bpy.data.objects.new(obj.name+'_short_fur', mesh)
    bpy.context.collection.objects.link(fur)
    for material in palette:
        mesh.materials.append(material)
    for p, idx in zip(mesh.polygons, indices):
        p.material_index = idx
        p.use_smooth = True


def paint_coat(objects):
    """Portable vertex color: diffuse cheek blush and gentle coat variation."""
    material=mat('coat_painted_vertex_color',(.64,.205,.035),.88)
    nodes=material.node_tree.nodes
    shader=nodes.get('Principled BSDF')
    shader.inputs['Specular IOR Level'].default_value=.23
    attr=nodes.new('ShaderNodeVertexColor')
    attr.layer_name='CoatColor'
    material.node_tree.links.new(attr.outputs['Color'],shader.inputs['Base Color'])
    for obj in objects:
        old_colors=[tuple(m.diffuse_color[:3]) for m in obj.data.materials]
        colors=obj.data.color_attributes.new(name='CoatColor',type='BYTE_COLOR',domain='CORNER')
        for face in obj.data.polygons:
            base_color=Vector(old_colors[face.material_index])
            for loop_index in face.loop_indices:
                v=obj.data.vertices[obj.data.loops[loop_index].vertex_index]
                p=obj.matrix_world @ v.co
                shade=1+.045*math.sin(p.z*4.1)
                col=base_color*shade
                if obj.name.startswith('head_sculpt'):
                    blush=math.exp(-((abs(p.x)-.324)/.061)**2-((p.z-1.428)/.032)**2)
                    blush*=max(0,min(1,(-p.y-.18)/.12))*.64
                    col=col.lerp(Vector((.9,.145,.033)),blush)
                colors.data[loop_index].color=(*col,1)
        obj.data.materials.clear()
        obj.data.materials.append(material)
        for face in obj.data.polygons:
            face.material_index=0


def ribbon(name, points, material, width=.085):
    # Padded round-profile strap, flattened ribbon topology still pending.
    obj = line(name, points, material, width/2)
    # The front segment is positioned above the torso and occluded by the hand.
    return obj


def build():
    if (OUT/'mascot.blend').exists():
        raise RuntimeError(f'{VERSION} already saved. Do not overwrite a reviewed version.')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    fur = mat('coat_golden_apricot', (.73,.285,.062), .86)
    palette = [fur, mat('coat_honey_light',(.84,.355,.092),.88),
               mat('coat_copper',(.63,.214,.045),.9),
               mat('coat_fine_highlights',(.92,.405,.13),.85)]
    if REFINE:
        # Reduced contrast between strands prevents a sesame-seed appearance.
        for material, color in zip(palette,[(.64,.205,.035),(.69,.233,.044),
                                           (.60,.181,.029),(.73,.259,.052)]):
            material.diffuse_color=(*color,1)
            bs=material.node_tree.nodes.get('Principled BSDF')
            bs.inputs['Base Color'].default_value=(*color,1)
            bs.inputs['Roughness'].default_value=.88
            bs.inputs['Specular IOR Level'].default_value=.24
    muzzle = mat('snout_warm_cinnamon',(.34,.125,.050),.8)
    nose = mat('nose_same_cinnamon',(.30,.103,.039),.68)
    pawmat = mat('paws_cinnamon',(.25,.085,.036),.83)
    dark = mat('mouth_and_nostrils',(.042,.013,.006),.8)
    inner = mat('ear_recess',(.22,.055,.024),.9)
    eye = mat('eyes_espresso',(.008,.011,.010),.14)
    white = mat('eyes_ivory',(.97,.94,.85),.35)
    blush = mat('cheek_peach',(.94,.255,.078),.9)
    blue = mat('backpack_cerulean',(.008,.31,.67),.53)
    blueedge = mat('padded_blue_edges',(.010,.23,.49),.61)
    seam = mat('blue_stitching',(.022,.40,.73),.75)
    yellow = mat('golden_star', (1,.64,.025),.38)
    # Head broadens towards the cheeks instead of a spherical teddy cranium.
    head = oval('head_sculpt',(0,-.02,1.435),(.477,.365,.36),fur,48,32)
    for v in head.data.vertices:
        t = v.co.z/.36
        v.co.x *= 1-.18*t
        # Flatten lower jaw slightly while retaining a forward, rounded forehead.
        if t < -.65 and not REFINE:
            v.co.z = -.234+(v.co.z+.234)*.65
    # A continuous pear-shaped torso and thighs, no ball-jointed knees.
    torso = oval('torso',(0,.045,.675),(.353,.282,.49),fur,40,28)
    for v in torso.data.vertices:
        v.co.x *= 1-.14*v.co.z/.49
    parts = [torso]
    if REFINE:
        parts.append(oval('neck_transition',(0,.016,1.10),(.218,.215,.24),fur,32,24))
    for s in (-1,1):
        parts.append(oval('thigh',(s*.22,.015,.265),(.153,.19,.22),fur))
    body = union('body_sculpt',parts,fur)
    # Vertical uninterrupted muzzle, not a broad round bear muzzle + black nose.
    snout=oval('vertical_snout',(0,-.372,1.395),(.173,.113,.178),muzzle,40,28)
    bridge=oval('nose_bridge',(0,-.412,1.502),(.161,.086,.089),nose,40,24)
    if REFINE:
        union('unified_snout',[snout,bridge],muzzle,.009)
    for s in (-1,1):
        nostril = oval(f'nostril_{s}',(s*.075,-.489,1.49),(.027,.009,.013),dark,20,12)
        nostril.rotation_euler[1] = s*-.38
    if REFINE:
        def snout_point(x,z):
            y=-.372-.113*math.sqrt(max(.005,1-(x/.173)**2-((z-1.395)/.178)**2))-.002
            return (x,y,z)
        line('philtrum',[(0,-.488,1.463),snout_point(0,1.398),
                        snout_point(0,1.326),snout_point(0,1.263)],dark,.003)
        line('gentle_smile',[snout_point(x,z) for x,z in
              [(-.15,1.323),(-.12,1.283),(-.065,1.264),(0,1.263),
               (.065,1.264),(.12,1.283),(.15,1.323)]],dark,.003)
    else:
        line('philtrum',[(0,-.491,1.472),(0,-.489,1.369),(0,-.474,1.26)],dark,.0045)
        line('gentle_smile',[(-.158,-.416,1.292),(-.126,-.45,1.255),
                             (0,-.472,1.25),(.126,-.45,1.255),(.158,-.416,1.292)],dark,.0045)
    arms = []
    for s in (-1,1):
        # Small oval ears nested into the top of the skull.
        ear = oval(f'ear_{s}',(s*.323,.0,1.78),(.096,.066,.123),muzzle,32,20)
        ear.rotation_euler[1] = s*.28
        earinner = oval(f'ear_cup_{s}',(s*.323,-.054,1.788),(.059,.025,.079),inner,28,18)
        earinner.rotation_euler[1] = s*.28
        if REFINE:
            ear.scale=(.84,.94,.81)
            ear.location.z-=.035
            earinner.scale=(.84,.94,.81)
            earinner.location.z-=.035
        # Small dark eyes with a narrow ivory rim and two highlights.
        oval(f'eye_rim_{s}',(s*.235,-.318,1.541),
             ((.052,.026,.075) if REFINE else (.057,.028,.081)),white,32,24)
        oval(f'eye_{s}',(s*.235,-.342,1.543),(.046,.019,.068),eye,32,24)
        oval(f'eye_glint_{s}',(s*.235-.014,-.361,1.57),(.015,.004,.018),white,20,12)
        oval(f'eye_glint_small_{s}',(s*.235+.011,-.361,1.519),(.006,.003,.007),white,16,10)
        line(f'eyebrow_{s}',[(s*.282,-.274,1.661),(s*.247,-.297,1.679),
                             (s*.208,-.31,1.67)],pawmat,.008)
        # Subtle cheeks, under rather than on top of the facial fur.
        if not REFINE:
            oval(f'cheek_{s}',(s*.325,-.302,1.425),(.051,.006,.028),blush,24,16)
        upper = oval('upper_arm',(s*.367,-.015,.986),(.13,.14,.215),fur)
        upper.rotation_euler[1] = s*-.42
        fore = oval('forearm',(s*.385,-.15,.842),(.154,.15,.115),fur)
        arm = union(f'arm_sculpt_{s}',[upper,fore],fur,.017)
        arms.append(arm)
        oval(f'hand_{s}',(s*.281,-.287,.852),(.107,.102,.118),pawmat,32,24)
        # Two soft creases suggest fingers wrapped around backpack straps.
        for z in (.821,.874):
            line(f'finger_crease_{s}_{z}',[(s*.208,-.353,z+.014),
                 (s*.25,-.383,z+.008),(s*.298,-.381,z)],muzzle,.004)
        oval(f'foot_{s}',(s*.218,-.085,.080),(.151,.182,.076),pawmat,32,20)
        for dx in (-.052,.026):
            line(f'toe_crease_{s}_{dx}',[(s*.218+dx,-.252,.065),
                 (s*.218+dx,-.241,.11),(s*.218+dx,-.207,.136)],dark,.004)
        # Padded straps trace the shoulder, with visible outer seam.
        ribbon(f'backpack_strap_{s}',[(s*.25,.27,1.135),(s*.30,-.035,1.158),
                 (s*.29,-.231,1.067),(s*.265,-.288,.928),(s*.276,-.22,.67),
                 (s*.28,.20,.625)],blue,.094)
        line(f'strap_stitch_{s}',[(s*.32,-.07,1.14),(s*.319,-.217,1.055),
                  (s*.302,-.28,.946)],seam,.004)
    pack = box('backpack_padded_body',(0,.352,.852),(.627,.28,.669),blueedge,.125)
    box('backpack_outer_face',(0,.485,.861),(.557,.095,.588),blue,.10)
    # Rounded rectangular seam follows the large front panel in the reference.
    line('backpack_panel_piping',[(-.20,.54,.584),(-.263,.54,.64),(-.263,.54,1.05),
          (-.20,.54,1.127),(.20,.54,1.127),(.263,.54,1.05),(.263,.54,.64),
          (.20,.54,.584),(-.20,.54,.584)],blueedge,.008)
    line('backpack_handle',[(-.09,.355,1.18),(-.07,.355,1.245),
          (.07,.355,1.245),(.09,.355,1.18)],blueedge,.019)
    badge = star('backpack_star',(0,.560,.904),.143,yellow)
    bevel = badge.modifiers.new('Soft star edge','BEVEL')
    bevel.width=.01
    bevel.segments=3
    bpy.context.view_layer.objects.active=badge
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    for s in (-1,1):
        box(f'backpack_side_pocket_{s}',(s*.297,.363,.705),(.10,.21,.23),blue,.04)
    line('zipper_charm_loop',[(.27,.484,.818),(.305,.52,.77)],blueedge,.008)
    charm=star('zipper_star',(.305,.549,.713),.061,yellow)
    bevel=charm.modifiers.new('Soft charm edge','BEVEL')
    bevel.width=.004
    bevel.segments=2
    bpy.context.view_layer.objects.active=charm
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    # Three swept tufts (no round bumps on the crown).
    for i in range(3):
        tuft=oval(f'crown_tuft_{i}',((i-1)*.047,-.07,1.799+(.009 if i==1 else 0)),
                  (.020,.027,.087-i*.01),palette[1],20,12)
        tuft.rotation_euler[1]=.98+i*.13
    coat(head,17000 if REFINE else 6200,palette,23,.035 if REFINE else .027)
    coat(body,13000 if REFINE else 4700,palette,24,.039 if REFINE else .032)
    for i, arm in enumerate(arms):
        coat(arm,2400 if REFINE else 950,palette,25+i,.034 if REFINE else .027)
    if SURFACE_FINAL:
        paint_coat([o for o in bpy.context.scene.objects if o.type=='MESH' and
                    (o.name.startswith(('head_sculpt','body_sculpt','arm_sculpt')))])
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for obj in meshes:
        obj.data.calc_loop_triangles()
    report={'stage':'02a','version':VERSION,'status':'visual_revision_not_approved',
       'rig':False,'animations':[],'collisions':False,
       'objects':len(meshes),'triangles':sum(len(o.data.loop_triangles) for o in meshes),
       'materials':len({m.name for o in meshes for m in o.data.materials}),
       'reference':'assets/references-3d/technical/01-mascot-orthographic-turnaround.png',
       'changes':['Pear-shaped head and fused torso/thighs','Vertical snout and paired nostrils',
                  'Smaller eyes and ears','Bent arms gripping backpack straps',
                  'Cinnamon paws; toe and finger creases','Portable sculpted short coat'],
       'limitations':['Static pose, no rig or deformation topology',
                      'Sculpted fur needs mobile LOD and performance tests',
                      'Reference interpretation; not an exact reconstruction'],
       'units':'meters'}
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/'mascot.glb'),export_format='GLB',
                              use_selection=True,export_animations=False)
    report['glb_bytes']=(OUT/'mascot.glb').stat().st_size
    (OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mascot.blend'))
    print(json.dumps(report))


def preview(view):
    bpy.ops.wm.open_mainfile(filepath=str(OUT/'mascot.blend'))
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.device='CPU'
    scene.cycles.samples=36
    scene.cycles.use_denoising=True
    scene.render.threads_mode='FIXED'
    scene.render.threads=2
    scene.render.resolution_x=768
    scene.render.resolution_y=864
    scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.74,.84,.85,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.25
    floor=mat('studio_pale_mint',(.54,.69,.64),.95)
    bpy.ops.mesh.primitive_plane_add(size=200)
    bpy.context.object.data.materials.append(floor)
    for name,pos,power,size in [('key',(-3,-4,5),420,3),('fill',(3,-2,3),110,3),
                              ('rim',(1,3,4),340,2.5)]:
        bpy.ops.object.light_add(type='AREA',location=pos)
        obj=bpy.context.object
        obj.name=name
        obj.data.energy=power
        obj.data.shape='DISK'
        obj.data.size=size
        obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()
    positions={'front':(0,-6,1.18),'three-quarter':(2.8,-6,2.1),
               'side':(6,0,1.18),'back':(0,6,1.3)}
    bpy.ops.object.camera_add(location=positions[view])
    cam=bpy.context.object
    cam.rotation_euler=(Vector((0,0,.96))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'
    cam.data.ortho_scale=2.23
    scene.camera=cam
    scene.render.image_settings.file_format='PNG'
    scene.render.filepath=str(OUT/f'{view}.png')
    bpy.ops.render.render(write_still=True)


if __name__=='__main__':
    if ACTION=='build': build()
    elif ACTION=='verify': base.verify()
    else: preview(ACTION)
