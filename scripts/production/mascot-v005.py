"""Finish the four recorded v004 refinements; retain source versions unchanged.

Requires v004/mascot.blend. Head/snout are a single sculpt; facial details
are projected onto that surface, not spheres placed in front of the face.
"""
import sys
import math
import json
import importlib.util
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('previous',HERE/'mascot-v002.py')
old=importlib.util.module_from_spec(spec)
spec.loader.exec_module(old)
old.REFINE=old.SURFACE_FINAL=True
OUT=old.base.ROOT/'assets/production/mascot/v005'
OUT.mkdir(parents=True,exist_ok=True)
SOURCE=old.base.ROOT/'assets/production/mascot/v004/mascot.blend'
old.OUT=old.base.OUT=OUT
oval,line,union=old.oval,old.line,old.union
ACTION=old.ACTION


def remove_matching(prefixes):
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith(tuple(prefixes)):
            bpy.data.objects.remove(obj,do_unlink=True)


def surface(obj,x,z,back=False):
    """Return actual world surface point and normal using the mesh's ray cast."""
    bpy.context.view_layer.update()
    origin=Vector((x,2 if back else -2,z))
    direction=Vector((0,-1 if back else 1,0))
    inv=obj.matrix_world.inverted()
    hit,p,n,_=obj.ray_cast(inv@origin,(inv.to_3x3()@direction).normalized())
    if not hit:
        raise RuntimeError(f'Surface miss {obj.name}: {x}, {z}')
    return obj.matrix_world@p,(inv.transposed().to_3x3()@n).normalized()


def cap(name,head,cx,cz,rx,rz,material,lift=.003,dome=.003):
    # Conforming elliptical dome with no rim hovering away from the skull.
    verts=[]
    for j in range(9):
        r=j/8
        for i in range(48):
            a=i*math.tau/48
            x=cx+rx*r*math.cos(a)
            z=cz+rz*r*math.sin(a)
            p,n=surface(head,x,z)
            verts.append(p+n*(lift+dome*(1-r*r)))
    faces=[]
    for j in range(8):
        for i in range(48):
            a=j*48+i; b=j*48+(i+1)%48
            faces.append((a,b,b+48,a+48))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    for p in mesh.polygons:p.use_smooth=True
    return obj


def projected_line(name,head,points,material,radius=.003,lift=.001):
    positions=[]
    for x,z in points:
        p,n=surface(head,x,z)
        positions.append(p+n*lift)
    return line(name,positions,material,radius)


def band(name,points,material):
    """Padded ribbon: elliptical section 86 mm wide, 24 mm thick."""
    pts=[Vector(p) for p in points]
    centers=[]
    for k in range(len(pts)-1):
        p0,p1,p2,p3=pts[max(0,k-1)],pts[k],pts[k+1],pts[min(len(pts)-1,k+2)]
        for step in range(10):
            t=step/10
            centers.append(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+
                               (-p0+3*p1-3*p2+p3)*t*t*t))
    centers.append(pts[-1])
    verts=[]
    for i,c in enumerate(centers):
        tangent=(centers[min(i+1,len(centers)-1)]-centers[max(0,i-1)]).normalized()
        width=Vector((1,0,0))
        width=(width-tangent*width.dot(tangent)).normalized()
        normal=tangent.cross(width).normalized()
        for j in range(12):
            a=math.tau*j/12
            verts.append(c+width*.043*math.cos(a)+normal*.012*math.sin(a))
    faces=[]
    for i in range(len(centers)-1):
        for j in range(12):
            a=i*12+j; b=i*12+(j+1)%12
            faces.append((a,b,b+12,a+12))
    faces.extend([tuple(reversed(range(12))),tuple(range(len(verts)-12,len(verts)))])
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    bm.to_mesh(mesh);bm.free()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    for p in mesh.polygons:p.use_smooth=True
    return obj


