"""First reproducible deformation rigs and baked, in-place game clips.

Blender -b -t 2 --python-exit-code 1 --python rig-characters.py -- build ID
Actions: build, verify, render. Sources immutable. No GPU/UI required.
"""
import bpy, math, json, sys, re
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/production/animated/v001'
SOURCES={'mascot':'mascot/v005/mascot.blend','child_explorer':'npc/v001/child_explorer/child_explorer.blend','child_wheelchair':'npc/v002/child_wheelchair/child_wheelchair.blend','educator':'npc/v002/educator/educator.blend','community_guide':'npc/v002/community_guide/community_guide.blend'}
LABELS={'mascot':'Capibara','child_explorer':'Niño explorador','child_wheelchair':'Niña en silla de ruedas','educator':'Educadora','community_guide':'Guía comunitario'}
FPS=30

def smooth(x):
    x=max(0,min(1,x));return x*x*(3-2*x)

def envelope(t):
    return smooth(t/.22)*(1-smooth((t-.77)/.23))

def config(id):
    if id=='mascot':
        return dict(hip=(.218,.025,.34),knee=(.218,.012,.20),ankle=(.218,-.040,.080),shoulder=(.34,.008,1.105),elbow=(.425,-.08,.848),wrist=(.29,-.284,.887),pelvis=.39,chest=.97,head=1.15,height=1.87,stride=.038,lift=.026)
    if id=='child_explorer':
        return dict(hip=(.085,0,.421),knee=(.095,0,.276),ankle=(.106,-.007,.112),shoulder=(.147,0,.663),elbow=(.201,-.051,.555),wrist=(.120,-.158,.607),pelvis=.436,chest=.648,head=.743,height=1.214,stride=.055,lift=.030)
    if id=='child_wheelchair':
        return dict(hip=(.084,.012,.459),knee=(.084,-.220,.435),ankle=(.084,-.260,.195),shoulder=(.146,.01,.669),elbow=(.210,-.054,.567),wrist=(.213,-.184,.526),pelvis=.459,chest=.648,head=.741,height=1.264,stride=0,lift=0)
    man=id=='community_guide'
    return dict(hip=(.12,0,.773),knee=(.12,0,.464),ankle=(.12,0,.107),shoulder=(.195 if man else .182,0,1.128 if man else 1.136),elbow=(.262,-.055,.940) if man else (.238,-.04,.931),wrist=(.263,-.064,.717) if man else (.253,-.047,.718),other_wrist=(-.133,-.194,1.013) if man else (-.118,-.190,.970),pelvis=.790,chest=1.086,head=1.235,height=1.70 if man else 1.646,stride=.10,lift=.048)

def sidept(p,s):return Vector((p[0]*s,p[1],p[2]))

def create_rig(id,c):
    arm=bpy.data.armatures.new(id+'_skeleton');rig=bpy.data.objects.new('YAIS_'+id,arm)
    bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,head,tail,parent=None):
        b=arm.edit_bones.new(name);b.head=head;b.tail=tail
        if (b.tail-b.head).length<.005:b.tail=b.head+Vector((0,0,.05))
        if parent:b.parent=arm.edit_bones[parent]
        b.use_deform=True;return b
    p=c['pelvis'];ch=c['chest'];hd=c['head']
    bone('root',(0,0,0),(0,0,.09))
    bone('pelvis',(0,0,p),(0,0,p+.07),'root')
    bone('spine',(0,0,p+.07),(0,0,ch),'pelvis')
    bone('chest',(0,0,ch),(0,0,hd),'spine')
    bone('head',(0,0,hd),(0,0,c['height']-.12),'chest')
    for s,suffix in [(1,'L'),(-1,'R')]:
        hip,knee,ankle=[sidept(c[k],s) for k in ('hip','knee','ankle')]
        shoulder,elbow,wrist=[sidept(c[k],s) for k in ('shoulder','elbow','wrist')]
        if s==-1 and 'other_wrist' in c:wrist=Vector(c['other_wrist'])
        bone('thigh.'+suffix,hip,knee,'pelvis');bone('shin.'+suffix,knee,ankle,'thigh.'+suffix)
        bone('foot.'+suffix,ankle,ankle+Vector((0,-.12,0)),'shin.'+suffix)
        bone('upper_arm.'+suffix,shoulder,elbow,'chest')
        bone('forearm.'+suffix,elbow,wrist,'upper_arm.'+suffix)
        bone('hand.'+suffix,wrist,wrist+Vector((0,0,-.065)),'forearm.'+suffix)
    if id=='child_wheelchair':
        bone('chair',(0,.03,.272),(0,.03,.38),'root')
        for s,suffix in [(1,'L'),(-1,'R')]:
            bone('wheel.'+suffix,(s*.274,.03,.272),(s*.274+s*.08,.03,.272),'chair')
            bone('caster.'+suffix,(s*.214,-.299,.071),(s*.214+s*.06,-.299,.071),'chair')
    bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True;arm.display_type='STICK'
    for pbone in rig.pose.bones:pbone.rotation_mode='QUATERNION'
    return rig

