"""Create the current downloadable kit and copy icons without retaining duplicate archives."""
from pathlib import Path
from PIL import Image
from zipfile import ZipFile, ZIP_DEFLATED

root=Path(__file__).resolve().parents[1]
assets=root/'apps/web/public/brand/ichnara'
Image.open(assets/'icon-512.png').save(assets/'favicon.ico',sizes=[(16,16),(32,32),(48,48)])
(root/'apps/web/src/app/favicon.ico').write_bytes((assets/'favicon.ico').read_bytes())
(root/'apps/web/src/app/apple-icon.png').write_bytes((assets/'icon-180.png').read_bytes())
for archive in assets.glob('ichnara-brand-kit-*.zip'):
    archive.unlink()
with ZipFile(assets/'ichnara-brand-kit-v2.0.zip','w',ZIP_DEFLATED) as archive:
    for asset in sorted(assets.iterdir()):
        if asset.is_file() and asset.suffix!='.zip':
            archive.write(asset,asset.name)
assert ZipFile(assets/'ichnara-brand-kit-v2.0.zip').testzip() is None
print('Packaged v2.0; ZIP CRC passed, icon sizes16/32/48.')