def snout_mask(p):
    # Rounded vertical muzzle, widest at the nose and gently tapering below.
    width=.169 if p.z>1.40 else .153
    return (p.x/width)**2+((p.z-1.410)/.182)**2


def build():
    if (OUT/'mascot.blend').exists():
        raise RuntimeError('v005 exists; do not overwrite a reviewed model')
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    remove_matching(['head_sculpt','body_sculpt','unified_snout','eye_',
                     'eyebrow_','nostril_','philtrum','gentle_smile',
                     'hand_','finger_crease_','backpack_strap_','strap_stitch_'])
    fur=bpy.data.materials['coat_golden_apricot']
    palette=[]
    for name,color in [('coat_golden_apricot',(.64,.205,.035)),
                       ('coat_honey_light',(.69,.233,.044)),
                       ('coat_copper',(.60,.181,.029)),
                       ('coat_fine_highlights',(.73,.259,.052))]:
        palette.append(bpy.data.materials.get(name) or old.mat(name,color,.88))
    brown=bpy.data.materials['paws_cinnamon']
    dark=bpy.data.materials['mouth_and_nostrils']
    white=bpy.data.materials['eyes_ivory']
    black=bpy.data.materials['eyes_espresso']
    blue=bpy.data.materials['backpack_cerulean']
    # Rebuild as a single joined silhouette, with a color patch rather than
    # a separate brown muzzle attached to the head.
    head=oval('head_base',(0,-.02,1.435),(.477,.365,.36),fur,64,40)
    for v in head.data.vertices:
        t=v.co.z/.36
        v.co.x*=1-.21*t
    muzzle=oval('snout_volume',(0,-.338,1.410),(.168,.112,.177),fur,48,32)
    nose=oval('nose_volume',(0,-.361,1.502),(.15,.10,.085),fur,40,28)
    head=union('head_sculpt',[head,muzzle,nose],fur,.010)
    # Full lower abdomen and continuous thigh transitions, less rectangular.
    belly=oval('belly',(0,.012,.665),(.382,.329,.462),fur,48,32)
    for v in belly.data.vertices:
        t=v.co.z/.462
        v.co.x*=1-.24*t
        v.co.y-=.036*math.exp(-((t+.2)/.7)**2)
    parts=[belly,oval('neck',(0,.016,1.10),(.219,.217,.24),fur,32,24)]
    for s in (-1,1):
        parts.append(oval('thigh',(s*.22,.025,.257),(.16,.188,.218),fur,32,24))
    body=union('body_sculpt',parts,fur,.016)
    # Eyes are skin-following caps: total relief below 10 mm, not protruding balls.
    for s in (-1,1):
        cx=s*.238
        cap(f'eye_rim_{s}',head,cx,1.542,.053,.079,white,.0015,.002)
        cap(f'eye_{s}',head,cx+s*.002,1.542,.047,.072,black,.0035,.004)
        cap(f'eye_glint_{s}',head,cx-.013,1.570,.012,.016,white,.008,.001)
        cap(f'eye_glint_small_{s}',head,cx+.010,1.519,.004,.005,white,.008,.001)
        projected_line(f'eyebrow_{s}',head,[(s*.281,1.663),(s*.251,1.678),
                                          (s*.216,1.670)],brown,.007,.002)
        cap(f'nostril_{s}',head,s*.07,1.488,.024,.011,dark,.001,.001)
    projected_line('philtrum',head,[(0,1.477),(0,1.428),(0,1.365),(0,1.298),
                                   (0,1.269)],dark,.0025,.001)
    projected_line('gentle_smile',head,[(-.134,1.304),(-.104,1.276),(-.053,1.267),
                     (0,1.269),(.053,1.267),(.104,1.276),(.134,1.304)],dark,.0025,.001)
    # Fingers form a closed grip with a real thumb, instead of two lines on a disc.
    for s in (-1,1):
        palm=oval('palm',(s*.29,-.284,.887),(.080,.078,.092),brown,32,24)
        fingers=[]
        for z,x in [(.943,.272),(.902,.267),(.863,.271)]:
            finger=oval('curled_finger',(s*x,-.326,z),(.068,.056,.026),brown,28,18)
            finger.rotation_euler[1]=s*.10
            fingers.append(finger)
        thumb=oval('thumb',(s*.340,-.293,.942),(.036,.051,.054),brown,28,18)
        thumb.rotation_euler[1]=s*-.55
        union(f'hand_grip_{s}',[palm,*fingers,thumb],brown,.006)
        band(f'backpack_strap_{s}',[(s*.25,.29,1.131),(s*.298,.045,1.168),
             (s*.305,-.151,1.119),(s*.285,-.244,1.001),(s*.270,-.270,.875),
             (s*.293,-.223,.732),(s*.331,-.082,.665),(s*.287,.246,.660)],blue)
    def exclude_head(p):
        if p.y>-.19:return False
        if snout_mask(p)<1.09:return True
        return ((abs(p.x)-.238)/.060)**2+((p.z-1.542)/.087)**2<1.10
    old.coat(head,17500,palette,61,.030,exclude=exclude_head)
    old.coat(body,13500,palette,62,.032)
    # Color the continuous surface, including the embedded muzzle region.
    old.paint_coat([head,body,bpy.data.objects['head_sculpt_short_fur'],
                    bpy.data.objects['body_sculpt_short_fur']])
    colors=head.data.color_attributes['CoatColor']
    for loop in head.data.loops:
        p=head.matrix_world@head.data.vertices[loop.vertex_index].co
        if p.y<-.21:
            m=snout_mask(p)
            blend=max(0,min(1,(1.035-m)/.075))
            if blend:
                col=Vector(colors.data[loop.index].color[:3])
                target=Vector((.315,.116,.047))
                col=col.lerp(target,blend)
                colors.data[loop.index].color=(*col,1)
    # Pull piping onto the actual pack face; remove floating border strands.
    remove_matching(['backpack_panel_piping'])
    panel=bpy.data.objects['backpack_outer_face']
    border=[]
    for cx,cz,start in [(.19,1.075,0),(-.19,1.075,90),(-.19,.648,180),(.19,.648,270)]:
        for i in range(9):
            a=math.radians(start+i*90/8)
            x=cx+.036*math.cos(a);z=cz+.036*math.sin(a)
            p,n=surface(panel,x,z,back=True)
            border.append(p+n*.001)
    border.append(border[0])
    line('backpack_panel_piping',border,bpy.data.materials['padded_blue_edges'],.004)
    # Select only game objects; no camera/lights/studio geometry in the export.
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in meshes:o.data.calc_loop_triangles()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/'mascot.glb'),export_format='GLB',
                             use_selection=True,export_animations=False)
    report={'stage':'02a','version':'v005','status':'refinements_completed_visual_review',
      'rig':False,'animations':[],'collisions':False,'units':'meters',
      'source':'v004/mascot.blend','objects':len(meshes),
      'triangles':sum(len(o.data.loop_triangles) for o in meshes),
      'materials':len({m.name for o in meshes for m in o.data.materials}),
      'glb_bytes':(OUT/'mascot.glb').stat().st_size,
      'changes':['Fuller pear-shaped belly','Volumetric curled fingers and thumbs',
                 'Single head-and-snout mesh with painted muzzle',
                 'Surface-conforming eyes, nostrils, mouth and brows',
                 'Flat padded straps; attached backpack border'],
      'limitations':['Static sculpt, not rigged','Dense coat needs mobile optimization',
                     'Artistic interpretation, not a pixel-identical reconstruction']}
    (OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mascot.blend'))
    print(json.dumps(report))


if __name__=='__main__':
    if ACTION=='build':build()
    elif ACTION=='verify':old.base.verify()
    else:old.preview(ACTION)