def normalize(weights):
    weights={k:v for k,v in weights.items() if v>1e-6};total=sum(weights.values())
    assert total>0
    return {k:v/total for k,v in weights.items()}

def mix(a,b,t):return normalize({a:1-t,b:t})

def weights_for(name,p,c,id):
    x,y,z=p;s=1 if x>=0 else -1;side='L' if s==1 else 'R'
    # Explicit chair components are independent of the seated body.
    if id=='child_wheelchair':
        m=re.match(r'wheel_(-?1)_',name)
        if m:return {'wheel.'+('L' if m[1]=='1' else 'R'):1}
        m=re.match(r'caster_(-?1)_(tire|hub)',name)
        if m:return {'caster.'+('L' if m[1]=='1' else 'R'):1}
        if name.startswith(('chair_','frame_','push_handle_','armrest_','seat_crossbrace','caster_')):return {'chair':1}
    if name.startswith(('head','ear','eye','brow','nostril','philtrum','gentle_smile','smile','nose','hair','fringe','puff','nape','yellow_headband','wavy','swept','gold_earring','beard','moustache','guide_hair','cap_','crown_tuft')):
        return {'head':1}
    if name=='neck':return mix('chest','head',smooth((z-(c['head']-.055))/.11))
    if name.startswith(('foot_','toe_crease','sneaker_','purple_sneaker','boot_')):return {'foot.'+side:1}
    if name.startswith(('hand_','hand_grip')):return {'hand.'+side:1}
    if name.startswith(('backpack','zipper_','lanyard','badge','blue_collar','cream_collar','tshirt_collar','blue_collar','satchel')):
        return {'chest':1}
    if name.startswith('book_'):return {'hand.R':1}
    if name.startswith(('arm_sculpt','upper_arm','forearm','elbow','sleeve','tshirt_sleeve','jacket_sleeve','jacket_cuff','shirt_sleeve','rolled_sleeve')):
        shoulder,elbow,wrist=[sidept(c[k],s) for k in ('shoulder','elbow','wrist')]
        if s==-1 and 'other_wrist' in c:wrist=Vector(c['other_wrist'])
        if name.startswith('elbow'):return {'forearm.'+side:1}
        if name.startswith('forearm'):
            t=smooth(((p-elbow).dot((wrist-elbow).normalized())-(wrist-elbow).length+.025)/.05)
            return mix('forearm.'+side,'hand.'+side,t)
        if name.startswith('arm_sculpt'):
            t=smooth((elbow.z+.07-z)/.15)
            return mix('upper_arm.'+side,'forearm.'+side,t)
        along=(p-shoulder).dot((elbow-shoulder).normalized())
        anchor=1-smooth((along+.012)/.065)
        if anchor>.001:return mix('upper_arm.'+side,'chest',anchor)
        t=smooth((along-(elbow-shoulder).length+.025)/.05)
        return mix('upper_arm.'+side,'forearm.'+side,t)
    if name.startswith(('shorts_leg','cargo_pocket','pocket_flap','calf','sock','trouser_','rolled_hem','ankle','jeans_thigh','jeans_knee','jeans_shin','jeans_rolled_cuff')) and name not in ('trouser_waist',):
        if name.startswith(('cargo_pocket','pocket_flap')):return {'thigh.'+side:1}
        if id=='child_wheelchair':
            if name.startswith('jeans_thigh'):return {'thigh.'+side:1}
            if name.startswith(('jeans_knee','jeans_shin','jeans_rolled_cuff')):return {'shin.'+side:1}
        knee=c['knee'][2];ankle=c['ankle'][2];hip=c['hip'][2]
        if z>hip-.05:return mix('thigh.'+side,'pelvis',smooth((z-hip+.05)/.06))
        if z>knee-.055:return mix('thigh.'+side,'shin.'+side,1-smooth((z-knee+.055)/.11))
        return mix('shin.'+side,'foot.'+side,1-smooth((z-ankle+.02)/.06))
    if name.startswith('body_sculpt') and z<.43:
        thigh=smooth((.43-z)/.20)*smooth((abs(x)-.025)/.13)
        knee=1-smooth((z-.12)/.17)
        return normalize({'pelvis':1-thigh,'thigh.'+side:thigh*(1-knee),'shin.'+side:thigh*knee})
    if name.startswith(('shorts_waist','jeans_waist','trouser_waist','belt','buckle','waist_tie','tie_')):return {'pelvis':1}
    # Continuous torso weighting also keeps shirt decoration on the cloth.
    pz=c['pelvis']+.045;cz=c['chest'];mid=(pz+cz)/2
    if z<=mid:return mix('pelvis','spine',smooth((z-pz)/max(.04,mid-pz)))
    return mix('spine','chest',smooth((z-mid)/max(.04,cz-mid)))

