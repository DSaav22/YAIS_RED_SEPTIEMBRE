"""Genera un blockout 3D reproducible sin abrir la interfaz de Blender."""

from pathlib import Path
import math
import sys

import bpy


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "assets" / "generated"
BLEND_PATH = OUTPUT_DIR / "isla-acuerdos-blockout.blend"
GLB_PATH = OUTPUT_DIR / "isla-acuerdos-blockout.glb"


def material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Base Color"].default_value = color
        principled.inputs["Roughness"].default_value = 0.82
    return mat


GRASS = material("MAT_Grass", (0.20, 0.62, 0.25, 1.0))
ROCK = material("MAT_Rock", (0.24, 0.30, 0.32, 1.0))
WOOD = material("MAT_Wood", (0.55, 0.25, 0.08, 1.0))
ROOF = material("MAT_Roof", (0.82, 0.20, 0.10, 1.0))
WALL = material("MAT_Wall", (0.93, 0.78, 0.53, 1.0))
LEAF = material("MAT_Leaf", (0.10, 0.48, 0.20, 1.0))
WATER = material("MAT_Water", (0.18, 0.67, 0.82, 1.0))


def apply_material(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    obj.data.materials.append(mat)


def cube(name: str, location: tuple[float, float, float], scale: tuple[float, float, float], mat: bpy.types.Material) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    return obj


def cylinder(name: str, location: tuple[float, float, float], radius: float, depth: float, mat: bpy.types.Material, vertices: int = 8) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    apply_material(obj, mat)
    return obj


def cone(name: str, location: tuple[float, float, float], radius: float, depth: float, mat: bpy.types.Material, vertices: int = 8) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=0.0, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    apply_material(obj, mat)
    return obj


def build_scene() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    # Los materiales se crean justo antes de construir la escena; no purgarlos aquí.
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)

    # Isla flotante modular: roca, suelo y una plataforma de agua de referencia.
    cylinder("Island_Rock", (0, 0, -0.65), 7.4, 1.8, ROCK, 10)
    cylinder("Island_Grass", (0, 0, 0.28), 6.9, 0.35, GRASS, 10)
    cylinder("Water_Plate", (0, 0, -1.8), 11.0, 0.15, WATER, 32)

    # Puente de entrada y cartel de decisión.
    for idx in range(7):
        cube(f"Bridge_Plank_{idx:02d}", (-9.0 + idx * 0.55, 0, 0.2), (0.28, 1.25, 0.10), WOOD)
    for y in (-1.05, 1.05):
        cube(f"Bridge_Rail_{y:+.0f}", (-7.3, y, 1.05), (1.9, 0.08, 0.08), WOOD)
    cube("Sign_Post", (-4.8, 0, 1.25), (0.10, 0.10, 1.0), WOOD)
    cube("Sign_Board", (-4.8, 0, 2.25), (1.1, 0.10, 0.45), WALL)

    # Dos casitas de demostración.
    for idx, x in enumerate((-2.0, 2.0), start=1):
        cube(f"House_{idx}_Body", (x, 2.1, 1.2), (1.25, 1.05, 0.9), WALL)
        roof = cone(f"House_{idx}_Roof", (x, 2.1, 2.65), 1.65, 1.1, ROOF, 4)
        roof.rotation_euler[2] = math.radians(45)
        cube(f"House_{idx}_Door", (x, 1.02, 1.0), (0.25, 0.06, 0.45), WOOD)

    # Árboles low-poly y una zona de conversación.
    for idx, (x, y) in enumerate(((-4.5, -2.0), (4.2, -2.4), (4.8, 3.3)), start=1):
        cylinder(f"Tree_{idx}_Trunk", (x, y, 1.15), 0.24, 1.75, WOOD, 6)
        cone(f"Tree_{idx}_Crown", (x, y, 2.55), 1.15, 2.2, LEAF, 8)
    for idx, (x, y) in enumerate(((-0.8, -1.5), (0.8, -1.5), (0, -2.6)), start=1):
        cylinder(f"Meeting_Seat_{idx}", (x, y, 0.62), 0.35, 0.25, WOOD, 8)

    # Cámara y luz de trabajo para inspeccionar el GLB exportado.
    bpy.ops.object.camera_add(location=(15, -18, 15))
    camera = bpy.context.object
    camera.name = "Camera_Blockout"
    camera.rotation_euler = (math.radians(58), 0, math.radians(38))
    bpy.context.scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(2, -4, 16))
    light = bpy.context.object
    light.name = "Sun_Worklight"
    light.data.energy = 1800
    light.data.shape = "DISK"
    light.data.size = 12

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    scene.render.resolution_percentage = 50
    scene.world.color = (0.55, 0.75, 0.95)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(filepath=str(GLB_PATH), export_format="GLB", export_apply=True)
    print(f"HEADLESS_BLOCKOUT_BLEND={BLEND_PATH}")
    print(f"HEADLESS_BLOCKOUT_GLB={GLB_PATH}")


if __name__ == "__main__":
    build_scene()
