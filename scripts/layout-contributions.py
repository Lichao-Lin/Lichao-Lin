"""Apply the profile's layout to the pinned upstream 3D SVG renderer."""
from pathlib import Path
import xml.etree.ElementTree as ET

NS = '{http://www.w3.org/2000/svg}'
ET.register_namespace('', NS[1:-1])
ROOT = Path(__file__).resolve().parents[1]

for name in ('profile-blue.svg', 'profile-blue-dark.svg'):
    path = ROOT / 'profile-3d-contrib' / name
    tree = ET.parse(path)
    root = tree.getroot()
    if root.get('data-profile-layout') == 'radar-bottom-left-v1':
        continue
    groups = root.findall(f'{NS}g')
    radars = [g for g in groups if len(g.findall(f"{NS}g[@class='axis']")) == 5]
    # This position is part of the pinned upstream renderer's full-profile layout.
    pies = [g for g in groups if g.get('transform') == 'translate(40, 520)']
    if len(radars) != 1 or len(pies) != 1:
        raise ValueError(f'{name}: upstream SVG layout changed; refusing a partial rewrite')
    root.remove(pies[0])
    radars[0].set('transform', 'translate(220, 625) scale(0.9)')
    root.set('data-profile-layout', 'radar-bottom-left-v1')
    tree.write(path, encoding='unicode')
    print(f'Updated {name}: removed language donut; placed radar at bottom left')