def bind_meshes(id,c,rig,meshes):
    source_names=[o.name for o in meshes];bpy.ops.object.select_all(action='DESELECT')
    max_weights=0
    for o in meshes:
        # Bake object-space transforms before skinning; preserve source vertices/colors.
        o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4)
        groups={n:o.vertex_groups.new(name=n) for n in rig.data.bones.keys()}
        for v in o.data.vertices:
            w=weights_for(o.name,v.co,c,id);max_weights=max(max_weights,len(w))
            for bone,value in w.items():groups[bone].add([v.index],value,'REPLACE')
        o.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();body=bpy.context.object;body.name=id+'_skinned'
    mod=body.modifiers.new('YAIS_deformation','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=False
    body.parent=rig;body.matrix_parent_inverse=Matrix.Identity(4)
    body['source_parts']=json.dumps(source_names)
    return body,max_weights

def clear_pose(rig):
    for p in rig.pose.bones:p.location=(0,0,0);p.rotation_quaternion=(1,0,0,0);p.scale=(1,1,1)

def rotate(rig,name,axis,angle):
    p=rig.pose.bones[name];basis=p.bone.matrix_local.to_quaternion()
    p.rotation_quaternion=basis.inverted() @ Quaternion(axis,angle) @ basis

def move(rig,name,delta):
    p=rig.pose.bones[name];p.location=p.bone.matrix_local.to_3x3().inverted()@Vector(delta)

def orient_to(rig,name,head,target,world_rotation=None):
    p=rig.pose.bones[name];b=p.bone;rest=(b.tail_local-b.head_local).normalized()
    q=world_rotation if world_rotation is not None else rest.rotation_difference((Vector(target)-Vector(head)).normalized())
    p.matrix=Matrix.Translation(Vector(head)) @ q.to_matrix().to_4x4() @ b.matrix_local.to_quaternion().to_matrix().to_4x4()
    bpy.context.view_layer.update()

def two_bone(rig,a,b,end,target,bend):
    bpy.context.view_layer.update();hip=rig.pose.bones[a].head.copy();goal=Vector(target)
    l1=rig.data.bones[a].length;l2=rig.data.bones[b].length;v=goal-hip
    dist=max(abs(l1-l2)+.0001,min(v.length,l1+l2-.0001));d=v.normalized();goal=hip+d*dist
    normal=Vector(bend);normal-=d*normal.dot(d)
    if normal.length<.001:normal=Vector((0,-1,0));normal-=d*normal.dot(d)
    normal.normalize();x=(l1*l1-l2*l2+dist*dist)/(2*dist);h=math.sqrt(max(0,l1*l1-x*x))
    knee=hip+d*x+normal*h
    orient_to(rig,a,hip,knee);orient_to(rig,b,knee,goal)
    orient_to(rig,end,goal,goal+Vector((0,-1,0)),Quaternion())
    return goal

def animate_frame(rig,id,c,clip,t):
    clear_pose(rig);wave=math.tau*t
    if clip=='Idle':
        rig.pose.bones['chest'].scale=(1+.004*math.sin(wave),1+.006*math.sin(wave),1+.006*math.sin(wave))
        rotate(rig,'head',(0,0,1),.022*math.sin(wave))
    elif clip=='Listen':
        e=envelope(t);rotate(rig,'head',(0,1,0),.095*e)
        q=rig.pose.bones['head'].rotation_quaternion.copy();basis=rig.data.bones['head'].matrix_local.to_quaternion()
        rig.pose.bones['head'].rotation_quaternion=q @ basis.inverted() @ Quaternion((1,0,0),.105*e*math.sin(4*math.pi*t)) @ basis
        rotate(rig,'chest',(1,0,0),.025*e)
    elif clip=='Walk':
        # Small stride, exact ankle placement; scene code supplies forward travel.
        move(rig,'pelvis',(0,0,-.008+.002*math.cos(2*wave)))
        rotate(rig,'head',(0,0,1),.012*math.sin(wave))
        bpy.context.view_layer.update()
        for s,suffix in [(1,'L'),(-1,'R')]:
            phase=(t+(0 if s==1 else .5))%1;stance=.60
            if phase<stance:dy=c['stride']*(-1+2*phase/stance);lift=0
            else:
                u=(phase-stance)/(1-stance);dy=c['stride']*math.cos(math.pi*u);lift=c['lift']*math.sin(math.pi*u)
            ankle=sidept(c['ankle'],s);ankle.y+=dy;ankle.z+=lift
            two_bone(rig,'thigh.'+suffix,'shin.'+suffix,'foot.'+suffix,ankle,(0,-1,0))
        if id in ('educator','community_guide'):rotate(rig,'upper_arm.L',(1,0,0),.10*math.sin(wave))
    elif clip in ('Wave','TalkGesture'):
        e=envelope(t);rest=rig.data.bones['hand.L'].head_local.copy();sh=Vector(c['shoulder'])
        if clip=='Wave':
            reach=.16 if id=='mascot' else (.28 if id in ('educator','community_guide') else .16)
            target=sh+Vector((.13 if id.startswith('child') else .18,-.10,reach))
            target.x+=.022*math.sin(8*math.pi*t)*e
            headtilt=-.055*e
        else:
            target=Vector((sh.x+.08,-.235,c['chest']-.05+.022*math.sin(6*math.pi*t)))
            headtilt=.033*e*math.sin(4*math.pi*t)
        bpy.context.view_layer.update()
        # IK only during gesture: blend at rest keeps the source pose exact.
        if e>1e-7:
            two_bone(rig,'upper_arm.L','forearm.L','hand.L',rest.lerp(target,e),(1,0,-.12))
            hand=rig.pose.bones['hand.L'].head.copy()
            angle=(2.65 if clip=='Wave' and id in ('educator','community_guide','child_wheelchair') else .65)*e
            angle+=.12*e*math.sin(8*math.pi*t) if clip=='Wave' else 0
            orient_to(rig,'hand.L',hand,hand+Vector((0,0,1)),Quaternion((0,1,0),angle))
        rotate(rig,'head',(0,1,0),headtilt)
    elif clip=='Roll':
        # Six push/recovery cycles per full rear-wheel revolution; all tracks loop.
        for suffix in ('L','R'):
            rotate(rig,'wheel.'+suffix,(1,0,0),math.tau*t)
            rotate(rig,'caster.'+suffix,(1,0,0),4*math.tau*t)
        phase=(t*6)%1
        for s,suffix in [(1,'L'),(-1,'R')]:
            if phase<.65:
                theta=-.34+phase*math.tau/6
                target=Vector((s*.298,.03-.230*math.sin(theta),.272+.230*math.cos(theta)))
            else:
                u=(phase-.65)/.35;theta=.34-.68*smooth(u)
                target=Vector((s*(.298-.035*math.sin(math.pi*u)),.03-.230*math.sin(theta),.272+.230*math.cos(theta)+.034*math.sin(math.pi*u)))
            two_bone(rig,'upper_arm.'+suffix,'forearm.'+suffix,'hand.'+suffix,target,(s,0,0))
    bpy.context.view_layer.update()

def build(id):
    dest=OUT/id;dest.mkdir(parents=True,exist_ok=True)
    if (dest/f'{id}.blend').exists() or (dest/f'{id}.glb').exists():raise RuntimeError('Output already exists. Preserve version and create a new one for revisions.')
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/production'/SOURCES[id]));c=config(id)
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
    meshes=list(bpy.context.scene.objects);source_count=len(meshes)
    bpy.ops.object.select_all(action='DESELECT');rig=create_rig(id,c);body,max_weights=bind_meshes(id,c,rig,meshes)
    scene=bpy.context.scene;scene.render.fps=FPS;scene.unit_settings.system='METRIC'
    clips={'Idle':3.2,('Roll' if id=='child_wheelchair' else 'Walk'):(6 if id=='child_wheelchair' else 1.6),'Wave':2.4,'Listen':3.2,'TalkGesture':2.8}
    clip_meta=[]
    for name,duration in clips.items():
        frames=round(duration*FPS);action=bpy.data.actions.new(name);action.use_fake_user=True
        rig.animation_data_create();rig.animation_data.action=action
        for f in range(frames+1):
            scene.frame_set(f+1);animate_frame(rig,id,c,name,f/frames)
            for p in rig.pose.bones:
                p.keyframe_insert(data_path='location',frame=f+1,group=p.name)
                p.keyframe_insert(data_path='rotation_quaternion',frame=f+1,group=p.name)
                p.keyframe_insert(data_path='scale',frame=f+1,group=p.name)
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for curve in bag.fcurves:
                        for key in curve.keyframe_points:key.interpolation='LINEAR'
        action['loop']=True;action['in_place']=True
        track=rig.animation_data.nla_tracks.new();track.name=name
        strip=track.strips.new(name,1,action);strip.name=name;track.mute=True
        clip_meta.append({'name':name,'seconds':duration,'frames':frames+1,'fps':FPS,'loop':True,'in_place':True})
    rig.animation_data.action=None;clear_pose(rig);scene.frame_start=1;scene.frame_end=97;scene.frame_set(1)
    body.data.calc_loop_triangles()
    report={'id':id,'label':LABELS[id],'version':'v001','source':SOURCES[id],'stage':'first_deformation_rig','rig':True,'bones':len(rig.data.bones),'max_influences':max_weights,'source_meshes':source_count,'export_meshes':1,'triangles':len(body.data.loop_triangles),'clips':clip_meta,
            'in_place':True,'root_motion':False,'blender_axes':'Z-up / front -Y','gltf_axes':'Y-up / front +Z','limitations':['First deformation pass, not final retopology','No individual fingers or facial/lip-sync rig','Original dense fur/geometry retained; no mobile FPS claim','Runtime collision and navigation not included']}
    if id=='child_wheelchair':report['locomotion']={'clip':'Roll','meters_per_cycle':math.tau*.271,'duration_seconds':6,'rear_effective_radius_m':.271,'caster_effective_radius_m':.06775,'pushes_per_cycle':6}
    else:report['locomotion']={'clip':'Walk','meters_per_cycle':2*c['stride']/.60,'duration_seconds':1.6}
    bpy.ops.wm.save_as_mainfile(filepath=str(dest/f'{id}.blend'))
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(dest/f'{id}.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_def_bones=True,export_leaf_bone=False,export_optimize_animation_size=True)
    report['glb_bytes']=(dest/f'{id}.glb').stat().st_size
    (dest/'asset.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
    print('RIG_SAVED',json.dumps(report,ensure_ascii=False))

def imported(id):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(OUT/id/f'{id}.glb'))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    return rig

def activate(rig,name):
    rig.animation_data.action=None
    found=False
    for tr in rig.animation_data.nla_tracks:
        match=tr.name==name or any(s.action and s.action.name.split('.')[0]==name for s in tr.strips)
        tr.mute=not match;found|=match
    if not found:
        action=bpy.data.actions.get(name)
        if not action:raise RuntimeError('Missing clip '+name)
        rig.animation_data.action=action

def snapshot(rig):
    bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();data={}
    for o in bpy.context.scene.objects:
        # The glTF importer creates a hidden unit-size bone display mesh.
        # Only exported, skinned geometry belongs in deformation measurements.
        if o.type!='MESH' or not any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers):continue
        e=o.evaluated_get(dg);m=e.to_mesh()
        data[o.name]=[e.matrix_world@v.co for v in m.vertices];e.to_mesh_clear()
    assert data,'No skinned character geometry found'
    return data

def verify(id):
    rig=imported(id);r=json.loads((OUT/id/'asset.json').read_text(encoding='utf-8'));scene=bpy.context.scene;scene.render.fps=FPS
    records=[]
    for c in r['clips']:
        activate(rig,c['name']);samples=[];bounds=[]
        for f in (1,1+round((c['frames']-1)*.25),1+round((c['frames']-1)*.5),1+round((c['frames']-1)*.75),c['frames']):
            scene.frame_set(f);ss=snapshot(rig);samples.append(ss)
            allp=[p for vs in ss.values() for p in vs]
            assert all(math.isfinite(v) for p in allp for v in p)
            lo=[min(p[i] for p in allp) for i in range(3)];hi=[max(p[i] for p in allp) for i in range(3)]
            assert max(hi[i]-lo[i] for i in range(3))<3.5,'Exploding geometry'
            bounds.append({'min':lo,'max':hi})
        delta=max((a-b).length for key in samples[0] for a,b in zip(samples[0][key],samples[2][key]))
        # Sine cycles may cross zero at half time: include quarter-time sample.
        delta=max(delta,max((a-b).length for key in samples[0] for a,b in zip(samples[0][key],samples[1][key])))
        seam=max((a-b).length for key in samples[0] for a,b in zip(samples[0][key],samples[-1][key]))
        assert delta>.0001,(id,c['name'],'No visible deformation')
        assert seam<.003,(id,c['name'],'Loop seam',seam)
        assert min(b['min'][2] for b in bounds)>-.04,(id,c['name'],'Floor penetration',bounds)
        records.append({'clip':c['name'],'motion_m':delta,'loop_seam_m':seam,'bounds':bounds})
    result={'glb_reimport':'passed','skin':True,'bones':len(rig.data.bones),'clips':records,'checks':'finite deformed vertices, motion, loop continuity, floor clearance at five samples per clip'}
    (OUT/id/'verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print('RIG_VERIFIED',id)

def render(id,clip,phase):
    import importlib.util
    spec=importlib.util.spec_from_file_location('npc',Path(__file__).with_name('npc-kit.py'));npc=importlib.util.module_from_spec(spec);spec.loader.exec_module(npc)
    rig=imported(id);bpy.context.scene.render.fps=FPS;activate(rig,clip)
    report=json.loads((OUT/id/'asset.json').read_text(encoding='utf-8'));c=next(x for x in report['clips'] if x['name']==clip)
    bpy.context.scene.frame_set(1+round((c['frames']-1)*phase));bpy.context.view_layer.update()
    npc.studio(config(id)['height'],'three-quarter',OUT/id/f'{clip}-{phase:.2f}.png',560,672)

if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:]
    if args[0]=='build':build(args[1])
    elif args[0]=='verify':verify(args[1])
    elif args[0]=='render':render(args[1],args[2],float(args[3]))
