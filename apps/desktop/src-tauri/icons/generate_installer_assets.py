import os
from PIL import Image, ImageDraw, ImageFont, ImageChops
import numpy as np

def draw_linear_gradient(image, start_color, end_color):
    """Draws a vertical linear gradient on the image."""
    draw = ImageDraw.Draw(image)
    width, height = image.size
    for y in range(height):
        t = y / (height - 1)
        r = int(start_color[0] + (end_color[0] - start_color[0]) * t)
        g = int(start_color[1] + (end_color[1] - start_color[1]) * t)
        b = int(start_color[2] + (end_color[2] - start_color[2]) * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

def draw_radial_glow(image, center_x, center_y, max_radius, glow_color, intensity=0.4):
    """Draws a smooth radial glow centered at (center_x, center_y) using numpy."""
    width, height = image.size
    
    # 计算需要处理的子区域边界
    min_x = max(0, int(center_x - max_radius))
    max_x = min(width, int(center_x + max_radius))
    min_y = max(0, int(center_y - max_radius))
    max_y = min(height, int(center_y + max_radius))
    
    if min_x >= max_x or min_y >= max_y:
        return
        
    # 转换图像为 numpy 数组进行快速向量化计算
    arr = np.array(image)
    sub_arr = arr[min_y:max_y, min_x:max_x].astype(np.float32)
    
    # 构造局部坐标网格
    ys = np.arange(min_y, max_y).reshape(-1, 1)
    xs = np.arange(min_x, max_x).reshape(1, -1)
    
    # 计算距离矩阵
    dist = np.sqrt((xs - center_x) ** 2 + (ys - center_y) ** 2)
    
    # 计算发光权重 t (使用 Smoothstep 差值)
    mask = dist < max_radius
    t = np.zeros_like(dist)
    t[mask] = 1.0 - (dist[mask] / max_radius)
    t = t * t * (3.0 - 2.0 * t)
    
    # 扩展维度以便在 RGB 通道广播
    t = t[:, :, np.newaxis]
    glow_arr = np.array(glow_color[:3], dtype=np.float32)
    
    # 进行颜色混合
    curr_rgb = sub_arr[:, :, :3]
    new_rgb = curr_rgb + (glow_arr - curr_rgb) * t * intensity
    
    # 裁剪范围并转换回 uint8 写入主数组
    sub_arr[:, :, :3] = np.clip(new_rgb, 0, 255)
    arr[min_y:max_y, min_x:max_x] = sub_arr.astype(np.uint8)
    
    # 将更新后的数组贴回原 PIL 图像
    image.paste(Image.fromarray(arr), (0, 0))

def set_image_opacity(image, opacity):
    """Returns a copy of the image with modified opacity."""
    r, g, b, a = image.split()
    a = a.point(lambda p: int(p * opacity))
    return Image.merge('RGBA', (r, g, b, a))

def draw_arrow(draw, start_x, start_y, end_x, end_y, line_width=8, head_size=24, color=(255, 255, 255, 180)):
    """Draws a sleek horizontal arrow pointing from left to right."""
    # Main horizontal shaft
    draw.line([(start_x, start_y), (end_x - head_size + 4, end_y)], fill=color, width=line_width)
    
    # Arrowhead triangle
    p1 = (end_x, end_y)
    p2 = (end_x - head_size, end_y - int(head_size * 0.5))
    p3 = (end_x - head_size, end_y + int(head_size * 0.5))
    draw.polygon([p1, p2, p3], fill=color)

def main():
    icons_dir = os.path.dirname(os.path.abspath(__file__))
    logo_path = os.path.join(icons_dir, "vela_logo.png")
    
    if not os.path.exists(logo_path):
        print(f"Error: Logo file not found at {logo_path}")
        return
        
    logo = Image.open(logo_path).convert("RGBA")
    
    # --- Generate background.png (1320x800) ---
    print("Generating background.png...")
    bg = Image.new("RGBA", (1320, 800))
    
    # 1. Base gradient: Dark slate purple to dark grey
    draw_linear_gradient(bg, (19, 15, 34), (10, 8, 18))
    
    # 2. Add brand color aura glow (Vela brand purple)
    draw_radial_glow(bg, 660, 340, 500, (175, 82, 222), intensity=0.35)
    
    # 3. Draw UI elements (drop zones)
    # macOS DMG app icon position: (360, 340) center, size 180x180
    # macOS DMG Applications folder position: (960, 340) center, size 180x180
    draw = ImageDraw.Draw(bg)
    
    # Drop zone 1 (Vela App)
    draw.rounded_rectangle(
        [(360 - 90, 340 - 90), (360 + 90, 340 + 90)],
        radius=24,
        fill=(255, 255, 255, 8),
        outline=(255, 255, 255, 35),
        width=2
    )
    
    # Drop zone 2 (Applications Folder)
    draw.rounded_rectangle(
        [(960 - 90, 340 - 90), (960 + 90, 340 + 90)],
        radius=24,
        fill=(255, 255, 255, 8),
        outline=(255, 255, 255, 35),
        width=2
    )
    
    # 4. Draw modern connecting arrow
    draw_arrow(draw, 490, 340, 830, 340, line_width=6, head_size=20, color=(255, 255, 255, 140))
    
    # 5. Place watermark logo at the top
    watermark_size = 100
    watermark_logo = logo.resize((watermark_size, watermark_size), Image.Resampling.LANCZOS)
    watermark_logo = set_image_opacity(watermark_logo, 0.25)
    bg.paste(watermark_logo, (660 - watermark_size // 2, 70), watermark_logo)
    
    # 6. Draw instruction text at the bottom
    font_path = "/System/Library/Fonts/Helvetica.ttc"
    try:
        font_large = ImageFont.truetype(font_path, 30)
    except IOError:
        font_large = ImageFont.load_default()
        
    text = "Drag Vela to Applications to install"
    text_bbox = draw.textbbox((0, 0), text, font=font_large)
    text_w = text_bbox[2] - text_bbox[0]
    draw.text((660 - text_w // 2, 570), text, fill=(255, 255, 255, 200), font=font_large)
    
    bg.save(os.path.join(icons_dir, "background.png"), "PNG")
    print("background.png saved!")
    
    # --- Generate Sidebar.bmp (820x1570) ---
    print("Generating Sidebar.bmp...")
    sidebar = Image.new("RGBA", (820, 1570))
    
    # 1. Base gradient
    draw_linear_gradient(sidebar, (22, 19, 38), (10, 8, 18))
    
    # 2. Add brand color aura glow
    draw_radial_glow(sidebar, 410, 480, 600, (175, 82, 222), intensity=0.3)
    
    # 3. Paste Vela logo
    logo_size = 320
    sidebar_logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    sidebar.paste(sidebar_logo, (410 - logo_size // 2, 320), sidebar_logo)
    
    # 4. Draw texts
    draw_sidebar = ImageDraw.Draw(sidebar)
    try:
        font_title = ImageFont.truetype(font_path, 72)
        font_subtitle = ImageFont.truetype(font_path, 28)
    except IOError:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        
    title_text = "Vela"
    title_bbox = draw_sidebar.textbbox((0, 0), title_text, font=font_title)
    title_w = title_bbox[2] - title_bbox[0]
    draw_sidebar.text((410 - title_w // 2, 700), title_text, fill=(255, 255, 255, 255), font=font_title)
    
    subtitle_text = "Secure Proxy & VPN Client"
    sub_bbox = draw_sidebar.textbbox((0, 0), subtitle_text, font=font_subtitle)
    sub_w = sub_bbox[2] - sub_bbox[0]
    draw_sidebar.text((410 - sub_w // 2, 800), subtitle_text, fill=(161, 161, 170, 255), font=font_subtitle)
    
    # NSIS sidebar BMP needs to be 24-bit RGB (no alpha channel)
    sidebar_rgb = sidebar.convert("RGB")
    sidebar_rgb.save(os.path.join(icons_dir, "Sidebar.bmp"), "BMP")
    print("Sidebar.bmp saved!")

if __name__ == "__main__":
    main()
