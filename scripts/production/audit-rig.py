"""Read-only inspection of source scenes before skinning. Run with Blender -b."""
import bpy, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
sources={'mascot':'mascot/v005/mascot.blend','child_explorer':'npc/v001/child_explorer/child_explorer.blend','child_wheelchair':'npc/v002/child_wheelchair/child_wheelchair.blend','educator':'npc/v002/educator/educator.blend','community_guide':'npc/v002/community_guide/community_guide.blend'}
for id,source in sources.items():
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/production'/source))
    objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
    print('AUDIT',id,len(objs))
    for o in objs:
        if id=='mascot' or not o.name.startswith(('puff','nape','fringe','hair','wavy')):
            pts=[o.matrix_world@Vector(p) for p in o.bound_box]
            lo=[round(min(p[i] for p in pts),3) for i in range(3)]
            hi=[round(max(p[i] for p in pts),3) for i in range(3)]
            print(json.dumps({'name':o.name,'verts':len(o.data.vertices),'min':lo,'max':hi}))
print('EXPORTER_API')
for p in bpy.ops.export_scene.gltf.get_rna_type().properties:
    if any(w in p.identifier for w in ('animation','skin','morph','bone','sampling','frame_range')):
        print(p.identifier,[(e.identifier) for e in p.enum_items] if p.type=='ENUM' else p.type)
